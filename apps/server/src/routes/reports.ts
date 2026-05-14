import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { reports } from '../db/schema.js';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const { puzzleId, reason } = request.body as { puzzleId: string; reason?: string };

    const [report] = await db
      .insert(reports)
      .values({
        reporterId: request.user.userId,
        puzzleId,
        reason: reason ?? null,
      })
      .returning();

    return reply.status(201).send(report);
  });
};