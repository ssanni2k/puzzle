import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { puzzles } from '../db/schema.js';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';
import { createPuzzleSchema, updatePuzzleSchema, puzzleQuerySchema } from '@puzzle-app/shared';

export const puzzleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const query = puzzleQuerySchema.parse(request.query);
    const { page, limit, search, mine } = query;
    const offset = (page - 1) * limit;

    const conditions = mine && request.user
      ? and(eq(puzzles.userId, request.user.userId), search ? ilike(puzzles.title, `%${search}%`) : undefined)
      : and(
          eq(puzzles.isPublic, true),
          search ? ilike(puzzles.title, `%${search}%`) : undefined,
        );

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

    return {
      items,
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

    return puzzle;
  });

  app.post('/', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const body = createPuzzleSchema.parse(request.body);

    const [puzzle] = await db
      .insert(puzzles)
      .values({
        userId: request.user.userId,
        title: body.title,
        gridCols: body.gridCols,
        gridRows: body.gridRows,
        imageKey: '',
        status: 'pending',
      })
      .returning();

    return reply.status(201).send(puzzle);
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

    return updated;
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

    await db.delete(puzzles).where(eq(puzzles.id, id));

    return { message: 'Puzzle deleted' };
  });
};