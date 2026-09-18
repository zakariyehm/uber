import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function isOnlineState(state: NetInfoState) {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/** Resolves when the device has a usable network connection. */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve();
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (isOnlineState(state)) finish();
    });

    void NetInfo.fetch().then((state) => {
      if (isOnlineState(state)) finish();
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
      err.name === 'TypeError'
    );
  }
  return false;
}
