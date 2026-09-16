import { env } from './config/env.ts';
import { prisma } from './lib/prisma.ts';
import { connectRedis, redis } from './lib/redis.ts';
import { buildApp } from './app.ts';

async function start() {
  const app = await buildApp();
  await prisma.$connect();
  await connectRedis();
  const { shortenLegacyOrderIds } = await import('./utils/order-id.ts');
  await shortenLegacyOrderIds();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown() {
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
