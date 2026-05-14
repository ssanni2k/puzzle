import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { puzzleRoutes } from './puzzles.js';
import { progressRoutes } from './progress.js';
import { reportRoutes } from './reports.js';
import { profileRoutes } from './profile.js';

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/auth' });
  app.register(puzzleRoutes, { prefix: '/puzzles' });
  app.register(progressRoutes, { prefix: '/progress' });
  app.register(reportRoutes, { prefix: '/reports' });
  app.register(profileRoutes, { prefix: '/profile' });
}