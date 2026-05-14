import type { FastifyPluginAsync } from 'fastify';

const reportRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (_request, _reply) => {
    // TODO: submit report
  });
};

export default reportRoutes;