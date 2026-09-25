import { AppColors } from '@/constants/theme';
import {
  getDriverLocationBlockReason,
  openDeviceLocationSettings,
  readDriverCoords,
} from '@/utils/driver-location';
import { DEFAULT_MAP_STYLE, MAP_STYLES, readMapStyle, type MapStyleId } from '@/utils/map-style';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/** Mogadishu — shown until the first GPS fix arrives. */
const FALLBACK_CENTER = { latitude: 2.0469, longitude: 45.3182 };

type DriverMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  /** Puck pulses while the driver is online and receiving offers. */
  online?: boolean;
  /** Compass heading in degrees; rotates the map so the driver faces up. */
  heading?: number | null;
  /** Fresh GPS fix from the locate button, so callers can keep their own state. */
  onLocate?: (coords: { latitude: number; longitude: number }) => void;
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
  /* Screen-aligned puck: the map rotates under it, so the cone always points
     at the direction of travel. */
  .puck { position: relative; width: 26px; height: 26px; }
  .puck .cone {
    position: absolute; left: 50%; top: -9px; margin-left: -7px;
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 12px solid ${AppColors.primary};
    filter: drop-shadow(0 -1px 1px rgba(0,0,0,0.3));
  }
  .puck .dot {
    position: absolute; left: 3px; top: 3px;
    width: 20px; height: 20px; border-radius: 50%;
    background: ${AppColors.primary}; border: 3px solid #FFFFFF;
    box-sizing: border-box;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  }
  .puck.online .dot { animation: raac-pulse 2s infinite; }
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
  function post(payload) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  }
  window.onerror = function (message) {
    post({ type: 'error', message: String(message) });
  };
  if (typeof mapboxgl === 'undefined') {
    post({ type: 'error', message: 'mapbox-gl failed to load from CDN' });
  }
  mapboxgl.accessToken = ${JSON.stringify(token)};
  var map = new mapboxgl.Map({
    container: 'map',
    style: ${JSON.stringify(styleUrl)},
    center: [${center.longitude}, ${center.latitude}],
    zoom: 16,
    attributionControl: true,
  });
  map.on('load', function () { post({ type: 'ready' }); });
  map.on('error', function (e) {
    post({ type: 'error', message: (e && e.error && e.error.message) || 'map error' });
  });
  var puck = document.createElement('div');
  puck.className = 'puck';
  puck.innerHTML = '<div class="cone"></div><div class="dot"></div>';
  var marker = new mapboxgl.Marker({ element: puck })
    .setLngLat([${center.longitude}, ${center.latitude}])
    .addTo(map);

  window.raacSetDriver = function (lat, lng, online, follow) {
    marker.setLngLat([lng, lat]);
    puck.className = online ? 'puck online' : 'puck';
    if (follow) map.easeTo({ center: [lng, lat], duration: 700 });
  };

  // Turn the whole map so the driver's heading is always screen-up.
  window.raacSetHeading = function (degrees) {
    if (typeof degrees !== 'number' || isNaN(degrees)) return;
    map.easeTo({ bearing: degrees, duration: 400 });
  };

  // "My location" button — snap back to the driver after panning away.
  window.raacFlyTo = function (lat, lng) {
    map.flyTo({ center: [lng, lat], zoom: 16, duration: 900 });
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
 * Map type comes from Settings → Map type; renders nothing without a token
 * so the caller can fall back to its own art.
 */
export function DriverMap({
  latitude,
  longitude,
  online = false,
  heading,
  onLocate,
  style,
}: DriverMapProps) {
  const webRef = useRef<WebView>(null);
  const [styleId, setStyleId] = useState<MapStyleId>(DEFAULT_MAP_STYLE);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);

  const hasFix = typeof latitude === 'number' && typeof longitude === 'number';
  const center = hasFix
    ? { latitude: latitude as number, longitude: longitude as number }
    : FALLBACK_CENTER;

  // Keep the HTML stable — camera, puck and style move through injected JS instead.
  const html = useMemo(
    () => buildHtml(MAPBOX_TOKEN, center, MAP_STYLES[DEFAULT_MAP_STYLE].url),
    []
  );

  const pushDriver = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.raacSetDriver && window.raacSetDriver(${center.latitude}, ${center.longitude}, ${online}, ${hasFix}); true;`
    );
  }, [center.latitude, center.longitude, online, hasFix]);

  useEffect(() => {
    pushDriver();
  }, [pushDriver]);

  // Round the bearing so small compass jitter doesn't keep re-animating the map.
  const bearing = typeof heading === 'number' ? Math.round(heading / 5) * 5 : null;

  useEffect(() => {
    if (bearing === null) return;
    webRef.current?.injectJavaScript(
      `window.raacSetHeading && window.raacSetHeading(${bearing}); true;`
    );
  }, [bearing]);

  // Pick up a change made in Settings → Map type on the way back.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readMapStyle().then((saved) => {
        if (!cancelled) setStyleId(saved);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.raacSetStyle && window.raacSetStyle(${JSON.stringify(MAP_STYLES[styleId].url)}); true;`
    );
  }, [styleId]);

  const handleLocate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const coords = await readDriverCoords();
      if (!coords) {
        const reason = await getDriverLocationBlockReason();
        Alert.alert(
          'Location unavailable',
          reason === 'services'
            ? 'Turn on Location / GPS in system settings to centre the map on you.'
            : 'Allow location access for Raac Drivers to centre the map on you.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void openDeviceLocationSettings() },
          ]
        );
        return;
      }
      onLocate?.(coords);
      webRef.current?.injectJavaScript(
        `window.raacFlyTo && window.raacFlyTo(${coords.latitude}, ${coords.longitude}); true;`
      );
    } finally {
      setLocating(false);
    }
  };

  if (!MAPBOX_TOKEN) return null;

  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      {/* Stay invisible until Mapbox reports a loaded style so the caller's
          fallback art shows instead of a blank white page. */}
      <View style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}>
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
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data) as {
                type: string;
                message?: string;
              };
              if (data.type === 'ready') setReady(true);
              if (data.type === 'error') console.warn('[DriverMap]', data.message);
            } catch {
              // ignore malformed bridge payloads
            }
          }}
          onError={({ nativeEvent }) => console.warn('[DriverMap] webview', nativeEvent.description)}
          onHttpError={({ nativeEvent }) =>
            console.warn('[DriverMap] http', nativeEvent.statusCode, nativeEvent.url)
          }
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
      </View>

      <TouchableOpacity
        style={styles.locateButton}
        onPress={() => void handleLocate()}
        disabled={locating}
        activeOpacity={0.85}>
        {locating ? (
          <ActivityIndicator size="small" color={AppColors.primary} />
        ) : (
          <Ionicons name="locate" size={20} color={AppColors.primary} />
        )}
      </TouchableOpacity>
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
  locateButton: {
    position: 'absolute',
    right: 12,
    top: '22%',
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
});
