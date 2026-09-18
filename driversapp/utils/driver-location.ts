import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export async function ensureDriverLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === Location.PermissionStatus.GRANTED) return true;

  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.status === Location.PermissionStatus.GRANTED;
}

export type DriverLocationBlockReason = 'permission' | 'services' | null;

export async function readDriverCoords(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const ok = await ensureDriverLocationPermission();
  if (!ok) return null;

  const services = await Location.hasServicesEnabledAsync();
  if (!services) return null;

  try {
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
  } catch {
    return null;
  }
}

/** Why GO online cannot get a fix — for professional Android/iOS alerts. */
export async function getDriverLocationBlockReason(): Promise<DriverLocationBlockReason> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    const asked = await Location.requestForegroundPermissionsAsync();
    if (asked.status !== Location.PermissionStatus.GRANTED) return 'permission';
  }

  const services = await Location.hasServicesEnabledAsync();
  if (!services) return 'services';
  return null;
}

export async function openDeviceLocationSettings() {
  if (Platform.OS === 'android') {
    await Linking.openSettings();
    return;
  }
  await Linking.openURL('app-settings:');
}
