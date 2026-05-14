import type { FastifyPluginAsync } from 'fastify';

const puzzleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, _reply) => {
    // TODO: list puzzles with pagination & filters
  });

  app.get('/:id', async (_request, _reply) => {
    // TODO: get puzzle by id
  });

  app.post('/', async (_request, _reply) => {
    // TODO: create puzzle (upload image)
  });

  app.patch('/:id', async (_request, _reply) => {
    // TODO: update puzzle visibility
  });

  app.delete('/:id', async (_request, _reply) => {
    // TODO: delete puzzle
  });
};

export default puzzleRoutes;