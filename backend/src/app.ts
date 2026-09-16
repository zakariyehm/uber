import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from './config/env.ts';
import { adminRoutes } from './modules/admin/admin.routes.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';
import { catalogRoutes } from './modules/catalog/catalog.routes.ts';
import { deliveryRoutes } from './modules/deliveries/deliveries.routes.ts';
import { walletRoutes } from './modules/wallet/wallet.service.ts';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string; phone: string; typ?: string; purpose?: string };
    user: { sub: string; role: string; phone: string; typ?: string; purpose?: string };
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    if (!body) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(String(body)));
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(catalogRoutes, { prefix: '/catalog' });
  await app.register(deliveryRoutes, { prefix: '/deliveries' });
  await app.register(walletRoutes, { prefix: '/wallet' });
  await app.register(adminRoutes, { prefix: '/admin' });

  app.setErrorHandler((error, _request, reply) => {
    const zodError =
      error instanceof ZodError ||
      (error as { name?: string }).name === 'ZodError';
    if (zodError) {
      const issues = (error as ZodError).issues || [];
      const first = issues[0]?.message || 'Invalid request';
      return reply.code(400).send({ error: first, details: issues });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return reply.code(404).send({ error: 'Not found' });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  return app;
}
