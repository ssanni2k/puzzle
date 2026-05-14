import type { FastifyPluginAsync } from 'fastify';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (_request, _reply) => {
    // TODO: implement registration
  });

  app.post('/login', async (_request, _reply) => {
    // TODO: implement login
  });

  app.post('/logout', async (_request, _reply) => {
    // TODO: implement logout
  });

  app.post('/refresh', async (_request, _reply) => {
    // TODO: implement token refresh
  });
};

export default authRoutes;