import { DeliveryStatus, PaymentHoldStatus, Prisma, SettlementType } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { isOpenFleetMethod } from '../../utils/vehicle-type.ts';
import { DEFAULT_PLATFORM_FEE_RATE, getDriverFeeRate } from '../admin/settings.service.ts';
import { waafiCancel, waafiCommit, waafiPreAuthorize } from './waafi.client.ts';
import { toFriendlyPaymentError } from './payment-errors.ts';

/** Driver no-show fee after waiting 15 minutes for Confirm Arrival. */
export const NO_SHOW_FEE_USD = 0.5;
/** Delivery State complete: driver keeps this; the rest is Delivery State balance. */
export const STATE_DRIVER_PAYOUT_USD = 0.5;
/** Fallback only. Live rate comes from admin Fees after Save. */
export const PLATFORM_FEE_RATE = DEFAULT_PLATFORM_FEE_RATE;
/** Minutes driver must wait at pickup before no-show cancel is allowed. */
export const ARRIVAL_WAIT_MINUTES = 15;
export const ARRIVAL_WAIT_MS = ARRIVAL_WAIT_MINUTES * 60 * 1000;

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function splitTripEarnings(price: number, rate: number) {
  const platformFee = roundMoney(price * rate);
  const driverEarnings = roundMoney(price - platformFee);
  return { platformFee, driverEarnings };
}

/** Delivery State only: no % service fee. Driver $0.50, remainder is state balance. */
export function splitStateTripEarnings(price: number) {
  const driverEarnings = roundMoney(Math.min(STATE_DRIVER_PAYOUT_USD, Math.max(0, price)));
  const stateShare = roundMoney(Math.max(0, price - driverEarnings));
  return { driverEarnings, stateShare, platformFee: 0 };
}

export async function fullTripDriverEarnings(price: number) {
  return splitTripEarnings(price, await getDriverFeeRate());
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
 * Successful trip Done: Moto keeps the live % fee; Delivery State pays the driver $0.50
 * and the remainder is Delivery State balance (no system service fee).
 */
export async function settleFullTrip(deliveryId: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id: deliveryId } });
  if (!row?.driverUserId) return null;
  if (row.settlementType !== SettlementType.NONE) return row;
  if (row.paymentHoldStatus === PaymentHoldStatus.COMMITTED) return row;

  const price = Number(row.deliveryPrice);
  const stateTrip = await isOpenFleetMethod(row.deliveryMethod);
  const split = stateTrip
    ? splitStateTripEarnings(price)
    : { ...splitTripEarnings(price, await getDriverFeeRate()), stateShare: 0 };
  const { platformFee, driverEarnings, stateShare } = split;

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
      stateShare: stateTrip ? stateShare : 0,
      riderRefundPending: 0,
      settledAt: new Date(),
    },
  });

  if (stateTrip && stateShare > 0) {
    await prisma.platformSetting.upsert({
      where: { id: 'default' },
      update: { deliveryStateBalance: { increment: stateShare } },
      create: { id: 'default', deliveryStateBalance: stateShare },
    });
  }

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
