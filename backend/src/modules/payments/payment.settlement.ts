import { DeliveryStatus, PaymentHoldStatus, Prisma, SettlementType } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { waafiCancel, waafiCommit, waafiPreAuthorize } from './waafi.client.ts';
import { toFriendlyPaymentError } from './payment-errors.ts';

/** Driver no-show fee after waiting 15 minutes for Confirm Arrival. */
export const NO_SHOW_FEE_USD = 0.5;
/** Platform service fee on successful completed trips. */
export const PLATFORM_FEE_RATE = 0.08;
/** Minutes driver must wait at pickup before no-show cancel is allowed. */
export const ARRIVAL_WAIT_MINUTES = 15;
export const ARRIVAL_WAIT_MS = ARRIVAL_WAIT_MINUTES * 60 * 1000;

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function fullTripDriverEarnings(price: number) {
  const platformFee = roundMoney(price * PLATFORM_FEE_RATE);
  const driverEarnings = roundMoney(price - platformFee);
  return { platformFee, driverEarnings };
}

export function arrivalWaitRemainingSec(driverArrivedAt: Date | null | undefined): number {
  if (!driverArrivedAt) return ARRIVAL_WAIT_MINUTES * 60;
  const elapsed = Date.now() - driverArrivedAt.getTime();
  return Math.max(0, Math.ceil((ARRIVAL_WAIT_MS - elapsed) / 1000));
}

export function canCancelForNoShow(row: {
  status: DeliveryStatus;
  driverArrived: boolean;
  driverArrivedAt: Date | null;
  userConfirmedArrival: boolean;
}): boolean {
  if (row.status !== DeliveryStatus.ACCEPTED) return false;
  if (!row.driverArrived || !row.driverArrivedAt) return false;
  if (row.userConfirmedArrival) return false;
  return arrivalWaitRemainingSec(row.driverArrivedAt) <= 0;
}

export async function holdPaymentForOrder(input: {
  orderId: string;
  amount: number;
  payerPhone: string;
}) {
  const referenceId = input.orderId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30);
  const result = await waafiPreAuthorize({
    accountNo: input.payerPhone,
    amount: input.amount,
    referenceId,
    description: `Payment for order ${referenceId}`,
  });

  if (!result.ok || !result.transactionId) {
    const error = new Error(
      toFriendlyPaymentError({
        responseMsg: result.responseMsg,
        responseCode: result.responseCode,
      })
    ) as Error & { statusCode?: number };
    error.statusCode = 402;
    throw error;
  }

  return {
    waafiTransactionId: result.transactionId,
    waafiReferenceId: result.referenceId || referenceId,
    mock: Boolean(result.mock),
  };
}

async function creditRiderPending(riderUserId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.riderWallet.upsert({
    where: { riderUserId },
    update: { pendingBalance: { increment: amount } },
    create: { riderUserId, pendingBalance: amount },
  });
}

async function refreshDriverDailyWallet(driverUserId: string) {
  const { syncDriverWallet } = await import('../wallet/wallet.service.ts');
  await syncDriverWallet(driverUserId);
}

/**
 * Successful trip Done: Commit Waafi hold, keep 8% platform fee, credit driver net.
 */
export async function settleFullTrip(deliveryId: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id: deliveryId } });
  if (!row?.driverUserId) return null;
  if (row.settlementType !== SettlementType.NONE) return row;
  if (row.paymentHoldStatus === PaymentHoldStatus.COMMITTED) return row;

  const price = Number(row.deliveryPrice);
  const { platformFee, driverEarnings } = fullTripDriverEarnings(price);

  if (row.paymentHoldStatus === PaymentHoldStatus.HELD && row.waafiTransactionId) {
    const commit = await waafiCommit(row.waafiTransactionId, `Commit order ${row.orderId}`);
    if (!commit.ok) {
      const error = new Error(
        toFriendlyPaymentError({
          responseMsg: commit.responseMsg || 'Could not capture payment',
          responseCode: commit.responseCode,
        })
      ) as Error & { statusCode?: number };
      error.statusCode = 502;
      throw error;
    }
  }

  const updated = await prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: {
      paymentHoldStatus: PaymentHoldStatus.COMMITTED,
      paymentCommittedAt: new Date(),
      settlementType: SettlementType.FULL,
      driverEarnings,
      platformFee,
      riderRefundPending: 0,
      settledAt: new Date(),
    },
  });

  await refreshDriverDailyWallet(row.driverUserId);
  return updated;
}

/**
 * No-show after 15 min waiting for Confirm Arrival:
 * Commit full Waafi hold → driver $0.50 → rider pending gets the rest.
 */
export async function settleNoShow(deliveryId: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id: deliveryId } });
  if (!row?.driverUserId) return null;
  if (row.settlementType !== SettlementType.NONE) return row;

  const price = Number(row.deliveryPrice);
  const driverEarnings = roundMoney(Math.min(NO_SHOW_FEE_USD, price));
  const riderRefundPending = roundMoney(Math.max(0, price - driverEarnings));

  if (row.paymentHoldStatus === PaymentHoldStatus.HELD && row.waafiTransactionId) {
    const commit = await waafiCommit(row.waafiTransactionId, `No-show commit ${row.orderId}`);
    if (!commit.ok) {
      const error = new Error(
        toFriendlyPaymentError({
          responseMsg: commit.responseMsg || 'Could not capture no-show payment',
          responseCode: commit.responseCode,
        })
      ) as Error & { statusCode?: number };
      error.statusCode = 502;
      throw error;
    }
  }

  const updated = await prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: {
      paymentHoldStatus: PaymentHoldStatus.COMMITTED,
      paymentCommittedAt: new Date(),
      settlementType: SettlementType.NO_SHOW,
      driverEarnings,
      platformFee: 0,
      riderRefundPending,
      settledAt: new Date(),
    },
  });

  if (row.riderUserId && riderRefundPending > 0) {
    await creditRiderPending(row.riderUserId, riderRefundPending);
  }

  await refreshDriverDailyWallet(row.driverUserId);
  return updated;
}

/** Release hold when trip cancels without capture (before no-show / before complete). */
export async function releasePaymentHold(deliveryId: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id: deliveryId } });
  if (!row) return null;
  if (row.paymentHoldStatus !== PaymentHoldStatus.HELD || !row.waafiTransactionId) return row;
  if (row.settlementType !== SettlementType.NONE) return row;

  const cancel = await waafiCancel(row.waafiTransactionId, `Release order ${row.orderId}`);
  if (!cancel.ok) {
    const error = new Error(
      toFriendlyPaymentError({
        responseMsg: cancel.responseMsg || 'Could not release payment hold',
        responseCode: cancel.responseCode,
      })
    ) as Error & { statusCode?: number };
    error.statusCode = 502;
    throw error;
  }

  return prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: {
      paymentHoldStatus: PaymentHoldStatus.RELEASED,
      paymentReleasedAt: new Date(),
    },
  });
}

export function money(n: number | Prisma.Decimal | null | undefined) {
  return Number(n ?? 0);
}
