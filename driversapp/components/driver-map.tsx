import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/** Mogadishu — shown until the first GPS fix arrives. */
const FALLBACK_CENTER = { latitude: 2.0469, longitude: 45.3182 };
const STYLE_STORAGE_KEY = 'uber.driver.mapStyle';

export type MapStyleId = 'standard' | 'satellite' | 'night';

const MAP_STYLES: Record<MapStyleId, { label: string; url: string }> = {
  standard: { label: 'Standard', url: 'mapbox://styles/mapbox/streets-v12' },
  satellite: { label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  night: { label: 'Night', url: 'mapbox://styles/mapbox/navigation-night-v1' },
};

const STYLE_ORDER: MapStyleId[] = ['standard', 'satellite', 'night'];

type DriverMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  /** Puck pulses while the driver is online and receiving offers. */
  online?: boolean;
  /** Hide the layer switcher on screens that should stay fixed. */
  showStyleSwitcher?: boolean;
  style?: StyleProp<ViewStyle>;
};

function buildHtml(token: string, center: { latitude: number; longitude: number }, styleUrl: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link href="https://unpkg.com/mapbox-gl@3/dist/mapbox-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/mapbox-gl@3/dist/mapbox-gl.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #E8ECE8; }
  .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { margin-bottom: 84px; }
  .puck {
    width: 20px; height: 20px; border-radius: 50%;
    background: ${AppColors.primary}; border: 3px solid #FFFFFF;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  }
  .puck.online { animation: raac-pulse 2s infinite; }
  @keyframes raac-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(2,166,228,0.45); }
    70%  { box-shadow: 0 0 0 18px rgba(2,166,228,0); }
    100% { box-shadow: 0 0 0 0 rgba(2,166,228,0); }
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  mapboxgl.accessToken = ${JSON.stringify(token)};
  var map = new mapboxgl.Map({
    container: 'map',
    style: ${JSON.stringify(styleUrl)},
    center: [${center.longitude}, ${center.latitude}],
    zoom: 15,
    attributionControl: true,
  });
  var puck = document.createElement('div');
  puck.className = 'puck';
  var marker = new mapboxgl.Marker({ element: puck })
    .setLngLat([${center.longitude}, ${center.latitude}])
    .addTo(map);

  window.raacSetDriver = function (lat, lng, online, follow) {
    marker.setLngLat([lng, lat]);
    puck.className = online ? 'puck online' : 'puck';
    if (follow) map.easeTo({ center: [lng, lat], duration: 700 });
  };

  // Markers are DOM elements, so they survive a style swap.
  var currentStyle = ${JSON.stringify(styleUrl)};
  window.raacSetStyle = function (url) {
    if (!url || url === currentStyle) return;
    currentStyle = url;
    try { map.setStyle(url); } catch (e) {}
  };
</script>
</body>
</html>`;
}

/**
 * Live driver map (Mapbox GL JS in a WebView so it runs in Expo Go).
 * Renders nothing without a token so the caller can fall back to its own art.
 */
export function DriverMap({
  latitude,
  longitude,
  online = false,
  showStyleSwitcher = true,
  style,
}: DriverMapProps) {
  const webRef = useRef<WebView>(null);
  const [styleId, setStyleId] = useState<MapStyleId>('standard');
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasFix = typeof latitude === 'number' && typeof longitude === 'number';
  const center = hasFix
    ? { latitude: latitude as number, longitude: longitude as number }
    : FALLBACK_CENTER;

  // Keep the HTML stable — camera, puck and style move through injected JS instead.
  const html = useMemo(() => buildHtml(MAPBOX_TOKEN, center, MAP_STYLES.standard.url), []);

  const pushDriver = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.raacSetDriver && window.raacSetDriver(${center.latitude}, ${center.longitude}, ${online}, ${hasFix}); true;`
    );
  }, [center.latitude, center.longitude, online, hasFix]);

  useEffect(() => {
    pushDriver();
  }, [pushDriver]);

  // Restore the driver's last chosen map type.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STYLE_STORAGE_KEY)
      .then((saved) => {
        if (cancelled) return;
        if (saved && saved in MAP_STYLES) setStyleId(saved as MapStyleId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.raacSetStyle && window.raacSetStyle(${JSON.stringify(MAP_STYLES[styleId].url)}); true;`
    );
  }, [styleId]);

  const chooseStyle = (next: MapStyleId) => {
    setStyleId(next);
    setPickerOpen(false);
    void AsyncStorage.setItem(STYLE_STORAGE_KEY, next).catch(() => {});
  };

  if (!MAPBOX_TOKEN) return null;

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://api.mapbox.com' }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        onLoadEnd={() => {
          pushDriver();
          webRef.current?.injectJavaScript(
            `window.raacSetStyle && window.raacSetStyle(${JSON.stringify(
              MAP_STYLES[styleId].url
            )}); true;`
          );
        }}
        style={styles.web}
      />

      {showStyleSwitcher ? (
        <View style={styles.switcher} pointerEvents="box-none">
          {pickerOpen
            ? STYLE_ORDER.map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.chip, id === styleId && styles.chipActive]}
                  onPress={() => chooseStyle(id)}
                  activeOpacity={0.85}>
                  <Text style={[styles.chipText, id === styleId && styles.chipTextActive]}>
                    {MAP_STYLES[id].label}
                  </Text>
                </TouchableOpacity>
              ))
            : null}
          <TouchableOpacity
            style={styles.layersButton}
            onPress={() => setPickerOpen((open) => !open)}
            activeOpacity={0.85}>
            <Ionicons
              name={pickerOpen ? 'close' : 'layers-outline'}
              size={20}
              color={AppColors.text}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#E8ECE8',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  switcher: {
    position: 'absolute',
    right: 12,
    top: '38%',
    alignItems: 'flex-end',
    gap: 8,
  },
  layersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  chipActive: {
    backgroundColor: AppColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
