export interface AuthenticatedRequest {
  userId: string;
  username: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedRequest;
  }
}