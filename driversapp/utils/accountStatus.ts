import { Alert } from 'react-native';
import { driverDisplayName } from '@/utils/driverAuth';
import type { StoredDriverUser } from '@/lib/api';

export type AccountBlockReason = 'disabled' | 'not_found';

/** Professional account-status alerts for disable / delete. */
export function showDriverAccountAlert(
  reason: AccountBlockReason,
  opts?: { driverName?: string | null; user?: StoredDriverUser | null }
) {
  const name =
    (opts?.driverName && opts.driverName.trim()) ||
    driverDisplayName(opts?.user ?? null);

  if (reason === 'disabled') {
    Alert.alert(
      'Account disabled',
      `${name}, your driver account has been disabled by Raac operations.\n\nYou cannot go online or take trips until an admin enables your account again. Please contact Raac operations for help.`,
      [{ text: 'OK', style: 'default' }]
    );
    return;
  }

  Alert.alert(
    'Account not found',
    'This driver account no longer exists. Sign-in is not available for this number. Contact Raac operations if you need a new login.',
    [{ text: 'OK', style: 'default' }]
  );
}

export function accountBlockFromError(error: unknown): AccountBlockReason | null {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'auth/user-disabled') return 'disabled';
  if (code === 'auth/user-not-found') return 'not_found';
  return null;
}
