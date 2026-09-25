import {
  Prisma,
  SenderKind,
  StoreWalletTxnStatus,
  StoreWalletTxnType,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getStoreAvailableBalance(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return null;

  const pending = await prisma.storeWalletTransaction.aggregate({
    where: {
      storeId,
      type: StoreWalletTxnType.DEBIT,
      status: StoreWalletTxnStatus.PENDING,
    },
    _sum: { amount: true },
  });

  const held = Number(pending._sum.amount ?? 0);
  const balance = Number(store.balance);
  return {
    balance: roundMoney(balance),
    pendingDebits: roundMoney(held),
    available: roundMoney(Math.max(0, balance - held)),
  };
}

export async function assertStoreCanCover(storeId: string, amount: number) {
  const need = roundMoney(amount);
  const wallet = await getStoreAvailableBalance(storeId);
  if (!wallet) {
    const error = new Error('Store not found') as Error & { statusCode?: number; code?: string };
    error.statusCode = 400;
    error.code = 'store/not_found';
    throw error;
  }
  if (wallet.available < need) {
    const error = new Error(
      `Kuguma filna. Haraaga waa $${wallet.available.toFixed(2)}, trip-kan waa $${need.toFixed(2)}. Samee top up.`
    ) as Error & { statusCode?: number; code?: string };
    error.statusCode = 402;
    error.code = 'wallet/insufficient';
    throw error;
  }
  return wallet;
}

/** Take trip fare from store top-up balance when the order is placed. */
export async function createPendingStoreDebit(input: {
  storeId: string;
  amount: number;
  deliveryRequestId: string;
  orderId: string;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) {
    const error = new Error('Invalid store debit amount') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  await assertStoreCanCover(input.storeId, amount);

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.update({
      where: { id: input.storeId },
      data: { balance: { decrement: amount } },
    });
    return tx.storeWalletTransaction.create({
      data: {
        storeId: input.storeId,
        type: StoreWalletTxnType.DEBIT,
        status: StoreWalletTxnStatus.COMPLETED,
        amount,
        balanceAfter: store.balance,
        note: `Order ${input.orderId} · taken from top-up balance`,
        deliveryRequestId: input.deliveryRequestId,
        settledAt: new Date(),
      },
    });
  });
}

/** Finish any leftover PENDING debit from older orders. New trips are already charged at place. */
export async function settlePendingStoreDebit(deliveryRequestId: string) {
  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId },
  });
  if (!delivery?.storeId) return null;
  if (delivery.senderKind !== SenderKind.STORE) return null;
  if (delivery.payerType !== 'SENDER') return null;

  const pending = await prisma.storeWalletTransaction.findFirst({
    where: {
      deliveryRequestId,
      storeId: delivery.storeId,
      type: StoreWalletTxnType.DEBIT,
      status: StoreWalletTxnStatus.PENDING,
    },
  });
  if (!pending) return null;

  const amount = Number(pending.amount);

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: delivery.storeId! } });
    if (!store) return null;

    const current = Number(store.balance);
    const nextBalance = new Prisma.Decimal(roundMoney(current - amount));
    await tx.store.update({
      where: { id: store.id },
      data: { balance: nextBalance },
    });

    return tx.storeWalletTransaction.update({
      where: { id: pending.id },
      data: {
        status: StoreWalletTxnStatus.COMPLETED,
        balanceAfter: nextBalance,
        note: `Order ${delivery.orderId} · charged`,
        settledAt: new Date(),
      },
    });
  });
}

/** Cancel a debit. PENDING holds are dropped; completed top-up charges are refunded. */
export async function cancelPendingStoreDebit(deliveryRequestId: string) {
  const debit = await prisma.storeWalletTransaction.findFirst({
    where: {
      deliveryRequestId,
      type: StoreWalletTxnType.DEBIT,
      status: { in: [StoreWalletTxnStatus.PENDING, StoreWalletTxnStatus.COMPLETED] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!debit) return null;

  if (debit.status === StoreWalletTxnStatus.PENDING) {
    return prisma.storeWalletTransaction.update({
      where: { id: debit.id },
      data: {
        status: StoreWalletTxnStatus.CANCELLED,
        note: debit.note?.replace('credit hold', 'cancelled') || 'Order cancelled',
        settledAt: new Date(),
      },
    });
  }

  const amount = Number(debit.amount);
  return prisma.$transaction(async (tx) => {
    const store = await tx.store.update({
      where: { id: debit.storeId },
      data: { balance: { increment: amount } },
    });
    await tx.storeWalletTransaction.update({
      where: { id: debit.id },
      data: {
        status: StoreWalletTxnStatus.CANCELLED,
        note: `Order cancelled · $${amount.toFixed(2)} returned to wallet`,
        settledAt: new Date(),
      },
    });
    return tx.storeWalletTransaction.create({
      data: {
        storeId: debit.storeId,
        type: StoreWalletTxnType.CREDIT,
        status: StoreWalletTxnStatus.COMPLETED,
        amount,
        balanceAfter: store.balance,
        note: `Cancel refund · $${amount.toFixed(2)} returned to wallet`,
        deliveryRequestId,
        settledAt: new Date(),
      },
    });
  });
}

/**
 * Recipient not found → package returned to store.
 * Charge store only the Delivery State driver payout (not the full trip fare).
 */
export async function debitStoreReturnPayout(input: {
  storeId: string;
  amount: number;
  deliveryRequestId: string;
  orderId: string;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) {
    const error = new Error('Invalid return payout amount') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  // Drop any pending full-fare debit first so available balance is accurate.
  await cancelPendingStoreDebit(input.deliveryRequestId);

  const wallet = await getStoreAvailableBalance(input.storeId);
  if (!wallet) {
    const error = new Error('Store not found') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store) return null;

    const current = Number(store.balance);
    const nextBalance = new Prisma.Decimal(roundMoney(current - amount));
    await tx.store.update({
      where: { id: store.id },
      data: { balance: nextBalance },
    });

    return tx.storeWalletTransaction.create({
      data: {
        storeId: input.storeId,
        type: StoreWalletTxnType.DEBIT,
        status: StoreWalletTxnStatus.COMPLETED,
        amount,
        balanceAfter: nextBalance,
        note: `Order ${input.orderId} · return charge · driver payout`,
        deliveryRequestId: input.deliveryRequestId,
        settledAt: new Date(),
      },
    });
  });
}
