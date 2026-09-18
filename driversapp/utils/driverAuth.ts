import { apiRequest, setAuthToken, setStoredUser, type StoredDriverUser } from '@/lib/api';

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('252')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+252${digits}`;
}

export async function loginDriver(phone: string, password: string) {
  const result = await apiRequest<{ token: string; user: StoredDriverUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: normalizePhone(phone), password }),
  });

  if (result.user.role !== 'DRIVER') {
    const error = new Error(
      'No driver account exists for this phone number.'
    ) as Error & { code?: string };
    error.code = 'auth/user-not-found';
    throw error;
  }

  await setAuthToken(result.token);
  await setStoredUser(result.user);
  return { token: result.token, user: result.user };
}

export async function fetchCurrentDriver() {
  const result = await apiRequest<{ user: StoredDriverUser }>('/auth/me');
  return result.user;
}

export async function logoutDriver() {
  await setAuthToken(null);
  await setStoredUser(null);
}

export function driverDisplayName(user: StoredDriverUser | null) {
  if (!user) return 'Driver';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || 'Driver';
}
