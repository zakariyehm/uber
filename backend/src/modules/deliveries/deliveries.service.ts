import { DeliveryStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { toDeliveryDto } from '../../utils/delivery-mapper.ts';

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

export async function listForRider(riderUserId: string) {
  const rows = await prisma.deliveryRequest.findMany({
    where: { riderUserId },
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
  const data: Record<string, unknown> = {};

  switch (action) {
    case 'accept':
      data.status = DeliveryStatus.ACCEPTED;
      data.acceptedAt = now;
      data.driverUserId = actor?.id;
      data.driverName = actor?.name;
      break;
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
    default:
      throw new Error('Unknown delivery action');
  }

  const row = await prisma.deliveryRequest.update({
    where: { id },
    data,
  });
  return toDeliveryDto(row);
}
