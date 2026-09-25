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
  senderKind?: 'PERSONAL' | 'STORE' | string;
  storeId?: string;
  storeOrderCode?: string;
  storeBranchLocation?: string;
  itemType: string;
  deliveryMethod: string;
  vehicleType?: string;
  openToAllVehicleTypes?: boolean;
  deliveryPrice: string;
  distanceKm?: string;
  durationMinutes?: number;
  durationLabel?: string;
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
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  returnRequested?: boolean;
  returnRequestedAt?: string;
  payerType?: 'SENDER' | 'RECIPIENT' | string;
  paymentHoldStatus?: string;
  settlementType?: string;
  driverEarnings?: string;
  platformFee?: string;
  stateShare?: string;
  riderRefundPending?: string;
}

export type TripQuote = {
  pickupLocation: string;
  destinationLocation: string;
  distanceKm: number;
  durationMinutes: number;
  durationLabel: string;
  durationMinutesExpress?: number;
  durationLabelExpress?: string;
  fare: string;
  fareStandard?: string;
  fareExpress?: string;
  fareBicycle?: string;
  bicycleAvailable?: boolean;
  bicycleMaxKm?: number;
  expressSurcharge?: string;
  pricePerKm: string;
  pricePerKmBicycle?: string;
  breakdown: string;
  breakdownBicycle?: string;
};

function isBicycleOption(methodName: string) {
  const raw = methodName.toLowerCase();
  return /\bbicycle\b|\bbaaskiil\b/.test(raw) && !/motorbike|motorcycle/.test(raw);
}

export function bicycleOptionVisible(quote: TripQuote | null | undefined) {
  if (!quote) return false;
  if (typeof quote.bicycleAvailable === 'boolean') return quote.bicycleAvailable;
  return quote.distanceKm > 0 && quote.distanceKm <= (quote.bicycleMaxKm || 6);
}

export function fareForMotoOption(quote: TripQuote | null | undefined, methodName: string) {
  if (!quote) return null;
  if (isBicycleOption(methodName)) return quote.fareBicycle || quote.fare;
  if (/\bexpress\b/i.test(methodName)) return quote.fareExpress || quote.fare;
  return quote.fareStandard || quote.fare;
}

export function etaForMotoOption(quote: TripQuote | null | undefined, methodName: string) {
  if (!quote) return null;
  if (/\bexpress\b/i.test(methodName)) {
    return quote.durationLabelExpress || quote.durationLabel;
  }
  return quote.durationLabel;
}

export async function quoteDelivery(input: {
  pickupLocation: string;
  destinationLocation: string;
}): Promise<TripQuote> {
  return apiRequest<TripQuote>('/deliveries/quote', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const createDeliveryRequest = async (orderData: {
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
  senderKind?: 'PERSONAL' | 'STORE';
  storeId?: string;
  storeOrderCode?: string;
  storeBranchLocation?: string;
  payerType?: 'SENDER' | 'RECIPIENT';
  referenceId?: string;
}): Promise<DeliveryRequest> => {
  return apiRequest<DeliveryRequest>('/deliveries', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

export const getMyDeliveries = async (): Promise<DeliveryRequest[]> => {
  return apiRequest<DeliveryRequest[]>('/deliveries/mine');
};

export const getPendingRequests = async (): Promise<DeliveryRequest[]> => {
  return apiRequest<DeliveryRequest[]>('/deliveries/pending');
};

export const getDeliveryRequestByOrderId = async (orderId: string): Promise<DeliveryRequest | null> => {
  try {
    return await apiRequest<DeliveryRequest>(`/deliveries/order/${encodeURIComponent(orderId)}`);
  } catch (error: any) {
    if (error.status === 404) return null;
    console.error('Error getting delivery request:', error);
    return null;
  }
};

export const getDeliveryRequestById = async (requestId: string): Promise<DeliveryRequest | null> => {
  try {
    return await apiRequest<DeliveryRequest>(`/deliveries/${requestId}`);
  } catch (error: any) {
    if (error.status === 404) return null;
    console.error('Error getting delivery request:', error);
    return null;
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

export const acceptDeliveryRequest = async (
  requestId: string,
  driverId: string,
  driverName: string
): Promise<DeliveryRequest | null> => {
  return patchDelivery(requestId, 'accept', { driverId, driverName });
};

export const markAsPickedUp = async (requestId: string) => patchDelivery(requestId, 'picked_up');
export const startTrip = async (requestId: string) => patchDelivery(requestId, 'start');
export const completeDelivery = async (requestId: string) => patchDelivery(requestId, 'complete');
export const requestPayment = async (requestId: string) => patchDelivery(requestId, 'request_payment');
export const markDriverArrived = async (requestId: string) => patchDelivery(requestId, 'mark_arrived');
export const confirmDriverArrival = async (requestId: string) => patchDelivery(requestId, 'confirm_arrival');
export const confirmPackagePickup = async (requestId: string) => patchDelivery(requestId, 'confirm_pickup');
/** Store shortcut: one hold confirms package handed to the driver. */
export const confirmStoreHandoff = async (requestId: string) =>
  patchDelivery(requestId, 'confirm_store_handoff');
/** Store: confirm package returned after recipient not found. */
export const confirmStoreReturn = async (requestId: string) =>
  patchDelivery(requestId, 'confirm_store_return');
export const confirmDeliveryReceived = async (requestId: string) =>
  patchDelivery(requestId, 'confirm_received');

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
  callback: (requests: DeliveryRequest[]) => void
): (() => void) => {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const requests = await getPendingRequests();
      callback(requests);
    } catch (error) {
      console.error('[deliveryRequests] pending poll failed:', error);
      callback([]);
    }
  };

  void tick();
  const interval = setInterval(tick, 3000);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
};
