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

/** Create a PENDING debit when store-sender + sender-pays order is placed. */
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

  const wallet = await getStoreAvailableBalance(input.storeId);
  if (!wallet) {
    const error = new Error('Store not found') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (wallet.available < amount) {
    const error = new Error(
      `Store balance too low (available $${wallet.available.toFixed(2)})`
    ) as Error & { statusCode?: number };
    error.statusCode = 402;
    throw error;
  }

  return prisma.storeWalletTransaction.create({
    data: {
      storeId: input.storeId,
      type: StoreWalletTxnType.DEBIT,
      status: StoreWalletTxnStatus.PENDING,
      amount,
      balanceAfter: wallet.balance,
      note: `Order ${input.orderId} · pending`,
      deliveryRequestId: input.deliveryRequestId,
    },
  });
}

/** Deduct store balance when the delivery reaches COMPLETED. */
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
    if (current + 1e-9 < amount) {
      const error = new Error(
        `Store balance too low to settle order ($${current.toFixed(2)})`
      ) as Error & { statusCode?: number };
      error.statusCode = 402;
      throw error;
    }

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
        note: `Order ${delivery.orderId} · completed`,
        settledAt: new Date(),
      },
    });
  });
}

/** Cancel pending debit when the delivery is cancelled (no balance change). */
export async function cancelPendingStoreDebit(deliveryRequestId: string) {
  const pending = await prisma.storeWalletTransaction.findFirst({
    where: {
      deliveryRequestId,
      type: StoreWalletTxnType.DEBIT,
      status: StoreWalletTxnStatus.PENDING,
    },
  });
  if (!pending) return null;

  return prisma.storeWalletTransaction.update({
    where: { id: pending.id },
    data: {
      status: StoreWalletTxnStatus.CANCELLED,
      note: pending.note?.replace('pending', 'cancelled') || 'Order cancelled',
      settledAt: new Date(),
    },
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
  if (wallet.available < amount) {
    const error = new Error(
      `Store balance too low for return payout (need $${amount.toFixed(2)}, available $${wallet.available.toFixed(2)})`
    ) as Error & { statusCode?: number };
    error.statusCode = 402;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store) return null;

    const current = Number(store.balance);
    if (current + 1e-9 < amount) {
      const error = new Error(
        `Store balance too low for return payout ($${current.toFixed(2)})`
      ) as Error & { statusCode?: number };
      error.statusCode = 402;
      throw error;
    }

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
        note: `Order ${input.orderId} · return · driver payout`,
        deliveryRequestId: input.deliveryRequestId,
        settledAt: new Date(),
      },
    });
  });
}
