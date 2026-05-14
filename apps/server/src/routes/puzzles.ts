import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { puzzles, progress } from '../db/schema.js';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { createPuzzleSchema, updatePuzzleSchema, puzzleQuerySchema } from '@puzzle-app/shared';
import { minioClient, BUCKET_IMAGES, getImageUrl } from '../services/minio.js';
import { enqueuePuzzleGeneration } from '../services/queue.js';
import { v4 as uuid } from 'uuid';

export const puzzleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const query = puzzleQuerySchema.parse(request.query);
    const { page, limit, search, mine } = query;
    const offset = (page - 1) * limit;

    let conditions;

    if (mine && request.user) {
      conditions = and(
        eq(puzzles.userId, request.user.userId),
        search ? ilike(puzzles.title, `%${search}%`) : undefined,
      );
    } else {
      conditions = and(
        eq(puzzles.isPublic, true),
        search ? ilike(puzzles.title, `%${search}%`) : undefined,
      );
    }

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: puzzles.id,
          title: puzzles.title,
          gridCols: puzzles.gridCols,
          gridRows: puzzles.gridRows,
          status: puzzles.status,
          isPublic: puzzles.isPublic,
          completionsCount: puzzles.completionsCount,
          createdAt: puzzles.createdAt,
          imageKey: puzzles.imageKey,
        })
        .from(puzzles)
        .where(conditions ?? undefined)
        .orderBy(desc(puzzles.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(puzzles)
        .where(conditions ?? undefined),
    ]);

    const itemsWithUrl = items.map((item) => ({
      ...item,
      imageUrl: getImageUrl(item.imageKey),
    }));

    return {
      items: itemsWithUrl,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [puzzle] = await db.select().from(puzzles).where(eq(puzzles.id, id)).limit(1);

    if (!puzzle) {
      return reply.status(404).send({ message: 'Puzzle not found' });
    }

    if (!puzzle.isPublic && puzzle.userId !== request.user?.userId) {
      return reply.status(403).send({ message: 'Access denied' });
    }

    return {
      ...puzzle,
      imageUrl: getImageUrl(puzzle.imageKey),
    };
  });

  app.post('/', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ message: 'No file uploaded' });
    }

    const fields = data.fields;
    const title = (fields.title as { value: string })?.value ?? 'Untitled';
    const gridCols = parseInt((fields.gridCols as { value: string })?.value ?? '3', 10);
    const gridRows = parseInt((fields.gridRows as { value: string })?.value ?? '3', 10);

    const parsed = createPuzzleSchema.safeParse({ title, gridCols, gridRows });
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.issues });
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ message: 'Only JPG and PNG files are allowed' });
    }

    const imageKey = `${request.user.userId}/${uuid()}/${data.filename}`;
    const buffer = await data.toBuffer();

    await minioClient.putObject(BUCKET_IMAGES, imageKey, buffer, buffer.length, {
      'Content-Type': data.mimetype,
    });

    const [puzzle] = await db
      .insert(puzzles)
      .values({
        userId: request.user.userId,
        title: parsed.data.title,
        gridCols: parsed.data.gridCols,
        gridRows: parsed.data.gridRows,
        imageKey,
        status: 'pending',
      })
      .returning();

    await enqueuePuzzleGeneration({
      puzzleId: puzzle.id,
      imageKey: puzzle.imageKey,
      gridCols: puzzle.gridCols,
      gridRows: puzzle.gridRows,
    });

    return reply.status(201).send({
      ...puzzle,
      imageUrl: getImageUrl(puzzle.imageKey),
    });
  });

  app.patch('/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { id } = request.params as { id: string };
    const body = updatePuzzleSchema.parse(request.body);

    const [puzzle] = await db.select().from(puzzles).where(eq(puzzles.id, id)).limit(1);

    if (!puzzle) {
      return reply.status(404).send({ message: 'Puzzle not found' });
    }

    if (puzzle.userId !== request.user.userId) {
      return reply.status(403).send({ message: 'Not your puzzle' });
    }

    const [updated] = await db
      .update(puzzles)
      .set(body)
      .where(eq(puzzles.id, id))
      .returning();

    return {
      ...updated,
      imageUrl: getImageUrl(updated.imageKey),
    };
  });

  app.delete('/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    const [puzzle] = await db.select().from(puzzles).where(eq(puzzles.id, id)).limit(1);

    if (!puzzle) {
      return reply.status(404).send({ message: 'Puzzle not found' });
    }

    if (puzzle.userId !== request.user.userId) {
      return reply.status(403).send({ message: 'Not your puzzle' });
    }

    await db.delete(progress).where(eq(progress.puzzleId, id));

    try {
      await minioClient.removeObject(BUCKET_IMAGES, puzzle.imageKey);
    } catch {
      // ignore if file doesn't exist
    }

    await db.delete(puzzles).where(eq(puzzles.id, id));

    return { message: 'Puzzle deleted' };
  });
};