import type { FastifyPluginAsync } from 'fastify';

const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, _reply) => {
    // TODO: get profile info + stats
  });

  app.patch('/password', async (_request, _reply) => {
    // TODO: change password
  });
};

export default profileRoutes;