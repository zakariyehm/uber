import { DeliveryStatus, VehicleType, type DeliveryRequest as DbDelivery } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';
import { resolvePickupCoords } from '../../lib/geo.ts';
import {
  claimDriverForOffer,
  findNearbyAvailableDrivers,
  releaseDriverOffer,
  setDriverPresenceStatus,
} from '../../lib/driver-presence.ts';
import { nearbyDriversPostgis, persistDriverLocation } from '../../lib/driver-locations.ts';
import { getDriverPresence } from '../../lib/driver-presence.ts';
import { allocateOrderId } from '../../utils/order-id.ts';
import { toDeliveryDto } from '../../utils/delivery-mapper.ts';
import { isOpenFleetMethod, resolveVehicleTypeForMethod } from '../../utils/vehicle-type.ts';
import { filterActiveDriverIds } from '../../lib/driver-session.ts';

/** Uber-style: each online driver gets 30s to accept/decline, then offer rotates. */
export const OFFER_TTL_SEC = 30;
/** After every online driver declines/times out, wait this long before looping back to driver 1. */
export const OFFER_CYCLE_PAUSE_SEC = 60;
/** Max time searching for a driver before system cancel + API_PREAUTHORIZE_CANCEL. */
export const SEARCH_TIMEOUT_SEC = 90;
/** When every matching driver is offline, cancel after this short grace. */
export const OFFLINE_CANCEL_GRACE_SEC = 20;

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

async function listOnlineAvailableDrivers(vehicleType?: VehicleType | null): Promise<string[]> {
  const profiles = await prisma.driverProfile.findMany({
    where: {
      isOnline: true,
      user: { isActive: true },
      ...(vehicleType ? { vehicleType } : {}),
    },
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

/**
 * Closest-first pool (Uber/Bolt):
 * Redis+H3 live presence → PostGIS fallback → legacy online list.
 * Drivers in OFFERED/BUSY are excluded so one driver is never dual-offered.
 */
async function listRankedAvailableDrivers(
  delivery: DbDelivery,
  declinedIds: string[] = []
): Promise<string[]> {
  const pickup = resolvePickupCoords({
    pickupLat: (delivery as DbDelivery & { pickupLat?: number | null }).pickupLat,
    pickupLng: (delivery as DbDelivery & { pickupLng?: number | null }).pickupLng,
    pickupLocation: delivery.pickupLocation,
  });

  const exclude = new Set(declinedIds);
  const busyFiltered: string[] = [];

  if (pickup) {
    const nearby = await findNearbyAvailableDrivers({
      pickup,
      vehicleType: delivery.vehicleType,
      excludeIds: [...exclude],
      maxResults: 30,
    });

    for (const row of nearby) {
      if (exclude.has(row.driverUserId)) continue;
      const busy = await getBusyActiveRequestId(row.driverUserId);
      if (busy) continue;
      busyFiltered.push(row.driverUserId);
    }

    if (busyFiltered.length === 0) {
      const postgis = await nearbyDriversPostgis({
        pickup,
        vehicleType: delivery.vehicleType,
        radiusMeters: 8000,
        limit: 30,
      });
      for (const row of postgis) {
        if (exclude.has(row.driverUserId) || busyFiltered.includes(row.driverUserId)) continue;
        const profile = await prisma.driverProfile.findUnique({
          where: { userId: row.driverUserId },
          select: { isOnline: true, vehicleType: true },
        });
        if (!profile?.isOnline) continue;
        if (profile.vehicleType !== delivery.vehicleType) continue;
        const busy = await getBusyActiveRequestId(row.driverUserId);
        if (busy) continue;
        busyFiltered.push(row.driverUserId);
      }
    }
  }

  if (busyFiltered.length > 0) {
    return filterActiveDriverIds(busyFiltered);
  }

  // No GPS pool → legacy online FIFO (still skip declined/busy/inactive).
  const legacy = await listOnlineAvailableDrivers(delivery.vehicleType);
  return legacy.filter((id) => !exclude.has(id));
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

/**
 * Claim Redis lock FIRST (atomic NX), then write Postgres.
 * If another customer already claimed this driver, returns null → try next.
 */
async function assignOfferToDriver(
  deliveryId: string,
  driverUserId: string,
  declinedIds: string[],
  previousDriverId: string | null = null
): Promise<DbDelivery | null> {
  const claimed = await claimDriverForOffer(driverUserId, deliveryId, OFFER_TTL_SEC + 5);
  if (!claimed) return null;

  const expiresAt = new Date(Date.now() + OFFER_TTL_SEC * 1000);
  const where =
    previousDriverId != null
      ? {
          id: deliveryId,
          status: DeliveryStatus.PENDING,
          offeredToDriverId: previousDriverId,
        }
      : {
          id: deliveryId,
          status: DeliveryStatus.PENDING,
          OR: [
            { offeredToDriverId: null },
            { offerExpiresAt: { lte: new Date() } },
          ],
        };

  const updated = await prisma.deliveryRequest.updateMany({
    where,
    data: {
      offeredToDriverId: driverUserId,
      offerExpiresAt: expiresAt,
      offerDeclinedIds: serializeDeclinedIds(declinedIds),
    },
  });

  if (updated.count === 0) {
    await releaseDriverOffer(driverUserId, deliveryId, 'AVAILABLE');
    return null;
  }

  // Keep PostGIS in sync so fallback nearby also skips OFFERED drivers.
  const presence = await getDriverPresence(driverUserId);
  if (presence) {
    await persistDriverLocation({
      driverUserId,
      latitude: presence.latitude,
      longitude: presence.longitude,
      status: 'OFFERED',
      vehicleType: String(presence.vehicleType),
    }).catch(() => null);
  }

  return prisma.deliveryRequest.findUniqueOrThrow({ where: { id: deliveryId } });
}

async function releaseOfferLock(
  driverUserId: string | null | undefined,
  expectedOfferId: string | null = null
) {
  if (!driverUserId) return;
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: driverUserId },
    select: { isOnline: true, vehicleType: true },
  });
  const nextStatus = profile?.isOnline ? 'AVAILABLE' : 'OFFLINE';
  await releaseDriverOffer(driverUserId, expectedOfferId, nextStatus);

  const presence = await getDriverPresence(driverUserId);
  if (presence && profile) {
    await persistDriverLocation({
      driverUserId,
      latitude: presence.latitude,
      longitude: presence.longitude,
      status: nextStatus,
      vehicleType: String(profile.vehicleType),
    }).catch(() => null);
  }
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

/** Pause briefly when no drivers are online; resume when offerExpiresAt passes. */
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

function isSearchTimedOut(delivery: DbDelivery, now = Date.now()) {
  return now - delivery.createdAt.getTime() >= SEARCH_TIMEOUT_SEC * 1000;
}

function isOfflineGraceElapsed(delivery: DbDelivery, now = Date.now()) {
  return now - delivery.createdAt.getTime() >= OFFLINE_CANCEL_GRACE_SEC * 1000;
}

/** True online + active drivers for this request (ignores declined/busy — offline check only). */
async function countOnlineMatchingDrivers(delivery: DbDelivery): Promise<number> {
  if (await isOpenFleetMethod(delivery.deliveryMethod)) {
    return prisma.driverProfile.count({
      where: {
        isOnline: true,
        user: { isActive: true },
        vehicleType: { in: [VehicleType.MOTORCYCLE, VehicleType.BICYCLE] },
      },
    });
  }
  return prisma.driverProfile.count({
    where: {
      isOnline: true,
      user: { isActive: true },
      ...(delivery.vehicleType ? { vehicleType: delivery.vehicleType } : {}),
    },
  });
}

/**
 * No driver available: cancel the trip and release the Waafi preauth hold
 * (API_PREAUTHORIZE_CANCEL). Rider is not charged; no wallet credit.
 */
export async function cancelForNoDriver(deliveryId: string): Promise<DbDelivery> {
  try {
    await applyDeliveryAction(deliveryId, 'cancel', undefined, {
      cancelledBy: 'system',
      cancelReason: 'no_driver',
    });
  } catch (error) {
    console.warn('[no-driver] cancel failed', deliveryId, error);
  }
  return prisma.deliveryRequest.findUniqueOrThrow({ where: { id: deliveryId } });
}

/** Expire stale offers and assign/rotate to the next online driver. */
export async function ensureOfferAssignment(delivery: DbDelivery): Promise<DbDelivery> {
  if (delivery.status !== DeliveryStatus.PENDING) return delivery;

  // Search window elapsed with no accept → cancel + release hold.
  if (isSearchTimedOut(delivery)) {
    return cancelForNoDriver(delivery.id);
  }

  const openFleet = await isOpenFleetMethod(delivery.deliveryMethod);
  const onlineMatching = await countOnlineMatchingDrivers(delivery);

  // Every matching driver is offline → same cancel + API_PREAUTHORIZE_CANCEL.
  if (onlineMatching === 0 && isOfflineGraceElapsed(delivery)) {
    return cancelForNoDriver(delivery.id);
  }

  // Delivery State: every online motorcycle and bicycle driver can see the same offer.
  if (openFleet) return delivery;

  const now = Date.now();
  const expiresAt = delivery.offerExpiresAt?.getTime() ?? 0;

  // Active offer still within its 30s window — keep if driver still eligible.
  if (delivery.offeredToDriverId && expiresAt > now + 250) {
    const offered = await prisma.driverProfile.findUnique({
      where: { userId: delivery.offeredToDriverId },
      select: {
        vehicleType: true,
        isOnline: true,
        user: { select: { isActive: true } },
      },
    });
    if (
      offered?.isOnline &&
      offered.user.isActive &&
      offered.vehicleType === delivery.vehicleType
    ) {
      return delivery;
    }
  }

  // Waiting briefly for a driver to come online — keep until offline grace / search timeout.
  if (isCyclePaused(delivery, now) && onlineMatching === 0) return delivery;

  const expiredOffer =
    Boolean(delivery.offeredToDriverId) && expiresAt > 0 && expiresAt <= now;
  const midWindowReassign =
    Boolean(delivery.offeredToDriverId) && expiresAt > now + 250;

  // OFFERED → EXPIRED → AVAILABLE before rotating.
  if ((expiredOffer || midWindowReassign) && delivery.offeredToDriverId) {
    await releaseOfferLock(delivery.offeredToDriverId, delivery.id);
  }

  const declinedIds = parseDeclinedIds(delivery.offerDeclinedIds);
  const resumingAfterPause = !delivery.offeredToDriverId && expiresAt > 0 && expiresAt <= now;

  let nextDeclined = resumingAfterPause ? [] : [...declinedIds];
  if (expiredOffer && delivery.offeredToDriverId) {
    nextDeclined.push(delivery.offeredToDriverId);
  }

  const candidates = await listRankedAvailableDrivers(delivery, nextDeclined);

  // No free candidate left.
  if (candidates.length === 0) {
    // Still nobody online → wait grace, then cancel (handled above on next tick too).
    if (onlineMatching === 0) {
      if (isOfflineGraceElapsed(delivery)) return cancelForNoDriver(delivery.id);
      return clearOffer(delivery.id, nextDeclined);
    }
    // Drivers are online but all declined / unavailable → cancel + release hold.
    if (nextDeclined.length > 0) {
      return cancelForNoDriver(delivery.id);
    }
    return clearOffer(delivery.id, nextDeclined);
  }

  // Optimistic concurrency: only succeed if DB still shows this previous offered driver.
  const dbExpected = delivery.offeredToDriverId;

  for (const candidate of candidates) {
    const assigned = await assignOfferToDriver(
      delivery.id,
      candidate,
      nextDeclined,
      dbExpected
    );
    if (assigned) return assigned;

    // Another worker may have already assigned this delivery — respect that.
    const fresh = await prisma.deliveryRequest.findUnique({ where: { id: delivery.id } });
    if (
      fresh &&
      fresh.status === DeliveryStatus.PENDING &&
      fresh.offeredToDriverId &&
      fresh.offerExpiresAt &&
      fresh.offerExpiresAt.getTime() > Date.now() + 250
    ) {
      return fresh;
    }
    // Redis NX lost (another customer claimed this driver) → try next closest.
  }

  return clearOffer(delivery.id, nextDeclined);
}

export async function createDelivery(
  input: {
    orderId?: string;
    pickupLocation: string;
    pickupLat?: number;
    pickupLng?: number;
    destinationLocation: string;
    recipientName: string;
    recipientNumber: string;
    itemType: string;
    deliveryMethod: string;
    deliveryPrice: string;
    senderName?: string;
    senderPhone?: string;
    payerType?: 'SENDER' | 'RECIPIENT';
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
  const pickupCoords = resolvePickupCoords({
    pickupLat: input.pickupLat,
    pickupLng: input.pickupLng,
    pickupLocation: input.pickupLocation,
  });

  const normalizePhone = (phone: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('252')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  };
  const senderDigits = normalizePhone(input.senderPhone || '');
  const recipientDigits = normalizePhone(input.recipientNumber || '');
  if (
    senderDigits.length >= 7 &&
    recipientDigits.length >= 7 &&
    senderDigits === recipientDigits
  ) {
    const error = new Error(
      'Sender and recipient must use two different phone numbers'
    ) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const { PaymentHoldStatus, PaymentPayer } = await import('@prisma/client');
  const openFleet = await isOpenFleetMethod(input.deliveryMethod);
  // Delivery State always charges the sender — ignore recipient-pays.
  const payerType =
    openFleet || input.payerType !== 'RECIPIENT'
      ? PaymentPayer.SENDER
      : PaymentPayer.RECIPIENT;

  // Recipient pays at dropoff — create + offer with no Waafi hold.
  if (payerType === PaymentPayer.RECIPIENT) {
    const recipientPhone = input.recipientNumber?.trim() || '';
    if (!recipientPhone) {
      const error = new Error('Recipient phone is required when recipient pays') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    const row = await prisma.deliveryRequest.create({
      data: {
        orderId,
        pickupLocation: input.pickupLocation,
        pickupLat: pickupCoords?.latitude,
        pickupLng: pickupCoords?.longitude,
        destinationLocation: input.destinationLocation,
        recipientName: input.recipientName,
        recipientNumber: recipientPhone,
        senderName: input.senderName,
        senderPhone: input.senderPhone?.trim() || null,
        payerType,
        itemType: input.itemType,
        deliveryMethod: input.deliveryMethod,
        vehicleType: await resolveVehicleTypeForMethod(input.deliveryMethod),
        deliveryPrice: amount,
        referenceId: input.referenceId,
        deliveryTimeLabel: input.deliveryTimeLabel,
        riderUserId,
        paymentHoldStatus: PaymentHoldStatus.NONE,
      },
    });

    const offered = await ensureOfferAssignment(row);
    return toDeliveryDto(offered);
  }

  // Sender pays — hold Waafi at checkout (existing flow).
  let payerPhone = input.senderPhone?.trim() || '';
  if (!payerPhone && riderUserId) {
    const rider = await prisma.user.findUnique({
      where: { id: riderUserId },
      select: { phone: true },
    });
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
      pickupLat: pickupCoords?.latitude,
      pickupLng: pickupCoords?.longitude,
      destinationLocation: input.destinationLocation,
      recipientName: input.recipientName,
      recipientNumber: input.recipientNumber,
      senderName: input.senderName,
      senderPhone: input.senderPhone || payerPhone,
      payerType,
      itemType: input.itemType,
      deliveryMethod: input.deliveryMethod,
      vehicleType: await resolveVehicleTypeForMethod(input.deliveryMethod),
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

  const user = await prisma.user.findUnique({
    where: { id: driverUserId },
    select: {
      isActive: true,
      driverProfile: { select: { vehicleType: true, isOnline: true } },
    },
  });
  if (!user?.isActive || !user.driverProfile?.isOnline) return [];

  const profile = user.driverProfile;

  const rows = await prisma.deliveryRequest.findMany({
    where: { status: DeliveryStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  });

  const mine = [];
  for (const row of rows) {
    const declinedIds = parseDeclinedIds(row.offerDeclinedIds);
    if (declinedIds.includes(driverUserId)) continue;

    if (await isOpenFleetMethod(row.deliveryMethod)) {
      mine.push(toDeliveryDto(row));
      continue;
    }

    if (row.vehicleType !== profile.vehicleType) continue;

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

  const openFleet = await isOpenFleetMethod(row.deliveryMethod);
  if (!openFleet && row.offeredToDriverId && row.offeredToDriverId !== driverUserId) {
    const error = new Error('This offer is assigned to another driver') as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }

  const declinedIds = parseDeclinedIds(row.offerDeclinedIds);
  declinedIds.push(driverUserId);
  await releaseOfferLock(driverUserId, deliveryId);

  if (openFleet) {
    await prisma.deliveryRequest.update({
      where: { id: deliveryId },
      data: {
        offeredToDriverId: null,
        offerExpiresAt: null,
        offerDeclinedIds: serializeDeclinedIds(declinedIds),
      },
    });
    return {
      ok: true,
      rotatedTo: null,
      offerSeconds: OFFER_TTL_SEC,
      cyclePaused: false,
    };
  }

  const nextDeclined = [...new Set(declinedIds)];
  const candidates = await listRankedAvailableDrivers(row, nextDeclined);
  const onlineMatching = await countOnlineMatchingDrivers(row);

  // Nobody online at all → cancel + release Waafi hold (same as search timeout).
  if (onlineMatching === 0) {
    await cancelForNoDriver(deliveryId);
    return {
      ok: true,
      rotatedTo: null,
      offerSeconds: 0,
      cyclePaused: false,
      cancelled: true,
      cancelReason: 'no_driver',
    };
  }

  // Online drivers remain but all have declined / none free → cancel.
  if (candidates.length === 0) {
    await cancelForNoDriver(deliveryId);
    return {
      ok: true,
      rotatedTo: null,
      offerSeconds: 0,
      cyclePaused: false,
      cancelled: true,
      cancelReason: 'no_driver',
    };
  }

  for (const nextDriver of candidates) {
    // DB still shows the declining driver until we successfully rotate.
    const assigned = await assignOfferToDriver(
      deliveryId,
      nextDriver,
      nextDeclined,
      driverUserId
    );
    if (assigned) {
      return {
        ok: true,
        rotatedTo: assigned.offeredToDriverId,
        offerSeconds: OFFER_TTL_SEC,
        cyclePaused: false,
      };
    }
  }

  await cancelForNoDriver(deliveryId);
  return {
    ok: true,
    rotatedTo: null,
    offerSeconds: 0,
    cyclePaused: false,
    cancelled: true,
    cancelReason: 'no_driver',
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

    const openFleet = await isOpenFleetMethod(current.deliveryMethod);
    if (!openFleet && current.offeredToDriverId && current.offeredToDriverId !== actor.id) {
      const error = new Error('This offer is assigned to another driver') as Error & {
        statusCode?: number;
      };
      error.statusCode = 409;
      throw error;
    }
    if (
      !openFleet &&
      current.offerExpiresAt &&
      current.offerExpiresAt.getTime() < Date.now() - 2000
    ) {
      const error = new Error('Offer timed out') as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { userId: actor.id },
      select: { vehicleType: true },
    });
    if (!profile || (!openFleet && profile.vehicleType !== current.vehicleType)) {
      const needed = current.vehicleType === VehicleType.BICYCLE ? 'bicycle' : 'motorcycle';
      const error = new Error(`This trip is for a ${needed} driver`) as Error & { statusCode?: number };
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

    await setDriverPresenceStatus(actor.id, 'BUSY', null);

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
      if (current.payerType !== 'RECIPIENT') {
        fail('Request payment is only for recipient-pays orders');
      }
      if (
        current.status !== DeliveryStatus.IN_TRANSIT &&
        current.status !== DeliveryStatus.COMPLETED
      ) {
        fail('Request payment only when delivering to the recipient');
      }
      if (current.paymentHoldStatus === 'COMMITTED' || current.settlementType !== 'NONE') {
        fail('Payment already collected');
      }
      data.paymentRequested = true;
      data.paymentRequestedAt = current.paymentRequestedAt || now;
      break;
    }
    case 'complete': {
      if (current.status !== DeliveryStatus.IN_TRANSIT) fail('Complete only during an active trip');
      // Recipient-pays: driver must collect Waafi from recipient before completing.
      if (
        current.payerType === 'RECIPIENT' &&
        current.paymentHoldStatus !== 'COMMITTED'
      ) {
        fail('Request payment from the recipient before completing');
      }
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

  if (action === 'complete' && row.driverUserId) {
    const { isOpenFleetMethod } = await import('../../utils/vehicle-type.ts');
    if (await isOpenFleetMethod(row.deliveryMethod)) {
      const { settleFullTrip } = await import('../payments/payment.settlement.ts');
      await settleFullTrip(id);
      return getById(id);
    }
  }

  if (action === 'request_payment') {
    const { chargeRecipientAndSettle } = await import('../payments/payment.settlement.ts');
    await chargeRecipientAndSettle(id);
    await prisma.driverActiveDelivery.updateMany({
      where: { requestId: id },
      data: { requestId: null },
    });
    const unlockId = row.driverUserId || current.offeredToDriverId || actor?.id;
    await releaseOfferLock(unlockId, id);
    return getById(id);
  }

  if (action === 'confirm_received' || action === 'cancel') {
    await prisma.driverActiveDelivery.updateMany({
      where: { requestId: id },
      data: { requestId: null },
    });
    const unlockId = row.driverUserId || current.offeredToDriverId || actor?.id;
    await releaseOfferLock(unlockId, id);
  }

  if (action === 'confirm_received' && row.driverUserId) {
    const { settleFullTrip } = await import('../payments/payment.settlement.ts');
    await settleFullTrip(id);
    return getById(id);
  }

  if (action === 'cancel') {
    const { settleNoShow, releasePaymentHold } = await import('../payments/payment.settlement.ts');
    if (row.cancelReason === 'no_show') {
      // Recipient-pays with no hold: cancel only — no Waafi / no $0.50 capture.
      if (row.paymentHoldStatus === 'HELD') {
        await settleNoShow(id);
      }
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
