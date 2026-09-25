import {
  RiderKind,
  StoreWalletTxnStatus,
  StoreWalletTxnType,
  UserRole,
  WalletTopUpStatus,
  WalletTopUpTarget,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { normalizeWaafiPhone, toWaafiReferenceId, waafiPurchase } from '../payments/waafi.client.ts';
import { getStoreAvailableBalance } from '../stores/store-wallet.service.ts';

const MIN_TOPUP = 1;
const MAX_TOPUP = 100;

function moneyStr(value: unknown) {
  return Number(value ?? 0).toFixed(2);
}

export async function getRiderWalletView(riderUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: riderUserId },
    include: {
      riderProfile: { include: { store: true } },
      riderWallet: true,
    },
  });
  if (!user || user.role !== UserRole.RIDER) {
    const error = new Error('Rider account required') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const wallet = await prisma.riderWallet.upsert({
    where: { riderUserId },
    update: {},
    create: { riderUserId },
  });

  const isStore = user.riderProfile?.riderKind === RiderKind.STORE && Boolean(user.riderProfile.storeId);
  const store = isStore ? user.riderProfile?.store : null;
  const storeAvail = store ? await getStoreAvailableBalance(store.id) : null;
  const creditEvents = await prisma.deliveryRequest.count({
    where: {
      riderUserId,
      settlementType: 'NO_SHOW',
      riderRefundPending: { gt: 0 },
    },
  });
  if (!isStore) {
    return {
      role: 'RIDER' as const,
      kind: 'PERSONAL' as const,
      canTopUp: false,
      balance: '0.00',
      pendingBalance: moneyStr(wallet.pendingBalance),
      creditEvents,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  const [recent, refunds] = await Promise.all([
    prisma.walletTopUp.findMany({
      where: { userId: riderUserId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    store
      ? prisma.storeWalletTransaction.findMany({
          where: {
            storeId: store.id,
            type: StoreWalletTxnType.CREDIT,
            note: { contains: 'Cancel refund' },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return {
    role: 'RIDER' as const,
    kind: 'STORE' as const,
    canTopUp: true,
    storeId: store?.id || null,
    storeName: store?.name || null,
    phone: user.phone,
    balance: moneyStr(storeAvail?.balance ?? store?.balance),
    available: moneyStr(storeAvail?.available ?? store?.balance),
    pendingDebits: moneyStr(storeAvail?.pendingDebits ?? 0),
    pendingBalance: moneyStr(wallet.pendingBalance),
    creditEvents,
    updatedAt: wallet.updatedAt.toISOString(),
    topUps: [
      ...recent.map((row) => ({
        id: row.id,
        amount: moneyStr(row.amount),
        status: row.status,
        target: row.target,
        createdAt: row.createdAt.toISOString(),
      })),
      ...refunds.map((row) => ({
        id: row.id,
        amount: moneyStr(row.amount),
        status: 'REFUNDED',
        target: 'STORE',
        createdAt: row.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 8),
  };
}

export async function topUpRiderWallet(input: {
  riderUserId: string;
  amount: number;
  accountNo?: string;
}) {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
    const error = new Error(`Top up must be between $${MIN_TOPUP.toFixed(2)} and $${MAX_TOPUP.toFixed(2)}`) as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: input.riderUserId },
    include: { riderProfile: true },
  });
  if (!user || user.role !== UserRole.RIDER) {
    const error = new Error('Rider account required') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const isStore = user.riderProfile?.riderKind === RiderKind.STORE && Boolean(user.riderProfile.storeId);
  const storeId = isStore ? user.riderProfile?.storeId || null : null;
  if (!isStore || !storeId) {
    const error = new Error('Top up is only available for store accounts') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  const accountNo = normalizeWaafiPhone(input.accountNo || user.phone);
  if (!/^252\d{8,10}$/.test(accountNo)) {
    const error = new Error('Enter a valid Somalia mobile number for Waafi, e.g. 25261xxxxxxx') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  const referenceId = toWaafiReferenceId(`topup-${Date.now()}`);
  const row = await prisma.walletTopUp.create({
    data: {
      userId: user.id,
      storeId,
      target: WalletTopUpTarget.STORE,
      amount,
      status: WalletTopUpStatus.PENDING,
      accountNo,
      waafiReferenceId: referenceId,
    },
  });

  const purchase = await waafiPurchase({
    accountNo,
    amount,
    referenceId,
    invoiceId: referenceId,
    description: `Raac store top up ${amount}`,
  });

  if (!purchase.ok) {
    await prisma.walletTopUp.update({
      where: { id: row.id },
      data: {
        status: WalletTopUpStatus.FAILED,
        waafiTransactionId: purchase.transactionId || null,
        waafiReferenceId: purchase.referenceId || referenceId,
        responseMsg: purchase.responseMsg || 'Purchase failed',
      },
    });
    const error = new Error(
      purchase.responseMsg || 'Waafi could not charge this number. Check the mobile wallet and try again.'
    ) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    const store = await tx.store.update({
      where: { id: storeId },
      data: { balance: { increment: amount } },
    });
    await tx.storeWalletTransaction.create({
      data: {
        storeId,
        type: StoreWalletTxnType.CREDIT,
        status: StoreWalletTxnStatus.COMPLETED,
        amount,
        balanceAfter: store.balance,
        note: `Waafi top up ${purchase.transactionId || referenceId}`,
        settledAt: new Date(),
      },
    });
    await tx.walletTopUp.update({
      where: { id: row.id },
      data: {
        status: WalletTopUpStatus.COMPLETED,
        waafiTransactionId: purchase.transactionId || null,
        waafiReferenceId: purchase.referenceId || referenceId,
        responseMsg: purchase.responseMsg || 'RCS_SUCCESS',
      },
    });
  });

  const next = await getRiderWalletView(user.id);
  return {
    ...next,
    lastTopUp: {
      id: row.id,
      amount: amount.toFixed(2),
      mock: Boolean(purchase.mock),
      transactionId: purchase.transactionId || null,
    },
  };
}
