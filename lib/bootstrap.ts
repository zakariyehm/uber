import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function isOnlineState(state: NetInfoState) {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/** Resolves when the device has a usable network connection. */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        unsubscribe?.();
      } catch {
        // ignore teardown errors
      }
      unsubscribe = null;
      resolve();
    };

    // NetInfo may invoke the listener synchronously while registering.
    // Keep unsubscribe nullable so finish() never calls undefined.
    const remove = NetInfo.addEventListener((state) => {
      if (isOnlineState(state)) finish();
    });
    unsubscribe = typeof remove === 'function' ? remove : null;

    // If we already finished during sync registration, drop the listener.
    if (settled) {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
      unsubscribe = null;
      return;
    }

    void NetInfo.fetch()
      .then((state) => {
        if (isOnlineState(state)) finish();
      })
      .catch(() => {
        // NetInfo native module unavailable — don't block splash forever.
        finish();
      });
  });
}

export function isNetworkError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const err = error as { status?: number; message?: string; name?: string };
  if (typeof err.status === 'number' && err.status >= 500) return true;
  if (err.status == null) {
    const msg = String(err.message || '').toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('offline') ||
      msg.includes('could not connect') ||
      err.name === 'TypeError'
    );
  }
  return false;
}
