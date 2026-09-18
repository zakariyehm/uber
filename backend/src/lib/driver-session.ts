import { DeliveryStatus } from '@prisma/client';
import { prisma } from './prisma.ts';
import { clearDriverPresence, getDriverPresence } from './driver-presence.ts';
import { persistDriverLocation } from './driver-locations.ts';

/**
 * Uber-style: disabled / deleted drivers are fully offline —
 * no Redis presence, no AVAILABLE location, no pending offers.
 */
export async function forceDriverFullyOffline(driverUserId: string) {
  await prisma.driverProfile.updateMany({
    where: { userId: driverUserId },
    data: { isOnline: false },
  });

  const presence = await getDriverPresence(driverUserId);
  await clearDriverPresence(driverUserId);

  if (presence) {
    await persistDriverLocation({
      driverUserId,
      latitude: presence.latitude,
      longitude: presence.longitude,
      status: 'OFFLINE',
      vehicleType: String(presence.vehicleType),
    }).catch(() => null);
  } else {
    await prisma
      .$executeRawUnsafe(
        `UPDATE driver_locations SET status = 'OFFLINE', updated_at = NOW() WHERE driver_user_id = $1`,
        driverUserId
      )
      .catch(() => null);
  }

  // Drop any in-flight offer so the trip can rotate to another driver.
  await prisma.deliveryRequest.updateMany({
    where: {
      offeredToDriverId: driverUserId,
      status: DeliveryStatus.PENDING,
    },
    data: {
      offeredToDriverId: null,
      offerExpiresAt: null,
    },
  });
}

/** Keep only active driver accounts in an offer candidate list. */
export async function filterActiveDriverIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      role: 'DRIVER',
    },
    select: { id: true },
  });
  const active = new Set(rows.map((r) => r.id));
  return ids.filter((id) => active.has(id));
}
