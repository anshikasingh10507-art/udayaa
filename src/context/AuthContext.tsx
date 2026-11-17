import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setStoredToken } from '../lib/api';
import type { OwnerProfile, User } from '../types';

interface AuthContextValue {
  user: User | null;
  ownerProfile: OwnerProfile | null;
  unreadCount: number;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'renter' | 'owner';
    phone?: string;
    city?: string;
    businessName?: string;
    serviceArea?: string;
    serviceRadiusKm?: number;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<{ unreadCount: number }>('/api/notifications');
      setUnreadCount(data.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: User | null; ownerProfile: OwnerProfile | null }>('/api/auth/me');
      setUser(data.user);
      setOwnerProfile(data.ownerProfile);
      if (data.user) {
        await refreshNotifications();
      } else {
        setUnreadCount(0);
      }
    } catch {
      setUser(null);
      setOwnerProfile(null);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: User; ownerProfile: OwnerProfile | null; token: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      setStoredToken(data.token);
      setUser(data.user);
      setOwnerProfile(data.ownerProfile);
      await refreshNotifications();
      return data.user;
    },
    [refreshNotifications]
  );

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: 'renter' | 'owner';
      phone?: string;
      city?: string;
      businessName?: string;
      serviceArea?: string;
      serviceRadiusKm?: number;
    }) => {
      const data = await apiFetch<{ user: User; ownerProfile: OwnerProfile | null; token: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      setStoredToken(data.token);
      setUser(data.user);
      setOwnerProfile(data.ownerProfile);
      await refreshNotifications();
      return data.user;
    },
    [refreshNotifications]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setOwnerProfile(null);
    setUnreadCount(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        ownerProfile,
        unreadCount,
        loading,
        login,
        register,
        logout,
        refreshAuth,
        refreshNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
