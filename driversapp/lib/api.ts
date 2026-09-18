import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = 'uber.driver.authToken';
const USER_KEY = 'uber.driver.authUser';

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

export type StoredDriverUser = {
  id: string;
  phone: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  vehicleType?: string | null;
};

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

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredDriverUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: StoredDriverUser | null) {
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

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'Request failed') as Error & {
        code?: string;
        status?: number;
        driverName?: string;
      };
      error.code = data.code;
      error.status = res.status;
      if (typeof data.driverName === 'string') error.driverName = data.driverName;
      throw error;
    }

    return data as T;
  } catch (error: any) {
    if (error?.status || error?.code === 'network_error') {
      throw error;
    }
    const wrapped = new Error('Network busy. Check your connection and try again.') as Error & {
      code?: string;
      status?: number;
    };
    wrapped.code = 'network_error';
    throw wrapped;
  }
}
