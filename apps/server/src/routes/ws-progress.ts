import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { verifyToken, ACCESS_TOKEN_COOKIE } from '../utils/auth.js';

const connections = new Map<string, Set<WebSocket>>();

const wsLockSchema = z.object({
  type: z.literal('lock'),
  pieceId: z.string().min(1),
  targetX: z.number(),
  targetY: z.number(),
});

const wsCompleteSchema = z.object({
  type: z.literal('complete'),
});

const wsPingSchema = z.object({
  type: z.literal('ping'),
});

function getPuzzleConnections(puzzleId: string): Set<WebSocket> {
  let conns = connections.get(puzzleId);
  if (!conns) {
    conns = new Set();
    connections.set(puzzleId, conns);
  }
  return conns;
}

function broadcast(puzzleId: string, message: unknown, exclude?: WebSocket) {
  const conns = connections.get(puzzleId);
  if (!conns) return;
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  for (const ws of conns) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export const wsProgressRoutes: FastifyPluginAsync = async (app) => {
  app.get('/progress/:puzzleId', { websocket: true }, (socket, request) => {
    const { puzzleId } = request.params as { puzzleId: string };

    const token = request.cookies[ACCESS_TOKEN_COOKIE];
    let userId: string | undefined;

    if (token) {
      try {
        const payload = verifyToken(token);
        userId = payload.userId;
      } catch {
        socket.close(4001, 'Unauthorized');
        return;
      }
    }

    if (!userId) {
      socket.close(4001, 'Authentication required');
      return;
    }

    const conns = getPuzzleConnections(puzzleId);
    conns.add(socket);

    socket.on('close', () => {
      conns.delete(socket);
      if (conns.size === 0) {
        connections.delete(puzzleId);
      }
    });

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (wsPingSchema.safeParse(msg).success) {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        const lockResult = wsLockSchema.safeParse(msg);
        if (lockResult.success) {
          broadcast(puzzleId, {
            type: 'lock',
            pieceId: lockResult.data.pieceId,
            targetX: lockResult.data.targetX,
            targetY: lockResult.data.targetY,
            userId,
          }, socket);
          return;
        }

        if (wsCompleteSchema.safeParse(msg).success) {
          broadcast(puzzleId, {
            type: 'complete',
            userId,
          }, socket);
          return;
        }
      } catch {
        // ignore malformed messages
      }
    });
  });
};