import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

/**
 * Brand images: copy once into device documents, remember the file:// URI
 * in AsyncStorage. Later launches skip re-unpacking the bundle asset.
 * Bump CACHE_VERSION when you replace the source PNG in assets/.
 */
const CACHE_VERSION = 'v1';
const META_KEY = '@raac-driver/local-image-cache';
const DIR = `${FileSystem.documentDirectory ?? ''}raac-images/`;

type CacheEntry = { uri: string; version: string };
type CacheMeta = Record<string, CacheEntry>;

const memory = new Map<string, ImageSourcePropType>();
const inflight = new Map<string, Promise<ImageSourcePropType>>();

async function readMeta(): Promise<CacheMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheMeta;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMeta(meta: CacheMeta) {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

async function fileExists(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return Boolean(info.exists);
  } catch {
    return false;
  }
}

export async function resolveCachedAsset(
  key: string,
  moduleId: number
): Promise<ImageSourcePropType> {
  const hit = memory.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async (): Promise<ImageSourcePropType> => {
    if (!FileSystem.documentDirectory) {
      memory.set(key, moduleId);
      return moduleId;
    }

    const meta = await readMeta();
    const entry = meta[key];
    if (entry?.version === CACHE_VERSION && entry.uri && (await fileExists(entry.uri))) {
      const source = { uri: entry.uri };
      memory.set(key, source);
      return source;
    }

    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    const from = asset.localUri || asset.uri;
    if (!from) {
      memory.set(key, moduleId);
      return moduleId;
    }

    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
    const ext = (asset.type || 'png').replace(/^\./, '');
    const dest = `${DIR}${key.replace(/\./g, '-')}.${ext}`;

    try {
      if (await fileExists(dest)) {
        await FileSystem.deleteAsync(dest, { idempotent: true });
      }
      await FileSystem.copyAsync({ from, to: dest });
    } catch {
      const fallback = { uri: from };
      memory.set(key, fallback);
      return fallback;
    }

    meta[key] = { uri: dest, version: CACHE_VERSION };
    await writeMeta(meta);
    const source = { uri: dest };
    memory.set(key, source);
    return source;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export async function warmLocalImages(
  entries: ReadonlyArray<{ key: string; moduleId: number }>
) {
  await Promise.all(
    entries.map(({ key, moduleId }) =>
      resolveCachedAsset(key, moduleId).catch(() => moduleId as ImageSourcePropType)
    )
  );
}

export function useCachedAsset(key: string, moduleId: number): ImageSourcePropType {
  const [source, setSource] = useState<ImageSourcePropType>(
    () => memory.get(key) ?? moduleId
  );

  useEffect(() => {
    let cancelled = false;
    void resolveCachedAsset(key, moduleId).then((resolved) => {
      if (!cancelled) setSource(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [key, moduleId]);

  return source;
}

export const LocalImages = {
  headerLogo: {
    key: 'header.logo',
    moduleId: require('@/assets/images/raac-logo.png') as number,
  },
  homeBg: {
    key: 'home.bg',
    moduleId: require('@/assets/images/racapp.png') as number,
  },
} as const;
