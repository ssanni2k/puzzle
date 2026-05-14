import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { progress } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { saveProgressSchema } from '@puzzle-app/shared';

export const progressRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:puzzleId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { puzzleId } = request.params as { puzzleId: string };

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
    const body = saveProgressSchema.parse(request.body);

    const [existing] = await db
      .select()
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

    return reply.status(201).send(created);
  });

  app.delete('/:puzzleId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { puzzleId } = request.params as { puzzleId: string };

    await db
      .delete(progress)
      .where(and(eq(progress.userId, request.user.userId), eq(progress.puzzleId, puzzleId)));

    return { message: 'Progress reset' };
  });
};