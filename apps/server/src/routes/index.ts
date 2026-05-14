import type { FastifyInstance } from 'fastify';

export async function registerRoutes(app: FastifyInstance) {
  app.register(import('./auth.js'), { prefix: '/auth' });
  app.register(import('./puzzles.js'), { prefix: '/puzzles' });
  app.register(import('./progress.js'), { prefix: '/progress' });
  app.register(import('./reports.js'), { prefix: '/reports' });
  app.register(import('./profile.js'), { prefix: '/profile' });
}