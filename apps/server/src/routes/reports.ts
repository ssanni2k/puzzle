import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { reports, puzzles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const createReportSchema = z.object({
  puzzleId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const body = createReportSchema.parse(request.body);
    const { puzzleId, reason } = body;

    const [puzzle] = await db
      .select({ id: puzzles.id, userId: puzzles.userId })
      .from(puzzles)
      .where(eq(puzzles.id, puzzleId))
      .limit(1);

    if (!puzzle) {
      return reply.status(404).send({ message: 'Puzzle not found' });
    }

    if (puzzle.userId === request.user.userId) {
      return reply.status(400).send({ message: 'Cannot report your own puzzle' });
    }

    const [existing] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.reporterId, request.user.userId), eq(reports.puzzleId, puzzleId)))
      .limit(1);

    if (existing) {
      return reply.status(409).send({ message: 'You have already reported this puzzle' });
    }

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