import { Alert } from 'react-native';
import type { StoredAuthUser } from '@/lib/api';

export type AccountBlockReason = 'disabled' | 'not_found';

function displayName(user?: StoredAuthUser | null, fallback?: string | null) {
  const fromUser = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return (fallback && fallback.trim()) || fromUser || 'Rider';
}

/** Account-status alerts when admin disables or removes a rider. */
export function showRiderAccountAlert(
  reason: AccountBlockReason,
  opts?: { riderName?: string | null; user?: StoredAuthUser | null }
) {
  const name = displayName(opts?.user, opts?.riderName);

  if (reason === 'disabled') {
    Alert.alert(
      'Account disabled',
      `${name}, your rider account has been disabled by Raac operations.\n\nYou cannot place trips until an admin enables your account again. Please contact Raac operations for help.`,
      [{ text: 'OK', style: 'default' }]
    );
    return;
  }

  Alert.alert(
    'Account not found',
    'This rider account no longer exists. Sign-in is not available for this number. Contact Raac operations if you need help.',
    [{ text: 'OK', style: 'default' }]
  );
}

export function accountBlockFromError(error: unknown): AccountBlockReason | null {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'auth/user-disabled') return 'disabled';
  if (code === 'auth/user-not-found') return 'not_found';
  return null;
}
