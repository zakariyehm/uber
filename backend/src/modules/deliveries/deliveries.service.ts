import { DeliveryStatus, type DeliveryRequest as DbDelivery } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { allocateOrderId } from '../../utils/order-id.ts';
import { toDeliveryDto } from '../../utils/delivery-mapper.ts';

/** Uber-style: each online driver gets 30s to accept/decline, then offer rotates. */
export const OFFER_TTL_SEC = 30;
/** After every online driver declines/times out, wait this long before looping back to driver 1. */
export const OFFER_CYCLE_PAUSE_SEC = 60;

function parseDeclinedIds(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function serializeDeclinedIds(ids: string[]) {
  return JSON.stringify([...new Set(ids)]);
}

export async function getBusyActiveRequestId(driverUserId: string): Promise<string | null> {
  const row = await prisma.driverActiveDelivery.findUnique({
    where: { driverUserId },
  });
  if (!row?.requestId) return null;

  const delivery = await prisma.deliveryRequest.findUnique({
    where: { id: row.requestId },
  });
  if (!delivery) {
    await prisma.driverActiveDelivery.update({
      where: { driverUserId },
      data: { requestId: null },
    });
    return null;
  }

  if (delivery.status === DeliveryStatus.CANCELLED) {
    await prisma.driverActiveDelivery.update({
      where: { driverUserId },
      data: { requestId: null },
    });
    return null;
  }

  if (delivery.status === DeliveryStatus.COMPLETED && delivery.userConfirmedDelivery) {
    await prisma.driverActiveDelivery.update({
      where: { driverUserId },
      data: { requestId: null },
    });
    return null;
  }

  return delivery.id;
}

async function listOnlineAvailableDrivers(): Promise<string[]> {
  const profiles = await prisma.driverProfile.findMany({
    where: { isOnline: true },
    select: { userId: true },
    orderBy: { updatedAt: 'asc' },
  });

  const available: string[] = [];
  for (const profile of profiles) {
    const busy = await getBusyActiveRequestId(profile.userId);
    if (!busy) available.push(profile.userId);
  }
  return available;
}

function pickNextDriver(
  onlineIds: string[],
  declinedIds: string[],
  currentDriverId: string | null
): string | null {
  if (onlineIds.length === 0) return null;

  let pool = onlineIds.filter((id) => !declinedIds.includes(id));
  let resetCycle = false;
  if (pool.length === 0) {
    pool = [...onlineIds];
    resetCycle = true;
  }

  if (!currentDriverId || resetCycle) {
    return pool[0] || null;
  }

  const currentIndex = onlineIds.indexOf(currentDriverId);
  for (let i = 1; i <= onlineIds.length; i++) {
    const candidate = onlineIds[(Math.max(currentIndex, 0) + i) % onlineIds.length];
    if (pool.includes(candidate)) return candidate;
  }
  return pool[0] || null;
}

async function assignOfferToDriver(deliveryId: string, driverUserId: string, declinedIds: string[]) {
  const expiresAt = new Date(Date.now() + OFFER_TTL_SEC * 1000);
  return prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: {
      offeredToDriverId: driverUserId,
      offerExpiresAt: expiresAt,
      offerDeclinedIds: serializeDeclinedIds(declinedIds),
    },
  });
}

async function clearOffer(deliveryId: string, declinedIds: string[]) {
  return prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: {
      offeredToDriverId: null,
      offerExpiresAt: null,
      offerDeclinedIds: serializeDeclinedIds(declinedIds),
    },
  });
}

/** Pause after a full decline cycle; resume from driver 1 when offerExpiresAt passes. */
async function pauseOfferCycle(deliveryId: string) {
  const resumeAt = new Date(Date.now() + OFFER_CYCLE_PAUSE_SEC * 1000);
  return prisma.deliveryRequest.update({
    where: { id: deliveryId },
    data: {
      offeredToDriverId: null,
      offerExpiresAt: resumeAt,
      offerDeclinedIds: '[]',
    },
  });
}

function isCyclePaused(delivery: DbDelivery, now = Date.now()) {
  return (
    !delivery.offeredToDriverId &&
    Boolean(delivery.offerExpiresAt) &&
    (delivery.offerExpiresAt?.getTime() ?? 0) > now + 250
  );
}

/** Expire stale offers and assign/rotate to the next online driver. */
export async function ensureOfferAssignment(delivery: DbDelivery): Promise<DbDelivery> {
  if (delivery.status !== DeliveryStatus.PENDING) return delivery;

  const now = Date.now();
  const expiresAt = delivery.offerExpiresAt?.getTime() ?? 0;

  // Active offer still within its 30s window.
  if (delivery.offeredToDriverId && expiresAt > now + 250) return delivery;

  // Full cycle declined — wait 60s before looping back to driver 1.
  if (isCyclePaused(delivery, now)) return delivery;

  const onlineIds = await listOnlineAvailableDrivers();
  const declinedIds = parseDeclinedIds(delivery.offerDeclinedIds);
  const resumingAfterPause = !delivery.offeredToDriverId && expiresAt > 0 && expiresAt <= now;

  let nextDeclined = resumingAfterPause ? [] : [...declinedIds];
  if (delivery.offeredToDriverId && expiresAt > 0 && expiresAt <= now) {
    nextDeclined.push(delivery.offeredToDriverId);
  }

  const allDeclined =
    onlineIds.length > 0 && onlineIds.every((id) => nextDeclined.includes(id));
  if (allDeclined) {
    return pauseOfferCycle(delivery.id);
  }

  const currentDriverId = resumingAfterPause ? null : delivery.offeredToDriverId;
  const nextDriver = pickNextDriver(onlineIds, nextDeclined, currentDriverId);
  if (!nextDriver) {
    return clearOffer(delivery.id, nextDeclined);
  }

  return assignOfferToDriver(delivery.id, nextDriver, nextDeclined);
}

export async function createDelivery(
  input: {
    orderId?: string;
    pickupLocation: string;
    destinationLocation: string;
    recipientName: string;
    recipientNumber: string;
    itemType: string;
    deliveryMethod: string;
    deliveryPrice: string;
    senderName?: string;
    senderPhone?: string;
    referenceId?: string;
    deliveryTimeLabel?: string;
  },
  riderUserId?: string
) {
  const price = Number.parseFloat(input.deliveryPrice.replace('$', ''));
  const amount = Number.isFinite(price) ? price : 0;
  if (amount <= 0) {
    const error = new Error('Invalid delivery price') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const orderId = await allocateOrderId(input.orderId);

  let payerPhone = input.senderPhone?.trim() || '';
  // Prefer checkout sender number for Waafi charge; fall back to logged-in rider phone only if missing
  if (!payerPhone && riderUserId) {
    const rider = await prisma.user.findUnique({ where: { id: riderUserId }, select: { phone: true } });
    if (rider?.phone) payerPhone = rider.phone;
  }
  if (!payerPhone) {
    const error = new Error('Sender phone is required for Waafi payment hold') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  console.log('[Waafi] PreAuth hold starting', {
    orderId,
    senderPhone: payerPhone,
    amount,
  });

  const { holdPaymentForOrder } = await import('../payments/payment.settlement.ts');
  const { PaymentHoldStatus } = await import('@prisma/client');
  const hold = await holdPaymentForOrder({
    orderId,
    amount,
    payerPhone,
  });

  console.log('[Waafi] PreAuth hold result', {
    orderId,
    transactionId: hold.waafiTransactionId,
    mock: hold.mock,
  });
  const row = await prisma.deliveryRequest.create({
    data: {
      orderId,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      recipientName: input.recipientName,
      recipientNumber: input.recipientNumber,
      senderName: input.senderName,
      senderPhone: input.senderPhone || payerPhone,
      itemType: input.itemType,
      deliveryMethod: input.deliveryMethod,
      deliveryPrice: amount,
      referenceId: input.referenceId,
      deliveryTimeLabel: input.deliveryTimeLabel,
      riderUserId,
      paymentHoldStatus: PaymentHoldStatus.HELD,
      waafiTransactionId: hold.waafiTransactionId,
      waafiReferenceId: hold.waafiReferenceId,
      paymentHeldAt: new Date(),
    },
  });

  const offered = await ensureOfferAssignment(row);
  return toDeliveryDto(offered);
}

export async function listPending() {
  const rows = await prisma.deliveryRequest.findMany({
    where: { status: DeliveryStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDeliveryDto);
}

/** Only returns the offer currently assigned to this driver (30s window). */
export async function listPendingForDriver(driverUserId: string) {
  const busyId = await getBusyActiveRequestId(driverUserId);
  if (busyId) return [];

  const rows = await prisma.deliveryRequest.findMany({
    where: { status: DeliveryStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  });

  const mine = [];
  for (const row of rows) {
    const assigned = await ensureOfferAssignment(row);
    if (
      assigned.offeredToDriverId === driverUserId &&
      assigned.offerExpiresAt &&
      assigned.offerExpiresAt.getTime() > Date.now()
    ) {
      mine.push(toDeliveryDto(assigned));
    }
  }
  return mine;
}

export async function declineDeliveryForDriver(deliveryId: string, driverUserId: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id: deliveryId } });
  if (!row || row.status !== DeliveryStatus.PENDING) {
    const error = new Error('Offer is no longer available') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }

  if (row.offeredToDriverId && row.offeredToDriverId !== driverUserId) {
    const error = new Error('This offer is assigned to another driver') as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }

  const declinedIds = parseDeclinedIds(row.offerDeclinedIds);
  declinedIds.push(driverUserId);

  const onlineIds = await listOnlineAvailableDrivers();
  const nextDeclined = [...new Set(declinedIds)];
  const allDeclined =
    onlineIds.length > 0 && onlineIds.every((id) => nextDeclined.includes(id));

  if (allDeclined || onlineIds.length === 0) {
    await pauseOfferCycle(deliveryId);
    return {
      ok: true,
      rotatedTo: null,
      offerSeconds: OFFER_CYCLE_PAUSE_SEC,
      cyclePaused: true,
    };
  }

  const nextDriver = pickNextDriver(onlineIds, nextDeclined, driverUserId);
  if (!nextDriver) {
    await pauseOfferCycle(deliveryId);
    return {
      ok: true,
      rotatedTo: null,
      offerSeconds: OFFER_CYCLE_PAUSE_SEC,
      cyclePaused: true,
    };
  }

  const assigned = await assignOfferToDriver(deliveryId, nextDriver, nextDeclined);
  return {
    ok: true,
    rotatedTo: assigned.offeredToDriverId,
    offerSeconds: OFFER_TTL_SEC,
    cyclePaused: false,
  };
}

export async function listForRider(riderUserId: string) {
  const rows = await prisma.deliveryRequest.findMany({
    where: { riderUserId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDeliveryDto);
}

export async function listForDriver(driverUserId: string) {
  const rows = await prisma.deliveryRequest.findMany({
    where: { driverUserId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDeliveryDto);
}

export async function getByOrderId(orderId: string) {
  const code = orderId.replace(/^#/, '').trim();
  const row = await prisma.deliveryRequest.findFirst({
    where: {
      OR: [{ orderId: code }, { orderId: code.toUpperCase() }, { orderId }],
    },
  });
  return row ? toDeliveryDto(row) : null;
}

export async function getById(id: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id } });
  return row ? toDeliveryDto(row) : null;
}

export async function applyDeliveryAction(
  id: string,
  action: string,
  actor?: { id: string; name?: string },
  meta?: { cancelledBy?: 'driver' | 'rider' | 'system'; cancelReason?: string }
) {
  const now = new Date();

  if (action === 'accept') {
    if (!actor?.id) {
      const error = new Error('Driver required to accept') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    const busyId = await getBusyActiveRequestId(actor.id);
    if (busyId) {
      const error = new Error('Finish your current trip before accepting another') as Error & {
        statusCode?: number;
      };
      error.statusCode = 409;
      throw error;
    }

    const current = await prisma.deliveryRequest.findUnique({ where: { id } });
    if (!current || current.status !== DeliveryStatus.PENDING) {
      const error = new Error('This offer was already taken') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    if (current.offeredToDriverId && current.offeredToDriverId !== actor.id) {
      const error = new Error('This offer is assigned to another driver') as Error & {
        statusCode?: number;
      };
      error.statusCode = 409;
      throw error;
    }
    if (current.offerExpiresAt && current.offerExpiresAt.getTime() < Date.now() - 2000) {
      const error = new Error('Offer timed out') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    const claimed = await prisma.deliveryRequest.updateMany({
      where: { id, status: DeliveryStatus.PENDING },
      data: {
        status: DeliveryStatus.ACCEPTED,
        acceptedAt: now,
        driverUserId: actor.id,
        driverName: actor.name || 'Driver',
        offeredToDriverId: null,
        offerExpiresAt: null,
        offerDeclinedIds: '[]',
      },
    });

    if (claimed.count === 0) {
      const error = new Error('This offer was already taken') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    await prisma.driverActiveDelivery.upsert({
      where: { driverUserId: actor.id },
      update: { requestId: id },
      create: { driverUserId: actor.id, requestId: id },
    });

    return getById(id);
  }

  const current = await prisma.deliveryRequest.findUnique({ where: { id } });
  if (!current) {
    const error = new Error('Delivery not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const fail = (message: string, statusCode = 409) => {
    const error = new Error(message) as Error & { statusCode?: number };
    error.statusCode = statusCode;
    throw error;
  };

  const data: Record<string, unknown> = {};

  switch (action) {
    case 'mark_arrived': {
      if (current.status !== DeliveryStatus.ACCEPTED) fail('Can only mark arrived after accept');
      data.driverArrived = true;
      data.driverArrivedAt = now;
      break;
    }
    case 'confirm_arrival': {
      if (!current.driverArrived) fail('Wait until the driver marks arrived');
      data.userConfirmedArrival = true;
      data.userConfirmedArrivalAt = now;
      break;
    }
    case 'picked_up': {
      if (current.status !== DeliveryStatus.ACCEPTED) fail('Pickup only after accept');
      if (!current.userConfirmedArrival) fail('Wait for the rider to confirm you arrived');
      data.status = DeliveryStatus.PICKED_UP;
      data.pickedUpAt = now;
      break;
    }
    case 'confirm_pickup': {
      if (current.status !== DeliveryStatus.PICKED_UP) {
        fail('Confirm pickup only after driver collects the item');
      }
      data.userConfirmedPickup = true;
      data.userConfirmedPickupAt = now;
      break;
    }
    case 'start': {
      if (current.status !== DeliveryStatus.PICKED_UP) fail('Start only after pickup');
      if (!current.userConfirmedPickup) fail('Wait for the rider to confirm the package was taken');
      data.status = DeliveryStatus.IN_TRANSIT;
      data.startedAt = now;
      break;
    }
    case 'request_payment': {
      if (current.status !== DeliveryStatus.IN_TRANSIT) fail('Payment only during trip');
      data.paymentRequested = true;
      data.paymentRequestedAt = now;
      break;
    }
    case 'complete': {
      if (current.status !== DeliveryStatus.IN_TRANSIT) fail('Complete only during an active trip');
      data.status = DeliveryStatus.COMPLETED;
      data.completedAt = now;
      break;
    }
    case 'confirm_received': {
      if (current.status !== DeliveryStatus.COMPLETED) {
        fail('Confirm received only after driver completes delivery');
      }
      if (current.userConfirmedDelivery) fail('Delivery already confirmed');
      data.userConfirmedDelivery = true;
      data.userConfirmedDeliveryAt = now;
      break;
    }
    case 'cancel': {
      if (current.status === DeliveryStatus.CANCELLED) fail('Delivery already cancelled');
      if (current.status === DeliveryStatus.COMPLETED) fail('Cannot cancel a completed delivery');

      const {
        canCancelForNoShow,
        arrivalWaitRemainingSec,
        ARRIVAL_WAIT_MINUTES,
      } = await import('../payments/payment.settlement.ts');

      const isNoShowPath =
        current.status === DeliveryStatus.ACCEPTED &&
        current.driverArrived &&
        !current.userConfirmedArrival &&
        (meta?.cancelReason === 'no_show' ||
          meta?.cancelReason === 'rider_not_responding' ||
          meta?.cancelledBy === 'driver');

      if (isNoShowPath) {
        if (!canCancelForNoShow(current)) {
          const left = arrivalWaitRemainingSec(current.driverArrivedAt);
          fail(
            `Wait ${ARRIVAL_WAIT_MINUTES} minutes at pickup before cancelling for no-show (${left}s left)`
          );
        }
        data.status = DeliveryStatus.CANCELLED;
        data.cancelledAt = now;
        data.offeredToDriverId = null;
        data.offerExpiresAt = null;
        data.cancelledBy = meta?.cancelledBy || 'driver';
        data.cancelReason = 'no_show';
        break;
      }

      data.status = DeliveryStatus.CANCELLED;
      data.cancelledAt = now;
      data.offeredToDriverId = null;
      data.offerExpiresAt = null;
      data.cancelledBy = meta?.cancelledBy || (actor?.id ? 'driver' : 'system');
      data.cancelReason = meta?.cancelReason || 'cancelled';
      break;
    }
    default: {
      fail('Unknown delivery action', 400);
    }
  }

  const row = await prisma.deliveryRequest.update({
    where: { id },
    data,
  });

  if (action === 'confirm_received' || action === 'cancel') {
    await prisma.driverActiveDelivery.updateMany({
      where: { requestId: id },
      data: { requestId: null },
    });
  }

  if (action === 'confirm_received' && row.driverUserId) {
    const { settleFullTrip } = await import('../payments/payment.settlement.ts');
    await settleFullTrip(id);
    return getById(id);
  }

  if (action === 'cancel') {
    const { settleNoShow, releasePaymentHold } = await import('../payments/payment.settlement.ts');
    if (row.cancelReason === 'no_show') {
      await settleNoShow(id);
    } else {
      await releasePaymentHold(id);
    }

    if (row.driverUserId) {
      await prisma.driverWallet.upsert({
        where: { driverUserId: row.driverUserId },
        update: { tripsCancelled: { increment: 1 } },
        create: { driverUserId: row.driverUserId, tripsCancelled: 1 },
      });
    }
    return getById(id);
  }

  return toDeliveryDto(row);
}
