import { DeliveryStatus, Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.ts';
import { requireDriver } from '../../middleware/authenticate.ts';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOrCreateWallet(driverUserId: string) {
  return prisma.driverWallet.upsert({
    where: { driverUserId },
    update: {},
    create: { driverUserId },
  });
}

/** Daily wallet: balance is only what the driver earned today (resets at midnight). */
export async function syncDriverWallet(driverUserId: string) {
  const [completed, cancelledCount] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where: {
        driverUserId,
        status: DeliveryStatus.COMPLETED,
        userConfirmedDelivery: true,
      },
      select: { deliveryPrice: true, completedAt: true, userConfirmedDeliveryAt: true },
    }),
    prisma.deliveryRequest.count({
      where: {
        driverUserId,
        status: DeliveryStatus.CANCELLED,
      },
    }),
  ]);

  const todayStart = startOfToday();
  const todayRows = completed.filter((row) => {
    const at = row.userConfirmedDeliveryAt || row.completedAt;
    return at && at >= todayStart;
  });
  const todayEarnings = todayRows.reduce(
    (sum, row) => sum.add(row.deliveryPrice),
    new Prisma.Decimal(0)
  );

  const wallet = await prisma.driverWallet.upsert({
    where: { driverUserId },
    update: {
      // Stored balance mirrors today's earnings so a new day starts at 0.00
      balance: todayEarnings,
      tripsCompleted: completed.length,
      tripsCancelled: cancelledCount,
    },
    create: {
      driverUserId,
      balance: todayEarnings,
      tripsCompleted: completed.length,
      tripsCancelled: cancelledCount,
    },
  });

  return {
    balance: Number(todayEarnings).toFixed(2),
    tripsCompleted: todayRows.length,
    tripsCancelled: wallet.tripsCancelled,
    todayCompleted: todayRows.length,
    todayEarnings: Number(todayEarnings).toFixed(2),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export async function creditDriverForDelivery(driverUserId: string, _amount: Prisma.Decimal | number) {
  // Recompute from today's confirmed completions so each new day starts at 0.00
  await syncDriverWallet(driverUserId);
}

export async function walletRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireDriver }, async (request) => {
    return syncDriverWallet(request.user.sub);
  });
}
