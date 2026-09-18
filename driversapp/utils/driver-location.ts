import * as Location from 'expo-location';

export async function ensureDriverLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === Location.PermissionStatus.GRANTED) return true;
  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.status === Location.PermissionStatus.GRANTED;
}

export async function readDriverCoords(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const ok = await ensureDriverLocationPermission();
  if (!ok) return null;

  const services = await Location.hasServicesEnabledAsync();
  if (!services) return null;

  const last = await Location.getLastKnownPositionAsync();
  if (last) {
    return {
      latitude: last.coords.latitude,
      longitude: last.coords.longitude,
    };
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
}
