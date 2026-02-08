'use client';

import { useEffect, useState, useCallback, useContext, createContext } from 'react';
import type { User } from './types';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Failed to check session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      // Redirect to editor
      window.location.href = '/editor';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, confirmPassword: string) => {
      setError(null);
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, confirmPassword }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Network error' }));
          throw new Error(data.error || `Signup failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setUser(data.user);
        // Redirect to editor
        window.location.href = '/editor';
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signup failed: Unknown error';
        setError(message);
        console.error('[useAuth] Signup error:', err);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      // Redirect to home
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed');
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        signup,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
