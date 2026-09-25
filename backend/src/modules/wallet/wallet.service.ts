import { PaymentHoldStatus, Prisma, SettlementType, UserRole } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.ts';
import { authenticate, requireDriver, requireRider } from '../../middleware/authenticate.ts';
import { getRiderWalletView, topUpRiderWallet } from './wallet-topup.service.ts';

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

/** Daily wallet: sum of today's settled driverEarnings (full trips + no-show + store returns). */
export async function syncDriverWallet(driverUserId: string) {
  const [settled, cancelledCount] = await Promise.all([
    prisma.deliveryRequest.findMany({
      where: {
        driverUserId,
        settlementType: {
          in: [SettlementType.FULL, SettlementType.NO_SHOW, SettlementType.RETURN],
        },
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
        NOT: { cancelReason: { in: ['no_show', 'return_to_store'] } },
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
  const totalEarnings = settled.reduce(
    (sum, row) => sum.add(row.driverEarnings || new Prisma.Decimal(0)),
    new Prisma.Decimal(0)
  );

  const tripsCompleted = settled.filter(
    (r) => r.completedAt || r.userConfirmedDeliveryAt || r.cancelledAt
  ).length;

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
    role: 'DRIVER' as const,
    balance: Number(todayEarnings).toFixed(2),
    pendingBalance: '0.00',
    tripsCompleted: todayRows.length,
    tripsCancelled: wallet.tripsCancelled,
    todayCompleted: todayRows.length,
    todayEarnings: Number(todayEarnings).toFixed(2),
    totalBalance: Number(totalEarnings).toFixed(2),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export async function getRiderWallet(riderUserId: string) {
  return getRiderWalletView(riderUserId);
}

export async function creditDriverForDelivery(driverUserId: string, _amount?: Prisma.Decimal | number) {
  await syncDriverWallet(driverUserId);
}

export async function walletRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    if (request.user.role === UserRole.DRIVER || request.user.role === 'DRIVER') {
      return syncDriverWallet(request.user.sub);
    }
    if (request.user.role === UserRole.RIDER || request.user.role === 'RIDER') {
      try {
        return await getRiderWallet(request.user.sub);
      } catch (err) {
        const error = err as Error & { statusCode?: number };
        return reply.code(error.statusCode || 400).send({
          error: error.message || 'Could not load wallet',
        });
      }
    }
    return reply.code(403).send({ error: 'Unsupported account role' });
  });

  app.get('/driver/me', { preHandler: requireDriver }, async (request) => {
    return syncDriverWallet(request.user.sub);
  });

  app.post('/topup', { preHandler: requireRider }, async (request, reply) => {
    const body = (request.body || {}) as { amount?: number | string; accountNo?: string };
    try {
      return await topUpRiderWallet({
        riderUserId: request.user.sub,
        amount: Number(body.amount),
        accountNo: typeof body.accountNo === 'string' ? body.accountNo : undefined,
      });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode || 400).send({
        error: error.message || 'Top up failed',
      });
    }
  });
}
