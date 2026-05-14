import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { db } from './db/index.js';
import { registerRoutes } from './routes/index.js';
import { authPlugin } from './plugins/auth.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.register(cookie);
  await app.register(websocket);

  await app.register(authPlugin);

  app.decorate('db', db);

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