import { env } from './config/env.ts';
import { prisma } from './lib/prisma.ts';
import { ensurePostgis } from './lib/driver-locations.ts';
import { startOfferSweeper } from './lib/offer-sweeper.ts';
import { connectRedis, redis } from './lib/redis.ts';
import { buildApp } from './app.ts';

async function start() {
  const app = await buildApp();
  await prisma.$connect();
  await connectRedis();
  await ensurePostgis();
  try {
    const { getPlatformSettings } = await import('./modules/admin/settings.service.ts');
    await getPlatformSettings();
  } catch (error) {
    console.warn('Could not hydrate live driver fee', error);
  }
  const { shortenLegacyOrderIds } = await import('./utils/order-id.ts');
  await shortenLegacyOrderIds();

  startOfferSweeper();

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
