import { DeliveryStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { redis } from '../../lib/redis.ts';
import { toDeliveryDto } from '../../utils/delivery-mapper.ts';

const DECLINE_COOLDOWN_SEC = 60;
const memoryDeclines = new Map<string, number>();

function declineKey(driverUserId: string, deliveryId: string) {
  return `driver:decline:${driverUserId}:${deliveryId}`;
}

async function setDecline(driverUserId: string, deliveryId: string) {
  const key = declineKey(driverUserId, deliveryId);
  memoryDeclines.set(key, Date.now() + DECLINE_COOLDOWN_SEC * 1000);
  try {
    await redis.set(key, '1', 'EX', DECLINE_COOLDOWN_SEC);
  } catch {
    // Redis optional — memory fallback keeps Uber-style skip working
  }
}

async function wasDeclined(driverUserId: string, deliveryId: string) {
  const key = declineKey(driverUserId, deliveryId);
  const until = memoryDeclines.get(key);
  if (until && until > Date.now()) return true;
  if (until) memoryDeclines.delete(key);
  try {
    return Boolean(await redis.exists(key));
  } catch {
    return false;
  }
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

  if (
    delivery.status === DeliveryStatus.COMPLETED ||
    delivery.status === DeliveryStatus.CANCELLED
  ) {
    await prisma.driverActiveDelivery.update({
      where: { driverUserId },
      data: { requestId: null },
    });
    return null;
  }

  return delivery.id;
}

export async function createDelivery(
  input: {
    orderId: string;
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
  const row = await prisma.deliveryRequest.create({
    data: {
      orderId: input.orderId,
      pickupLocation: input.pickupLocation,
      destinationLocation: input.destinationLocation,
      recipientName: input.recipientName,
      recipientNumber: input.recipientNumber,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      itemType: input.itemType,
      deliveryMethod: input.deliveryMethod,
      deliveryPrice: Number.isFinite(price) ? price : 0,
      referenceId: input.referenceId,
      deliveryTimeLabel: input.deliveryTimeLabel,
      riderUserId,
    },
  });
  return toDeliveryDto(row);
}

export async function listPending() {
  const rows = await prisma.deliveryRequest.findMany({
    where: { status: DeliveryStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDeliveryDto);
}

/** Uber-style: no offers while on an active trip; declined offers return after cooldown. */
export async function listPendingForDriver(driverUserId: string) {
  const busyId = await getBusyActiveRequestId(driverUserId);
  if (busyId) return [];

  const rows = await prisma.deliveryRequest.findMany({
    where: { status: DeliveryStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  });

  const available = [];
  for (const row of rows) {
    if (await wasDeclined(driverUserId, row.id)) continue;
    available.push(toDeliveryDto(row));
  }
  return available;
}

export async function declineDeliveryForDriver(deliveryId: string, driverUserId: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id: deliveryId } });
  if (!row || row.status !== DeliveryStatus.PENDING) {
    const error = new Error('Offer is no longer available') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }

  await setDecline(driverUserId, deliveryId);
  return { ok: true, cooldownSeconds: DECLINE_COOLDOWN_SEC };
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
  const row = await prisma.deliveryRequest.findUnique({ where: { orderId } });
  return row ? toDeliveryDto(row) : null;
}

export async function getById(id: string) {
  const row = await prisma.deliveryRequest.findUnique({ where: { id } });
  return row ? toDeliveryDto(row) : null;
}

export async function applyDeliveryAction(
  id: string,
  action: string,
  actor?: { id: string; name?: string }
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

    const claimed = await prisma.deliveryRequest.updateMany({
      where: { id, status: DeliveryStatus.PENDING },
      data: {
        status: DeliveryStatus.ACCEPTED,
        acceptedAt: now,
        driverUserId: actor.id,
        driverName: actor.name || 'Driver',
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

  const data: Record<string, unknown> = {};

  switch (action) {
    case 'picked_up':
      data.status = DeliveryStatus.PICKED_UP;
      data.pickedUpAt = now;
      break;
    case 'start':
      data.status = DeliveryStatus.IN_TRANSIT;
      data.startedAt = now;
      break;
    case 'complete':
      data.status = DeliveryStatus.COMPLETED;
      data.completedAt = now;
      break;
    case 'request_payment':
      data.paymentRequested = true;
      data.paymentRequestedAt = now;
      break;
    case 'mark_arrived':
      data.driverArrived = true;
      data.driverArrivedAt = now;
      break;
    case 'confirm_arrival':
      data.userConfirmedArrival = true;
      data.userConfirmedArrivalAt = now;
      break;
    case 'cancel':
      data.status = DeliveryStatus.CANCELLED;
      data.cancelledAt = now;
      break;
    default: {
      const error = new Error('Unknown delivery action') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }
  }

  const row = await prisma.deliveryRequest.update({
    where: { id },
    data,
  });

  if (action === 'complete' || action === 'cancel') {
    await prisma.driverActiveDelivery.updateMany({
      where: { requestId: id },
      data: { requestId: null },
    });
  }

  return toDeliveryDto(row);
}
