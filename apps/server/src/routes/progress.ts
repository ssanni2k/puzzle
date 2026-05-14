import type { FastifyPluginAsync } from 'fastify';

const progressRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:puzzleId', async (_request, _reply) => {
    // TODO: get progress for puzzle
  });

  app.put('/:puzzleId', async (_request, _reply) => {
    // TODO: save progress
  });

  app.delete('/:puzzleId', async (_request, _reply) => {
    // TODO: reset progress
  });
};

export default progressRoutes;