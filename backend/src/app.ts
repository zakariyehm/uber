import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from './config/env.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';
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

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(deliveryRoutes, { prefix: '/deliveries' });
  await app.register(walletRoutes, { prefix: '/wallet' });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Invalid request', details: error.issues });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return reply.code(404).send({ error: 'Not found' });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  return app;
}
