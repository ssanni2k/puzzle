import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { progress, puzzles } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { saveProgressSchema } from '@puzzle-app/shared';

const uuidSchema = z.string().uuid();

export const progressRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:puzzleId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { puzzleId } = request.params as { puzzleId: string };
    const parsed = uuidSchema.safeParse(puzzleId);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid puzzle ID' });
    }

    const [entry] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, request.user.userId), eq(progress.puzzleId, puzzleId)))
      .limit(1);

    if (!entry) {
      return reply.status(404).send({ message: 'No saved progress' });
    }

    return entry;
  });

  app.put('/:puzzleId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { puzzleId } = request.params as { puzzleId: string };
    const parsed = uuidSchema.safeParse(puzzleId);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid puzzle ID' });
    }

    const body = saveProgressSchema.parse(request.body);

    const [existing] = await db
      .select({
        id: progress.id,
        completed: progress.completed,
      })
      .from(progress)
      .where(and(eq(progress.userId, request.user.userId), eq(progress.puzzleId, puzzleId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(progress)
        .set({
          stateJson: body.stateJson,
          completed: body.completed,
          updatedAt: new Date(),
        })
        .where(eq(progress.id, existing.id))
        .returning();

      if (body.completed && !existing.completed) {
        await db
          .update(puzzles)
          .set({ completionsCount: sql`${puzzles.completionsCount} + 1` })
          .where(eq(puzzles.id, puzzleId));
      }

      return updated;
    }

    const [created] = await db
      .insert(progress)
      .values({
        userId: request.user.userId,
        puzzleId,
        stateJson: body.stateJson,
        completed: body.completed,
      })
      .returning();

    if (body.completed) {
      await db
        .update(puzzles)
        .set({ completionsCount: sql`${puzzles.completionsCount} + 1` })
        .where(eq(puzzles.id, puzzleId));
    }

    return reply.status(201).send(created);
  });

  app.delete('/:puzzleId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { puzzleId } = request.params as { puzzleId: string };
    const parsed = uuidSchema.safeParse(puzzleId);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid puzzle ID' });
    }

    await db
      .delete(progress)
      .where(and(eq(progress.userId, request.user.userId), eq(progress.puzzleId, puzzleId)));

    return { message: 'Progress reset' };
  });
};