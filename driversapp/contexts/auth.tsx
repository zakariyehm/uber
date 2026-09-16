import {
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  type StoredDriverUser,
} from '@/lib/api';
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

    const restore = async () => {
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

      // Restore session immediately so reload stays on home (not Welcome back).
      if (!cancelled) {
        setToken(savedToken);
        setUser(savedUser);
        setIsReady(true);
      }

      try {
        const freshUser = await fetchCurrentDriver();
        if (cancelled) return;
        if (freshUser.role !== 'DRIVER') {
          await setAuthToken(null);
          await setStoredUser(null);
          setToken(null);
          setUser(null);
          return;
        }
        setUser(freshUser);
        await setStoredUser(freshUser);
      } catch (error: any) {
        if (cancelled) return;
        // Only clear session on auth failure; keep offline/network errors logged in.
        if (error?.status === 401) {
          await setAuthToken(null);
          await setStoredUser(null);
          setToken(null);
          setUser(null);
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
