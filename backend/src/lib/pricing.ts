import {
  geocodeLocationLabel,
  haversineMeters,
  resolvePickupCoords,
  type LatLng,
} from './geo.ts';

/** Rider + driver fare: $0.25 per kilometre (Uber-style distance fare). */
export const PRICE_PER_KM = 0.25;
/** Roads are not straight — bump straight-line distance toward a real route. */
const ROAD_FACTOR = 1.25;
/** Typical Mogadishu moto/bike speed when Directions is unavailable. */
const AVG_SPEED_KMH = 22;
/** Same-district different neighborhood — district-center geocode would be 0 km. */
const SAME_DISTRICT_KM = 2;
const MIN_TRIP_KM = 1;
const MIN_FARE = PRICE_PER_KM;
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
    km = samePlace ? MIN_TRIP_KM : sameDistrict ? SAME_DISTRICT_KM : MIN_TRIP_KM;
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

  const distanceKm = roundKm(km);
  const durationMinutes = routed?.seconds
    ? Math.max(MIN_MINUTES, Math.round(routed.seconds / 60))
    : Math.max(MIN_MINUTES, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
  const fare = Math.max(MIN_FARE, roundMoney(distanceKm * PRICE_PER_KM));

  return {
    pickup,
    destination,
    distanceKm,
    durationMinutes,
    durationLabel: `~${durationMinutes} min`,
    fare,
    fareLabel: fare.toFixed(2),
    pricePerKm: PRICE_PER_KM,
    pricePerKmLabel: PRICE_PER_KM.toFixed(2),
  };
}
