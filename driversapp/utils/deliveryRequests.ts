import { apiRequest } from '@/lib/api';

export type DeliveryStatus = 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';

export interface DeliveryRequest {
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
  status: DeliveryStatus;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  startedAt?: string;
  completedAt?: string;
  driverId?: string;
  driverName?: string;
  paymentRequested?: boolean;
  paymentRequestedAt?: string;
  driverArrived?: boolean;
  driverArrivedAt?: string;
  userConfirmedArrival?: boolean;
  userConfirmedArrivalAt?: string;
  userConfirmedPickup?: boolean;
  userConfirmedPickupAt?: string;
  userConfirmedDelivery?: boolean;
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
}

export const createDeliveryRequest = async (orderData: {
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
}): Promise<DeliveryRequest> => {
  return apiRequest<DeliveryRequest>('/deliveries', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

export const getPendingRequests = async (): Promise<DeliveryRequest[]> => {
  return apiRequest<DeliveryRequest[]>('/deliveries/pending');
};

/** Decline keeps the order pending for other drivers; returns after cooldown for this driver. */
export const declineDeliveryRequest = async (
  requestId: string
): Promise<{ ok: boolean; cooldownSeconds: number }> => {
  return apiRequest(`/deliveries/${requestId}/decline`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

export const getDeliveryRequestByOrderId = async (orderId: string): Promise<DeliveryRequest | null> => {
  try {
    return await apiRequest<DeliveryRequest>(`/deliveries/order/${encodeURIComponent(orderId)}`);
  } catch (error: any) {
    if (error.status === 404) return null;
    return null;
  }
};

export const getDeliveryRequestById = async (requestId: string): Promise<DeliveryRequest | null> => {
  try {
    return await apiRequest<DeliveryRequest>(`/deliveries/${requestId}`);
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
};

async function patchDelivery(requestId: string, action: string, extra: Record<string, string> = {}) {
  return apiRequest<DeliveryRequest>(`/deliveries/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, ...extra }),
  });
}

export const updateDeliveryRequest = async (
  requestId: string,
  updates: Partial<DeliveryRequest>
): Promise<DeliveryRequest | null> => {
  if (updates.status === 'accepted') {
    return patchDelivery(requestId, 'accept', {
      driverId: updates.driverId || '',
      driverName: updates.driverName || '',
    });
  }
  if (updates.status === 'picked_up') return patchDelivery(requestId, 'picked_up');
  if (updates.status === 'in_transit') return patchDelivery(requestId, 'start');
  if (updates.status === 'completed') return patchDelivery(requestId, 'complete');
  if (updates.status === 'cancelled') return patchDelivery(requestId, 'cancel');
  if (updates.paymentRequested) return patchDelivery(requestId, 'request_payment');
  if (updates.driverArrived) return patchDelivery(requestId, 'mark_arrived');
  if (updates.userConfirmedArrival) return patchDelivery(requestId, 'confirm_arrival');
  return getDeliveryRequestById(requestId);
};

export const setDriverOnline = async (isOnline: boolean): Promise<boolean> => {
  const result = await apiRequest<{ isOnline: boolean }>('/deliveries/drivers/me/online', {
    method: 'PUT',
    body: JSON.stringify({ isOnline }),
  });
  return result.isOnline;
};

export const getDriverOnline = async (): Promise<boolean> => {
  const result = await apiRequest<{ isOnline: boolean }>('/deliveries/drivers/me/online');
  return Boolean(result.isOnline);
};

export const getMyDriverDeliveries = async (): Promise<DeliveryRequest[]> => {
  return apiRequest<DeliveryRequest[]>('/deliveries/driver/mine');
};

export const acceptDeliveryRequest = async (
  requestId: string,
  driverId?: string,
  driverName?: string
): Promise<DeliveryRequest | null> => {
  return patchDelivery(requestId, 'accept', {
    ...(driverId ? { driverId } : {}),
    ...(driverName ? { driverName } : {}),
  });
};

export const markAsPickedUp = async (requestId: string) => patchDelivery(requestId, 'picked_up');
export const startTrip = async (requestId: string) => patchDelivery(requestId, 'start');
export const completeDelivery = async (requestId: string) => patchDelivery(requestId, 'complete');
export const requestPayment = async (requestId: string) => patchDelivery(requestId, 'request_payment');
export const markDriverArrived = async (requestId: string) => patchDelivery(requestId, 'mark_arrived');
export const confirmDriverArrival = async (requestId: string) => patchDelivery(requestId, 'confirm_arrival');
export const confirmPackagePickup = async (requestId: string) => patchDelivery(requestId, 'confirm_pickup');
export const confirmDeliveryReceived = async (requestId: string) =>
  patchDelivery(requestId, 'confirm_received');
export const cancelDeliveryRequest = async (
  requestId: string,
  options?: { cancelledBy?: 'driver' | 'rider' | 'system'; cancelReason?: string }
) =>
  patchDelivery(requestId, 'cancel', {
    ...(options?.cancelledBy ? { cancelledBy: options.cancelledBy } : { cancelledBy: 'driver' }),
    ...(options?.cancelReason
      ? { cancelReason: options.cancelReason }
      : { cancelReason: 'rider_not_responding' }),
  });

export const setActiveDelivery = async (requestId: string | null): Promise<void> => {
  await apiRequest('/deliveries/drivers/me/active', {
    method: 'PUT',
    body: JSON.stringify({ requestId }),
  });
};

export const getActiveDelivery = async (): Promise<string | null> => {
  const result = await apiRequest<{ requestId: string | null }>('/deliveries/drivers/me/active');
  return result.requestId;
};

export const listenForPendingRequests = (
  callback: (requests: DeliveryRequest[]) => void,
  options?: { intervalMs?: number }
): (() => void) => {
  let stopped = false;
  const intervalMs = options?.intervalMs ?? 2500;

  const tick = async () => {
    if (stopped) return;
    try {
      const [activeId, requests] = await Promise.all([getActiveDelivery(), getPendingRequests()]);
      // Uber-style: while on an active trip, never surface other offers
      if (activeId) {
        callback([]);
        return;
      }
      callback(requests);
    } catch (error) {
      // Quiet expected offline polls — avoid red LogBox toasts for users.
      callback([]);
    }
  };

  void tick();
  const interval = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
};
