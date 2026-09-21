import { apiRequest, setAuthToken, setStoredUser } from '@/lib/api';
import type { StoredAuthUser } from '@/lib/api';

export type AuthUser = StoredAuthUser;

export async function fetchCurrentUser() {
  const result = await apiRequest<{ user: AuthUser }>('/auth/me');
  return result.user;
}

export async function requestOtp(phone: string, purpose: 'LOGIN' | 'REGISTER') {
  const result = await apiRequest<{ phone: string; expiresIn: number; devCode?: string }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose }),
  });

  if (__DEV__ && result.devCode) {
    console.log('\n==============================');
    console.log(`  OTP DEV  ${purpose}  ${phone}`);
    console.log(`  CODE: ${result.devCode}`);
    console.log('==============================\n');
  }

  return result;
}

export async function verifyOtp(phone: string, code: string, purpose: 'LOGIN' | 'REGISTER') {
  const result = await apiRequest<{
    isNewUser: boolean;
    token?: string;
    verificationToken?: string;
    phone?: string;
    user?: AuthUser;
  }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, purpose }),
  });

  if (result.token) {
    await setAuthToken(result.token);
  }
  return result;
}

export async function completeRiderProfile(input: {
  verificationToken: string;
  firstName: string;
  lastName: string;
  state: string;
  gender: 'MALE' | 'FEMALE';
}) {
  const result = await apiRequest<{ token: string; user: AuthUser }>('/auth/otp/complete', {
    method: 'POST',
    body: JSON.stringify({ ...input, role: 'RIDER' }),
  });
  await setAuthToken(result.token);
  await setStoredUser(result.user);
  return result;
}

export async function loginRider(phone: string, password: string) {
  const result = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  await setAuthToken(result.token);
  await setStoredUser(result.user);
  return result.user;
}

export async function registerRider(input: {
  phone: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const result = await apiRequest<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, role: 'RIDER' }),
  });
  await setAuthToken(result.token);
  await setStoredUser(result.user);
  return result.user;
}

export async function logoutRider() {
  await setAuthToken(null);
  await setStoredUser(null);
}
