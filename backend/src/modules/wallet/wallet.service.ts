import { PaymentHoldStatus, Prisma, SettlementType } from '@prisma/client';
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

/** Daily wallet: sum of today's settled driverEarnings (full trips + no-show fees). */
export async function syncDriverWallet(driverUserId: string) {
  const [settled, cancelledCount] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where: {
        driverUserId,
        settlementType: { in: [SettlementType.FULL, SettlementType.NO_SHOW] },
        paymentHoldStatus: PaymentHoldStatus.COMMITTED,
        driverEarnings: { not: null },
      },
      select: {
        driverEarnings: true,
        settledAt: true,
        completedAt: true,
        cancelledAt: true,
        userConfirmedDeliveryAt: true,
      },
    }),
    prisma.deliveryRequest.count({
      where: {
        driverUserId,
        status: 'CANCELLED',
        NOT: { cancelReason: 'no_show' },
      },
    }),
  ]);

  const todayStart = startOfToday();
  const todayRows = settled.filter((row) => {
    const at = row.settledAt || row.userConfirmedDeliveryAt || row.completedAt || row.cancelledAt;
    return at && at >= todayStart;
  });

  const todayEarnings = todayRows.reduce(
    (sum, row) => sum.add(row.driverEarnings || new Prisma.Decimal(0)),
    new Prisma.Decimal(0)
  );

  const tripsCompleted = settled.filter((r) => r.completedAt || r.userConfirmedDeliveryAt).length;

  const wallet = await prisma.driverWallet.upsert({
    where: { driverUserId },
    update: {
      balance: todayEarnings,
      tripsCompleted,
      tripsCancelled: cancelledCount,
    },
    create: {
      driverUserId,
      balance: todayEarnings,
      tripsCompleted,
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

export async function creditDriverForDelivery(driverUserId: string, _amount?: Prisma.Decimal | number) {
  await syncDriverWallet(driverUserId);
}

export async function walletRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireDriver }, async (request) => {
    return syncDriverWallet(request.user.sub);
  });
}
