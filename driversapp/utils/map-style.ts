import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'uber.driver.mapStyle';

export type MapStyleId =
  | 'navigationNight'
  | 'navigationDay'
  | 'standard'
  | 'standardSatellite'
  | 'streets'
  | 'satelliteStreets'
  | 'satellite'
  | 'outdoors'
  | 'light'
  | 'dark';

/** The ten Mapbox-designed styles, ordered for the settings list. */
export const MAP_STYLES: Record<MapStyleId, { label: string; hint: string; url: string }> = {
  navigationNight: {
    label: 'Navigation Night',
    hint: 'Dark driving view — easiest at night',
    url: 'mapbox://styles/mapbox/navigation-night-v1',
  },
  navigationDay: {
    label: 'Navigation Day',
    hint: 'Bright driving view with clear roads',
    url: 'mapbox://styles/mapbox/navigation-day-v1',
  },
  standard: {
    label: 'Standard',
    hint: '3D buildings and daylight shading',
    url: 'mapbox://styles/mapbox/standard',
  },
  standardSatellite: {
    label: 'Standard Satellite',
    hint: 'Satellite imagery with 3D labels',
    url: 'mapbox://styles/mapbox/standard-satellite',
  },
  streets: {
    label: 'Streets',
    hint: 'Classic colourful street map',
    url: 'mapbox://styles/mapbox/streets-v12',
  },
  satelliteStreets: {
    label: 'Satellite Streets',
    hint: 'Satellite photos plus street names',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  satellite: {
    label: 'Satellite',
    hint: 'Pure satellite photos, no labels',
    url: 'mapbox://styles/mapbox/satellite-v9',
  },
  outdoors: {
    label: 'Outdoors',
    hint: 'Terrain, paths and contour lines',
    url: 'mapbox://styles/mapbox/outdoors-v12',
  },
  light: {
    label: 'Light',
    hint: 'Muted light map',
    url: 'mapbox://styles/mapbox/light-v11',
  },
  dark: {
    label: 'Dark',
    hint: 'Muted dark map',
    url: 'mapbox://styles/mapbox/dark-v11',
  },
};

export const DEFAULT_MAP_STYLE: MapStyleId = 'navigationNight';

export const MAP_STYLE_ORDER: MapStyleId[] = [
  'navigationNight',
  'navigationDay',
  'standard',
  'standardSatellite',
  'streets',
  'satelliteStreets',
  'satellite',
  'outdoors',
  'light',
  'dark',
];

export async function readMapStyle(): Promise<MapStyleId> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved in MAP_STYLES) return saved as MapStyleId;
  } catch {
    // fall through to default
  }
  return DEFAULT_MAP_STYLE;
}

export async function writeMapStyle(id: MapStyleId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    // a failed save just means the default returns next launch
  }
}
