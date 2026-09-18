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
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AuthUser = StoredDriverUser;

type AuthContextValue = {
  isReady: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Persist logo + home background to device storage while splash is up.
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
            await setAuthToken(null);
            await setStoredUser(null);
            setToken(null);
            setUser(null);
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

          if (error?.status === 401) {
            await setAuthToken(null);
            await setStoredUser(null);
            setToken(null);
            setUser(null);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isLoggedIn: Boolean(token),
      user,
      signIn: async (nextToken, nextUser) => {
        await setAuthToken(nextToken);
        await setStoredUser(nextUser);
        setToken(nextToken);
        setUser(nextUser);
      },
      signOut: async () => {
        await setAuthToken(null);
        await setStoredUser(null);
        setToken(null);
        setUser(null);
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
