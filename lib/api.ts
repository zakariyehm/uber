import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = 'uber.authToken';
const USER_KEY = 'uber.authUser';

export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:3000`;
  }

  return 'http://localhost:3000';
}

export async function getAuthToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setAuthToken(token: string | null) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export type StoredAuthUser = {
  id: string;
  phone: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  state?: string | null;
  riderKind?: 'PERSONAL' | 'STORE' | string | null;
  storeId?: string | null;
  store?: {
    id: string;
    name: string;
    category: string;
    phone?: string | null;
  } | null;
};

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: StoredAuthUser | null) {
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${getApiBaseUrl()}${path}`;
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || 'Request failed') as Error & {
          code?: string;
          status?: number;
        };
        error.code = data.code;
        error.status = response.status;
        throw error;
      }

      return data as T;
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      // Retry only transient connection failures, not 4xx/5xx business errors.
      if (status) throw error;
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not connect to the server');
}
