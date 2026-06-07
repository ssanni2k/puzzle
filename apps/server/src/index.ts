import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { db } from './db/index.js';
import { registerRoutes } from './routes/index.js';
import { authPlugin } from './plugins/auth.js';
import { ensureBuckets } from './services/minio.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error: Error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.issues,
      });
    }
    app.log.error(error);
    const statusCode = 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500;
    reply.status(statusCode).send({
      message: error.message || 'Internal Server Error',
    });
  });

  await app.register(cors, {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.register(cookie);
  await app.register(websocket);
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  await app.register(authPlugin);

  app.decorate('db', db);

  await ensureBuckets();

  registerRoutes(app);

  app.get('/health', async () => ({ status: 'ok' }));

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();