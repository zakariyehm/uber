import {
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  type StoredDriverUser,
} from '@/lib/api';
import { isNetworkError, waitForOnline } from '@/lib/bootstrap';
import { LocalImages, warmLocalImages } from '@/lib/local-images';
import { fetchCurrentDriver } from '@/utils/driverAuth';
import {
  accountBlockFromError,
  showDriverAccountAlert,
} from '@/utils/accountStatus';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type AuthUser = StoredDriverUser;

type AuthContextValue = {
  isReady: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCOUNT_POLL_MS = 12_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const alertedRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearSession = async () => {
    await setAuthToken(null);
    await setStoredUser(null);
    setToken(null);
    setUser(null);
  };

  const forceAccountBlock = async (
    reason: 'disabled' | 'not_found',
    driverName?: string
  ) => {
    const snapshot = userRef.current;
    await clearSession();
    if (alertedRef.current) return;
    alertedRef.current = true;
    showDriverAccountAlert(reason, { driverName, user: snapshot });
  };

  useEffect(() => {
    let cancelled = false;

    void warmLocalImages([LocalImages.headerLogo, LocalImages.homeBg]);

    const restore = async () => {
      while (!cancelled) {
        await waitForOnline();
        if (cancelled) return;

        const savedToken = await getAuthToken();
        const savedUser = await getStoredUser();

        if (!savedToken) {
          if (!cancelled) {
            setToken(null);
            setUser(null);
            setIsReady(true);
          }
          return;
        }

        try {
          const freshUser = await fetchCurrentDriver();
          if (cancelled) return;
          if (freshUser.role !== 'DRIVER') {
            await clearSession();
            setIsReady(true);
            return;
          }
          setToken(savedToken);
          setUser(freshUser);
          await setStoredUser(freshUser);
          setIsReady(true);
          return;
        } catch (error: any) {
          if (cancelled) return;

          const block = accountBlockFromError(error);
          if (block) {
            await forceAccountBlock(
              block,
              typeof error?.driverName === 'string' ? error.driverName : undefined
            );
            setIsReady(true);
            return;
          }

          if (error?.status === 401) {
            await clearSession();
            setIsReady(true);
            return;
          }

          if (isNetworkError(error)) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }

          setToken(savedToken);
          setUser(savedUser);
          setIsReady(true);
          return;
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // While logged in, detect admin disable / delete quickly.
  useEffect(() => {
    if (!isReady || !token) return;

    let cancelled = false;

    const checkAccount = async () => {
      try {
        const freshUser = await fetchCurrentDriver();
        if (cancelled) return;
        if (freshUser.role !== 'DRIVER') {
          await forceAccountBlock('not_found');
          return;
        }
        setUser(freshUser);
        await setStoredUser(freshUser);
      } catch (error: any) {
        if (cancelled) return;
        const block = accountBlockFromError(error);
        if (block) {
          await forceAccountBlock(
            block,
            typeof error?.driverName === 'string' ? error.driverName : undefined
          );
          return;
        }
        if (error?.status === 401) {
          await clearSession();
        }
      }
    };

    void checkAccount();
    const interval = setInterval(() => void checkAccount(), ACCOUNT_POLL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void checkAccount();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [isReady, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isLoggedIn: Boolean(token),
      user,
      signIn: async (nextToken, nextUser) => {
        alertedRef.current = false;
        await setAuthToken(nextToken);
        await setStoredUser(nextUser);
        setToken(nextToken);
        setUser(nextUser);
      },
      signOut: async () => {
        await clearSession();
      },
    }),
    [isReady, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
