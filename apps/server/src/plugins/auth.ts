import { FastifyPluginAsync } from 'fastify';
import { verifyToken, ACCESS_TOKEN_COOKIE } from '../utils/auth.js';

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user', undefined);

  app.addHook('onRequest', async (request, reply) => {
    const token = request.cookies[ACCESS_TOKEN_COOKIE];

    if (!token) {
      request.user = undefined;
      return;
    }

    try {
      const payload = verifyToken(token);
      request.user = { userId: payload.userId, username: payload.username };
    } catch {
      request.user = undefined;
    }
  });
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: import('../utils/types.js').AuthenticatedRequest;
  }
}