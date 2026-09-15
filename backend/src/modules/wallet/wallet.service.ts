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

/** Recompute wallet from confirmed completed deliveries so the amount is always correct. */
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

  const balance = completed.reduce(
    (sum, row) => sum.add(row.deliveryPrice),
    new Prisma.Decimal(0)
  );
  const tripsCompleted = completed.length;

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
      balance,
      tripsCompleted,
      tripsCancelled: cancelledCount,
    },
    create: {
      driverUserId,
      balance,
      tripsCompleted,
      tripsCancelled: cancelledCount,
    },
  });

  return {
    balance: Number(wallet.balance).toFixed(2),
    tripsCompleted: wallet.tripsCompleted,
    tripsCancelled: wallet.tripsCancelled,
    todayCompleted: todayRows.length,
    todayEarnings: Number(todayEarnings).toFixed(2),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export async function creditDriverForDelivery(driverUserId: string, amount: Prisma.Decimal | number) {
  await getOrCreateWallet(driverUserId);
  await prisma.driverWallet.update({
    where: { driverUserId },
    data: {
      balance: { increment: amount },
      tripsCompleted: { increment: 1 },
    },
  });
}

export async function walletRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireDriver }, async (request) => {
    return syncDriverWallet(request.user.sub);
  });
}
