import {
  geocodeLocationLabel,
  haversineMeters,
  resolvePickupCoords,
  type LatLng,
} from './geo.ts';

/** Standard Moto: $0.50 per kilometre on every local trip. */
export const PRICE_PER_KM_STANDARD = 0.5;
/** Express Moto: faster pickup, added on top of the distance fare. */
export const EXPRESS_SURCHARGE = 0.5;
/** Bicycle trips: flat $0.30 per kilometre (cheaper than Standard moto). */
export const PRICE_PER_KM_BICYCLE = 0.3;
/** Bicycle only appears for short trips. */
export const BICYCLE_MAX_KM = 6;

export function bicycleAvailableForKm(distanceKm: number) {
  return Number.isFinite(distanceKm) && distanceKm > 0 && distanceKm <= BICYCLE_MAX_KM;
}

export function isExpressMethod(deliveryMethod?: string | null) {
  return /\bexpress\b/i.test(String(deliveryMethod || ''));
}

export function isBicycleMethod(deliveryMethod?: string | null) {
  const raw = String(deliveryMethod || '').toLowerCase();
  return /\bbicycle\b|\bbaaskiil\b/.test(raw) && !/motorbike|motorcycle/.test(raw);
}

/** Express arrives ~2 minutes sooner (5 min Standard → 3 min Express). */
export function expressDurationMinutes(standardMinutes: number) {
  return Math.max(2, standardMinutes - 2);
}

export function bicycleFareFromKm(distanceKm: number) {
  return Math.round(distanceKm * PRICE_PER_KM_BICYCLE * 100) / 100;
}

export function applyMotoTier(baseFare: number, deliveryMethod?: string | null) {
  const fare = isExpressMethod(deliveryMethod)
    ? Math.round((baseFare + EXPRESS_SURCHARGE) * 100) / 100
    : baseFare;
  return {
    fare,
    fareLabel: fare.toFixed(2),
    express: isExpressMethod(deliveryMethod),
    surcharge: isExpressMethod(deliveryMethod) ? EXPRESS_SURCHARGE : 0,
  };
}

export function applyQuotedFare(
  quote: { fare: number; distanceKm: number },
  deliveryMethod?: string | null
) {
  if (isBicycleMethod(deliveryMethod)) {
    const fare = bicycleFareFromKm(quote.distanceKm);
    return {
      fare,
      fareLabel: fare.toFixed(2),
      bicycle: true,
      express: false,
      surcharge: 0,
    };
  }
  return { ...applyMotoTier(quote.fare, deliveryMethod), bicycle: false };
}
/** Roads are not straight — bump straight-line distance toward a real route. */
const ROAD_FACTOR = 1.25;
/** Typical Mogadishu moto/bike speed when Directions is unavailable. */
const AVG_SPEED_KMH = 22;
/** Same-district different neighborhood — district-center geocode would be 0 km. */
const SAME_DISTRICT_KM = 2;
const MIN_TRIP_KM = 1;
const MIN_MINUTES = 4;

export type TripQuote = {
  pickup: LatLng;
  destination: LatLng;
  distanceKm: number;
  durationMinutes: number;
  durationLabel: string;
  fare: number;
  fareLabel: string;
  pricePerKm: number;
  pricePerKmLabel: string;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function roundKm(n: number) {
  return Math.round(n * 10) / 10;
}

function districtHead(location: string) {
  return (location.split(',')[0] || location).trim().toLowerCase();
}

function fallbackKm(input: {
  pickupLocation: string;
  destinationLocation: string;
  pickup: LatLng;
  destination: LatLng;
}) {
  let km = (haversineMeters(input.pickup, input.destination) / 1000) * ROAD_FACTOR;
  if (km < 0.3) {
    const samePlace =
      input.pickupLocation.trim().toLowerCase() ===
      input.destinationLocation.trim().toLowerCase();
    const sameDistrict =
      districtHead(input.pickupLocation) === districtHead(input.destinationLocation);
    km = samePlace || sameDistrict ? SAME_DISTRICT_KM : MIN_TRIP_KM;
  }
  return km;
}

async function routeViaGoogle(
  a: LatLng,
  b: LatLng
): Promise<{ meters: number; seconds: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${a.latitude},${a.longitude}` +
      `&destination=${b.latitude},${b.longitude}` +
      `&mode=driving&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: Array<{ legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }> }>;
    };
    const leg = json.routes?.[0]?.legs?.[0];
    const meters = Number(leg?.distance?.value);
    const seconds = Number(leg?.duration?.value);
    if (!Number.isFinite(meters) || meters <= 0) return null;
    return { meters, seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 0 };
  } catch {
    return null;
  }
}

export async function quoteTrip(input: {
  pickupLocation: string;
  destinationLocation: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
}): Promise<TripQuote | null> {
  const pickup = resolvePickupCoords({
    pickupLat: input.pickupLat,
    pickupLng: input.pickupLng,
    pickupLocation: input.pickupLocation,
  });
  const destination = geocodeLocationLabel(input.destinationLocation);
  if (!pickup || !destination) return null;

  const routed = await routeViaGoogle(pickup, destination);
  const km = routed
    ? routed.meters / 1000
    : fallbackKm({
        pickupLocation: input.pickupLocation,
        destinationLocation: input.destinationLocation,
        pickup,
        destination,
      });

  const samePlace =
    input.pickupLocation.trim().toLowerCase() ===
    input.destinationLocation.trim().toLowerCase();
  const sameDistrict =
    samePlace ||
    districtHead(input.pickupLocation) === districtHead(input.destinationLocation);
  const pricePerKm = PRICE_PER_KM_STANDARD;
  const distanceKm = roundKm(sameDistrict && km < SAME_DISTRICT_KM ? SAME_DISTRICT_KM : km);
  const durationMinutes = routed?.seconds
    ? Math.max(MIN_MINUTES, Math.round(routed.seconds / 60))
    : Math.max(MIN_MINUTES, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
  const fare = Math.max(
    SAME_DISTRICT_KM * PRICE_PER_KM_STANDARD,
    roundMoney(distanceKm * pricePerKm)
  );

  return {
    pickup,
    destination,
    distanceKm,
    durationMinutes,
    durationLabel: `~${durationMinutes} min`,
    fare,
    fareLabel: fare.toFixed(2),
    pricePerKm,
    pricePerKmLabel: pricePerKm.toFixed(2),
  };
}
