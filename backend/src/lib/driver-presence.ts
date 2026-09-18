import { cellToParent, gridDisk, latLngToCell } from 'h3-js';
import type { VehicleType } from '@prisma/client';
import { redis } from './redis.ts';
import { haversineMeters, type LatLng } from './geo.ts';

/** ~174m edge — city dispatch cells. */
export const H3_RES = 9;
/** Search rings: 0 = same cell, then expand. */
export const H3_RINGS = [0, 1, 2];

export type DriverPresenceStatus = 'AVAILABLE' | 'OFFERED' | 'BUSY' | 'OFFLINE';

export type DriverPresence = {
  driverUserId: string;
  latitude: number;
  longitude: number;
  h3Index: string;
  status: DriverPresenceStatus;
  vehicleType: VehicleType | string;
  offerId: string | null;
  updatedAt: number;
};

const keyPresence = (driverUserId: string) => `driver:presence:${driverUserId}`;
const keyCell = (h3Index: string) => `driver:h3:${h3Index}`;
/** Atomic offer lock — SET NX so two customers cannot OFFER the same driver. */
const keyOffered = (driverUserId: string) => `driver:offer:${driverUserId}`;

/**
 * Atomically claim a driver for one delivery only if status is AVAILABLE.
 * Uses Redis SET NX + Lua so concurrent customers cannot dual-offer.
 * Returns true only for the winning claimer.
 */
const CLAIM_LUA = `
local status = redis.call('HGET', KEYS[1], 'status')
if status ~= 'AVAILABLE' then return 0 end
local ok = redis.call('SET', KEYS[2], ARGV[1], 'NX', 'EX', tonumber(ARGV[2]))
if not ok then return 0 end
redis.call('HSET', KEYS[1], 'status', 'OFFERED', 'offerId', ARGV[1], 'updatedAt', ARGV[3])
return 1
`;

/**
 * Release offer lock only if it still belongs to expectedOfferId (or force when empty).
 * Prevents customer A from unlocking a driver that was re-claimed by customer B.
 */
const RELEASE_LUA = `
local expected = ARGV[1]
local nextStatus = ARGV[2]
local now = ARGV[3]
local currentOffer = redis.call('HGET', KEYS[1], 'offerId') or ''
local lockOffer = redis.call('GET', KEYS[2]) or ''
if expected ~= '' then
  if currentOffer ~= '' and currentOffer ~= expected then return 0 end
  if lockOffer ~= '' and lockOffer ~= expected then return 0 end
end
redis.call('DEL', KEYS[2])
if nextStatus == 'OFFLINE' then
  local h3 = redis.call('HGET', KEYS[1], 'h3Index')
  if h3 and h3 ~= '' then
    redis.call('SREM', 'driver:h3:' .. h3, ARGV[4])
  end
  redis.call('DEL', KEYS[1])
else
  redis.call('HSET', KEYS[1], 'status', nextStatus, 'offerId', '', 'updatedAt', now)
end
return 1
`;

function parsePresence(driverUserId: string, raw: Record<string, string>): DriverPresence | null {
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    driverUserId,
    latitude,
    longitude,
    h3Index: raw.h3Index || '',
    status: (raw.status as DriverPresenceStatus) || 'OFFLINE',
    vehicleType: raw.vehicleType || 'MOTORCYCLE',
    offerId: raw.offerId || null,
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

export function toH3(latitude: number, longitude: number, res = H3_RES) {
  return latLngToCell(latitude, longitude, res);
}

export async function getDriverPresence(driverUserId: string): Promise<DriverPresence | null> {
  try {
    const raw = await redis.hgetall(keyPresence(driverUserId));
    if (!raw || Object.keys(raw).length === 0) return null;
    return parsePresence(driverUserId, raw);
  } catch {
    return null;
  }
}

/** Upsert live location + H3 cell membership. */
export async function upsertDriverPresence(input: {
  driverUserId: string;
  latitude: number;
  longitude: number;
  vehicleType: VehicleType | string;
  status?: DriverPresenceStatus;
  offerId?: string | null;
}) {
  const h3Index = toH3(input.latitude, input.longitude);
  const prev = await getDriverPresence(input.driverUserId);
  const status = input.status ?? prev?.status ?? 'AVAILABLE';
  const offerId =
    input.offerId !== undefined ? input.offerId : status === 'OFFERED' ? prev?.offerId ?? null : null;

  const pipe = redis.pipeline();
  if (prev?.h3Index && prev.h3Index !== h3Index) {
    pipe.srem(keyCell(prev.h3Index), input.driverUserId);
  }
  if (status === 'OFFLINE') {
    if (prev?.h3Index) pipe.srem(keyCell(prev.h3Index), input.driverUserId);
    pipe.del(keyPresence(input.driverUserId));
    pipe.del(keyOffered(input.driverUserId));
  } else {
    pipe.hset(keyPresence(input.driverUserId), {
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      h3Index,
      status,
      vehicleType: String(input.vehicleType),
      offerId: offerId || '',
      updatedAt: String(Date.now()),
    });
    pipe.sadd(keyCell(h3Index), input.driverUserId);
    if (status === 'OFFERED' && offerId) {
      pipe.set(keyOffered(input.driverUserId), offerId, 'EX', 45);
    } else {
      pipe.del(keyOffered(input.driverUserId));
    }
  }
  await pipe.exec().catch(() => null);
  return getDriverPresence(input.driverUserId);
}

export async function setDriverPresenceStatus(
  driverUserId: string,
  status: DriverPresenceStatus,
  offerId: string | null = null
) {
  const prev = await getDriverPresence(driverUserId);
  if (!prev) return null;
  return upsertDriverPresence({
    driverUserId,
    latitude: prev.latitude,
    longitude: prev.longitude,
    vehicleType: prev.vehicleType,
    status,
    offerId,
  });
}

/**
 * Race-safe claim: only one delivery wins OFFERED for this driver.
 * TTL on the lock key matches offer window (+ small grace).
 */
export async function claimDriverForOffer(
  driverUserId: string,
  deliveryId: string,
  ttlSec: number
): Promise<boolean> {
  try {
    const result = await redis.eval(
      CLAIM_LUA,
      2,
      keyPresence(driverUserId),
      keyOffered(driverUserId),
      deliveryId,
      String(Math.max(1, Math.ceil(ttlSec))),
      String(Date.now())
    );
    return Number(result) === 1;
  } catch {
    // Redis down → best-effort non-atomic fallback (still better than dual silent).
    const prev = await getDriverPresence(driverUserId);
    if (!prev || prev.status !== 'AVAILABLE') return false;
    await upsertDriverPresence({
      driverUserId,
      latitude: prev.latitude,
      longitude: prev.longitude,
      vehicleType: prev.vehicleType,
      status: 'OFFERED',
      offerId: deliveryId,
    });
    return true;
  }
}

/** Unlock OFFERED → AVAILABLE/OFFLINE only if this delivery still owns the lock. */
export async function releaseDriverOffer(
  driverUserId: string,
  expectedOfferId: string | null,
  nextStatus: 'AVAILABLE' | 'OFFLINE' = 'AVAILABLE'
): Promise<boolean> {
  try {
    const result = await redis.eval(
      RELEASE_LUA,
      2,
      keyPresence(driverUserId),
      keyOffered(driverUserId),
      expectedOfferId || '',
      nextStatus,
      String(Date.now()),
      driverUserId
    );
    return Number(result) === 1;
  } catch {
    await setDriverPresenceStatus(driverUserId, nextStatus, null);
    return true;
  }
}

export async function clearDriverPresence(driverUserId: string) {
  const prev = await getDriverPresence(driverUserId);
  const pipe = redis.pipeline();
  if (prev?.h3Index) pipe.srem(keyCell(prev.h3Index), driverUserId);
  pipe.del(keyPresence(driverUserId));
  pipe.del(keyOffered(driverUserId));
  await pipe.exec().catch(() => null);
}
/** Collect AVAILABLE drivers near a pickup, closest first (Uber/Bolt style). */
export async function findNearbyAvailableDrivers(input: {
  pickup: LatLng;
  vehicleType?: VehicleType | string | null;
  excludeIds?: string[];
  maxResults?: number;
}): Promise<Array<DriverPresence & { distanceMeters: number }>> {
  const exclude = new Set(input.excludeIds || []);
  const origin = toH3(input.pickup.latitude, input.pickup.longitude);
  const seen = new Set<string>();
  const candidates: Array<DriverPresence & { distanceMeters: number }> = [];

  for (const ring of H3_RINGS) {
    let cells: string[] = [];
    try {
      cells = ring === 0 ? [origin] : gridDisk(origin, ring);
    } catch {
      cells = [origin];
    }

    for (const cell of cells) {
      let members: string[] = [];
      try {
        members = await redis.smembers(keyCell(cell));
      } catch {
        members = [];
      }
      for (const driverUserId of members) {
        if (seen.has(driverUserId) || exclude.has(driverUserId)) continue;
        seen.add(driverUserId);
        const presence = await getDriverPresence(driverUserId);
        if (!presence) continue;
        if (presence.status !== 'AVAILABLE') continue;
        if (input.vehicleType && presence.vehicleType !== input.vehicleType) continue;
        // Stale heartbeat (>90s) → skip
        if (presence.updatedAt && Date.now() - presence.updatedAt > 90_000) continue;

        candidates.push({
          ...presence,
          distanceMeters: haversineMeters(input.pickup, {
            latitude: presence.latitude,
            longitude: presence.longitude,
          }),
        });
      }
    }

    if (candidates.length >= (input.maxResults || 20)) break;
  }

  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return candidates.slice(0, input.maxResults || 20);
}

/** Parent cell helper if we ever coarsen search. */
export function parentCell(h3Index: string, res = H3_RES - 1) {
  try {
    return cellToParent(h3Index, res);
  } catch {
    return h3Index;
  }
}
