/** Approximate Banadir district centers for pickup geocoding (no Google Maps). */
const DISTRICT_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Abdiaziz: { latitude: 2.0415, longitude: 45.344 },
  Bondhere: { latitude: 2.035, longitude: 45.338 },
  Darussalam: { latitude: 2.02, longitude: 45.28 },
  Daynile: { latitude: 2.07, longitude: 45.28 },
  Dharkenley: { latitude: 2.015, longitude: 45.3 },
  Garasbaaley: { latitude: 2.055, longitude: 45.27 },
  Gubadleey: { latitude: 2.09, longitude: 45.3 },
  'Hamar Jajab': { latitude: 2.028, longitude: 45.342 },
  'Hamar Weyne': { latitude: 2.033, longitude: 45.343 },
  Heliwaa: { latitude: 2.08, longitude: 45.36 },
  Hodan: { latitude: 2.04, longitude: 45.31 },
  Howlwadag: { latitude: 2.045, longitude: 45.325 },
  Karaan: { latitude: 2.06, longitude: 45.35 },
  Kaxda: { latitude: 2.0, longitude: 45.27 },
  Shangaani: { latitude: 2.037, longitude: 45.35 },
  Shibis: { latitude: 2.05, longitude: 45.35 },
  Waberi: { latitude: 2.025, longitude: 45.33 },
  'Wadajir (Madina)': { latitude: 2.01, longitude: 45.3 },
  'Warta Nabada': { latitude: 2.055, longitude: 45.32 },
  Yaaqshiid: { latitude: 2.065, longitude: 45.34 },
};

/** Mogadishu city center fallback. */
export const DEFAULT_CITY_COORDS = { latitude: 2.0469, longitude: 45.3182 };

export type LatLng = { latitude: number; longitude: number };

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Resolve an address like "Hodan, Taleex" or a district name → approx coords. */
export function geocodeLocationLabel(location: string): LatLng | null {
  const raw = location.trim();
  if (!raw) return null;

  const head = raw.split(',')[0]?.trim() || raw;
  for (const [name, coords] of Object.entries(DISTRICT_COORDS)) {
    if (head.toLowerCase() === name.toLowerCase() || raw.toLowerCase().includes(name.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

export function resolvePickupCoords(input: {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupLocation?: string | null;
}): LatLng | null {
  if (
    typeof input.pickupLat === 'number' &&
    typeof input.pickupLng === 'number' &&
    Number.isFinite(input.pickupLat) &&
    Number.isFinite(input.pickupLng)
  ) {
    return { latitude: input.pickupLat, longitude: input.pickupLng };
  }
  if (input.pickupLocation) return geocodeLocationLabel(input.pickupLocation);
  return null;
}

/** Same lookup as pickup — Banadir district centers. */
export function geocodePickupLabel(location: string): LatLng | null {
  return geocodeLocationLabel(location);
}
