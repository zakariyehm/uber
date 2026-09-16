import type { DeliveryRequest as DbDelivery, DeliveryStatus } from '@prisma/client';
import {
  ARRIVAL_WAIT_MS,
  arrivalWaitRemainingSec,
  canCancelForNoShow,
} from '../modules/payments/payment.settlement.ts';
import { toIso } from './dates.ts';
import { looksLikeOpenFleetMethod } from './vehicle-type.ts';

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
  vehicleType?: string;
  openToAllVehicleTypes?: boolean;
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
  userConfirmedPickup: boolean;
  userConfirmedPickupAt?: string;
  userConfirmedDelivery: boolean;
  userConfirmedDeliveryAt?: string;
  offeredToDriverId?: string;
  offerExpiresAt?: string;
  offerSecondsRemaining?: number;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  paymentHoldStatus?: string;
  settlementType?: string;
  driverEarnings?: string;
  platformFee?: string;
  riderRefundPending?: string;
  arrivalWaitSecondsRemaining?: number;
  canCancelForNoShow?: boolean;
  arrivalWaitMinutes?: number;
};

export function toDeliveryDto(row: DbDelivery): DeliveryDto {
  const offerExpiresAt = toIso(row.offerExpiresAt);
  const remaining = row.offerExpiresAt
    ? Math.max(0, Math.ceil((row.offerExpiresAt.getTime() - Date.now()) / 1000))
    : undefined;

  const waitingArrivalConfirm =
    row.status === 'ACCEPTED' && row.driverArrived && !row.userConfirmedArrival;
  const waitSec = waitingArrivalConfirm ? arrivalWaitRemainingSec(row.driverArrivedAt) : undefined;

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
    vehicleType: row.vehicleType,
    openToAllVehicleTypes: looksLikeOpenFleetMethod(row.deliveryMethod),
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
    userConfirmedPickup: row.userConfirmedPickup,
    userConfirmedPickupAt: toIso(row.userConfirmedPickupAt),
    userConfirmedDelivery: row.userConfirmedDelivery,
    userConfirmedDeliveryAt: toIso(row.userConfirmedDeliveryAt),
    offeredToDriverId: row.offeredToDriverId ?? undefined,
    offerExpiresAt,
    offerSecondsRemaining: remaining,
    cancelledAt: toIso(row.cancelledAt),
    cancelledBy: row.cancelledBy ?? undefined,
    cancelReason: row.cancelReason ?? undefined,
    paymentHoldStatus: row.paymentHoldStatus,
    settlementType: row.settlementType,
    driverEarnings: row.driverEarnings != null ? Number(row.driverEarnings).toFixed(2) : undefined,
    platformFee: row.platformFee != null ? Number(row.platformFee).toFixed(2) : undefined,
    riderRefundPending:
      row.riderRefundPending != null ? Number(row.riderRefundPending).toFixed(2) : undefined,
    arrivalWaitSecondsRemaining: waitSec,
    canCancelForNoShow: canCancelForNoShow(row),
    arrivalWaitMinutes: Math.round(ARRIVAL_WAIT_MS / 60000),
  };
}
