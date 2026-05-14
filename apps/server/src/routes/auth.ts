import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '../utils/auth.js';
import { registerSchema, loginSchema, changePasswordSchema } from '@puzzle-app/shared';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.email, body.email), eq(users.username, body.username)))
      .limit(1);

    if (existing.length > 0) {
      const field = existing[0].email === body.email ? 'email' : 'username';
      return reply.status(409).send({ message: `${field} already taken` });
    }

    const passwordHash = await hashPassword(body.password);

    const [user] = await db
      .insert(users)
      .values({
        username: body.username,
        email: body.email,
        passwordHash,
      })
      .returning();

    const accessToken = signAccessToken({ userId: user.id, username: user.username });
    const refreshToken = signRefreshToken({ userId: user.id, username: user.username });

    reply
      .setCookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS)
      .setCookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, body.login), eq(users.username, body.login)))
      .limit(1);

    if (!user) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const accessToken = signAccessToken({ userId: user.id, username: user.username });
    const refreshToken = signRefreshToken({ userId: user.id, username: user.username });

    reply
      .setCookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS)
      .setCookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  });

  app.post('/logout', async (request, reply) => {
    reply
      .clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' })
      .clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });

    return { message: 'Logged out' };
  });

  app.post('/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_TOKEN_COOKIE];

    if (!token) {
      return reply.status(401).send({ message: 'No refresh token' });
    }

    try {
      const payload = verifyToken(token);

      const accessToken = signAccessToken({ userId: payload.userId, username: payload.username });
      const newRefreshToken = signRefreshToken({ userId: payload.userId, username: payload.username });

      reply
        .setCookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS)
        .setCookie(REFRESH_TOKEN_COOKIE, newRefreshToken, REFRESH_COOKIE_OPTIONS);

      return { message: 'Tokens refreshed' };
    } catch {
      reply
        .clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' })
        .clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });

      return reply.status(401).send({ message: 'Invalid refresh token' });
    }
  });
};