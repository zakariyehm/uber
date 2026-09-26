/**
 * App colors — driversapp is light-only.
 * Primary is Raac arrow blue; navy is the wordmark field.
 */

import { Platform } from 'react-native';

/** Raac brand — navy field + arrow blue from the wordmark. */
export const Brand = {
  navy: '#202B3D',
  blue: '#3376BD',
  blueStrong: '#2868A8',
};

/** Raac brand primary — arrow blue #3376BD */
export const AppColors = {
  primary: Brand.blue,
  primaryDim: 'rgba(51, 118, 189, 0.14)',
  navy: Brand.navy,
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
