import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { syncEvidenceQueue } from '../../hooks/evidenceRecords';
import { clearLearnerDeviceData } from '../../hooks/learnerDeviceData';

// Must match CONSENT_VERSION in backend/src/modules/auth/auth.controller.ts.
export const CONSENT_VERSION = 'guardian-consent-v1';

export interface GuardianConsent {
  guardianConfirmed: boolean;
  consent: boolean;
}

export interface LogoutOptions {
  learnerId?: number | null;
  accountDeleted?: boolean;
}

// Sends queued evidence before logout; false means some attempts are still waiting.
async function flushEvidence(learnerId: number, token: string): Promise<boolean> {
  const attempt = async () => {
    for (let batch = 0; batch < 20; batch++) {
      if (!(await syncEvidenceQueue(learnerId, token)).remaining) return true;
    }
    return false;
  };
  const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000));
  return Promise.race([attempt().catch(() => false), timeout]);
}

export interface User {
  id: number;
  email: string;
  role: 'learner' | 'teacher' | 'admin';
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  freshLogin: boolean;
  register: (email: string, password: string, confirmPassword: string, role: 'learner' | 'teacher', consent: GuardianConsent, adminInvitation?:string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  loginWithFacebook: () => void;
  logout: (options?: LogoutOptions) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [freshLogin, setFreshLogin] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token');
  });
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('auth_token')) || window.location.search.includes('token='));
  const [error, setError] = useState<string | null>(null);

  const verifyToken = useCallback(async (authToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if token is still valid on mount OR if we just returned from an OAuth redirect
  useEffect(() => {
    // Look for ?token=xyz in the URL bar (sent back from your backend after Google/Facebook login)
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const errorFromUrl = params.get('error');

    if (errorFromUrl) {
      setError(decodeURIComponent(errorFromUrl));
      setIsLoading(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (tokenFromUrl) {
      // Capture the OAuth token, save it, and verify the user
      setFreshLogin(true);
      localStorage.setItem('auth_token', tokenFromUrl);
      setToken(tokenFromUrl);
      
      // Clean up the URL so the token doesn't stay visible in the address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      
      verifyToken(tokenFromUrl);
    } else if (token) {
      // Standard flow for returning users
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, [token, verifyToken]);

  const register = useCallback(
    async (
      email: string,
      password: string,
      confirmPassword: string,
      role: 'learner' | 'teacher',
      consent: GuardianConsent,
      adminInvitation?: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            confirmPassword,
            role,
            ...consent,
            consentVersion: CONSENT_VERSION,
            adminInvitation,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        // Store token and user
        setFreshLogin(true);
        localStorage.setItem('auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user
      setFreshLogin(true);
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // OAuth Triggers: These redirect the browser to your backend to start the OAuth flow
  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_URL}/auth/google`;
  }, []);

  const loginWithFacebook = useCallback(() => {
    window.location.href = `${API_URL}/auth/facebook`;
  }, []);

  const logout = useCallback(async ({ learnerId = null, accountDeleted = false }: LogoutOptions = {}) => {
    const evidenceSafe = accountDeleted || !learnerId || !token || await flushEvidence(learnerId, token);
    try { clearLearnerDeviceData(localStorage, learnerId, user?.id ?? null, !evidenceSafe); } catch { /* Logout must still finish if storage is blocked. */ }
    setFreshLogin(false);
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setError(null);
  }, [token, user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    freshLogin,
    register,
    login,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};