import type { DeliveryRequest as DbDelivery, DeliveryStatus } from '@prisma/client';
import { toIso } from './dates.ts';

const statusMap: Record<DeliveryStatus, string> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export type DeliveryDto = {
  id: string;
  orderId: string;
  pickupLocation: string;
  destinationLocation: string;
  recipientName: string;
  recipientNumber: string;
  senderName?: string;
  senderPhone?: string;
  itemType: string;
  deliveryMethod: string;
  deliveryPrice: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  startedAt?: string;
  completedAt?: string;
  driverId?: string;
  driverName?: string;
  paymentRequested: boolean;
  paymentRequestedAt?: string;
  driverArrived: boolean;
  driverArrivedAt?: string;
  userConfirmedArrival: boolean;
  userConfirmedArrivalAt?: string;
};

export function toDeliveryDto(row: DbDelivery): DeliveryDto {
  return {
    id: row.id,
    orderId: row.orderId,
    pickupLocation: row.pickupLocation,
    destinationLocation: row.destinationLocation,
    recipientName: row.recipientName,
    recipientNumber: row.recipientNumber,
    senderName: row.senderName ?? undefined,
    senderPhone: row.senderPhone ?? undefined,
    itemType: row.itemType,
    deliveryMethod: row.deliveryMethod,
    deliveryPrice: row.deliveryPrice.toFixed(2),
    status: statusMap[row.status],
    createdAt: row.createdAt.toISOString(),
    acceptedAt: toIso(row.acceptedAt),
    pickedUpAt: toIso(row.pickedUpAt),
    startedAt: toIso(row.startedAt),
    completedAt: toIso(row.completedAt),
    driverId: row.driverUserId ?? undefined,
    driverName: row.driverName ?? undefined,
    paymentRequested: row.paymentRequested,
    paymentRequestedAt: toIso(row.paymentRequestedAt),
    driverArrived: row.driverArrived,
    driverArrivedAt: toIso(row.driverArrivedAt),
    userConfirmedArrival: row.userConfirmedArrival,
    userConfirmedArrivalAt: toIso(row.userConfirmedArrivalAt),
  };
}
