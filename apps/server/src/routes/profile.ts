import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { users, puzzles, progress } from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '../utils/auth.js';
import { changePasswordSchema } from '@puzzle-app/shared';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, request.user.userId)).limit(1);

    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    const [createdCount] = await db
      .select({ count: count() })
      .from(puzzles)
      .where(eq(puzzles.userId, user.id));

    const [completedCount] = await db
      .select({ count: count() })
      .from(progress)
      .where(and(eq(progress.userId, user.id), eq(progress.completed, true)));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      stats: {
        puzzlesCreated: createdCount.count,
        puzzlesCompleted: completedCount.count,
      },
    };
  });

  app.patch('/password', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ message: 'Authentication required' });
    }

    const body = changePasswordSchema.parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.id, request.user.userId)).limit(1);

    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    const valid = await verifyPassword(body.oldPassword, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ message: 'Invalid current password' });
    }

    const newHash = await hashPassword(body.newPassword);

    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

    return { message: 'Password changed' };
  });
};