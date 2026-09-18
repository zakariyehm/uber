import { LogBox } from 'react-native';

/**
 * Must load before react-native-reanimated so the reduced-motion
 * accessibility warning is ignored on first module init (common on Android).
 */
LogBox.ignoreLogs([
  'Reduced motion setting is enabled on this device',
  '[Reanimated] Reduced motion setting is enabled on this device.',
  'Reduced motion setting is overwritten',
  /Reduced motion setting is enabled on this device/,
  /Reduced motion setting is overwritten/,
]);
