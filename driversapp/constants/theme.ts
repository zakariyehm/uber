/**
 * App colors — driversapp is light-only.
 * Primary is black, matching the Drivers mark.
 */

import { Platform } from 'react-native';

/** Raac Drivers brand — black field from the wordmark. */
export const Brand = {
  black: '#000000',
  navy: '#000000',
  blue: '#3376BD',
};

/** Raac Drivers primary — #000000 */
export const AppColors = {
  primary: Brand.black,
  primaryDim: 'rgba(0, 0, 0, 0.12)',
  navy: Brand.black,
  bg: '#FFFFFF',
  surface: '#F3F3F3',
  text: '#11181C',
  muted: '#6A6A6A',
  border: '#E6E6E6',
  danger: '#FF3B30',
  success: '#34C759',
  offline: '#161616',
  waiting: '#FF9500',
};

const tintColorLight = AppColors.primary;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  // Kept for type compatibility; always maps to light.
  dark: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
