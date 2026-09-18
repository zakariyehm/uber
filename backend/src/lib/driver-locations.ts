import { prisma } from './prisma.ts';
import type { DriverPresenceStatus } from './driver-presence.ts';
import { toH3 } from './driver-presence.ts';
import { haversineMeters, type LatLng } from './geo.ts';

/**
 * Persist last-known driver points (PostGIS when available, else lat/lng table).
 * Real-time matching still prefers Redis+H3; this is durable nearby fallback.
 */
export async function ensurePostgis() {
  // Always create the plain table first — matching works without PostGIS geometry.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        driver_user_id TEXT PRIMARY KEY,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        h3_index TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OFFLINE',
        vehicle_type TEXT NOT NULL DEFAULT 'MOTORCYCLE',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS driver_locations_h3_idx ON driver_locations (h3_index)
    `);
  } catch (error) {
    console.warn('[geo] driver_locations table setup failed:', error);
  }

  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE driver_locations
      ADD COLUMN IF NOT EXISTS geom geography(Point, 4326)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS driver_locations_geom_idx
      ON driver_locations USING GIST (geom)
    `);
  } catch (error) {
    console.warn('[geo] PostGIS geometry skipped (haversine fallback OK):', error);
  }
}

export async function persistDriverLocation(input: {
  driverUserId: string;
  latitude: number;
  longitude: number;
  status: DriverPresenceStatus;
  vehicleType: string;
}) {
  const h3Index = toH3(input.latitude, input.longitude);
  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO driver_locations (driver_user_id, latitude, longitude, h3_index, status, vehicle_type, updated_at, geom)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography)
      ON CONFLICT (driver_user_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        h3_index = EXCLUDED.h3_index,
        status = EXCLUDED.status,
        vehicle_type = EXCLUDED.vehicle_type,
        updated_at = NOW(),
        geom = EXCLUDED.geom
      `,
      input.driverUserId,
      input.latitude,
      input.longitude,
      h3Index,
      input.status,
      input.vehicleType
    );
  } catch {
    // Fallback without geography column / PostGIS
    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO driver_locations (driver_user_id, latitude, longitude, h3_index, status, vehicle_type, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (driver_user_id) DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          h3_index = EXCLUDED.h3_index,
          status = EXCLUDED.status,
          vehicle_type = EXCLUDED.vehicle_type,
          updated_at = NOW()
        `,
        input.driverUserId,
        input.latitude,
        input.longitude,
        h3Index,
        input.status,
        input.vehicleType
      );
    } catch (error) {
      console.warn('[geo] persistDriverLocation failed:', error);
    }
  }
}

/** PostGIS ST_DWithin nearby (meters), AVAILABLE only. */
export async function nearbyDriversPostgis(input: {
  pickup: LatLng;
  vehicleType?: string | null;
  radiusMeters?: number;
  limit?: number;
}): Promise<Array<{ driverUserId: string; latitude: number; longitude: number; distanceMeters: number }>> {
  const radius = input.radiusMeters ?? 5000;
  const limit = input.limit ?? 20;
  try {
    const rows = input.vehicleType
      ? await prisma.$queryRawUnsafe<
          Array<{ driver_user_id: string; latitude: number; longitude: number; distance_m: number }>
        >(
          `
          SELECT driver_user_id, latitude, longitude,
            ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
          FROM driver_locations
          WHERE status = 'AVAILABLE'
            AND vehicle_type = $3
            AND geom IS NOT NULL
            AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $4)
          ORDER BY distance_m ASC
          LIMIT $5
          `,
          input.pickup.longitude,
          input.pickup.latitude,
          input.vehicleType,
          radius,
          limit
        )
      : await prisma.$queryRawUnsafe<
          Array<{ driver_user_id: string; latitude: number; longitude: number; distance_m: number }>
        >(
          `
          SELECT driver_user_id, latitude, longitude,
            ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
          FROM driver_locations
          WHERE status = 'AVAILABLE'
            AND geom IS NOT NULL
            AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
          ORDER BY distance_m ASC
          LIMIT $4
          `,
          input.pickup.longitude,
          input.pickup.latitude,
          radius,
          limit
        );

    return rows.map((row) => ({
      driverUserId: row.driver_user_id,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      distanceMeters: Number(row.distance_m),
    }));
  } catch {
    // Haversine fallback on plain table
    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ driver_user_id: string; latitude: number; longitude: number }>
      >(
        `
        SELECT driver_user_id, latitude, longitude
        FROM driver_locations
        WHERE status = 'AVAILABLE'
          ${input.vehicleType ? 'AND vehicle_type = $1' : ''}
        `,
        ...(input.vehicleType ? [input.vehicleType] : [])
      );
      return rows
        .map((row) => ({
          driverUserId: row.driver_user_id,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          distanceMeters: haversineMeters(input.pickup, {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          }),
        }))
        .filter((row) => row.distanceMeters <= radius)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, limit);
    } catch {
      return [];
    }
  }
}
