import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function validateLeagueRegistration(inviteCode: string, targetUserId: string, attemptedRole?: string, attemptedStatus?: string) {
  if (!inviteCode || inviteCode.trim().toUpperCase() !== 'MAIN26') {
    throw new Error('Invalid League Invite Code');
  }
  if (attemptedRole && attemptedRole !== 'USER') {
    throw new Error('HTTP 403 Forbidden: Forged role injection rejected');
  }
  if (attemptedStatus && attemptedStatus !== 'PENDING') {
    throw new Error('HTTP 403 Forbidden: Forged status injection rejected');
  }
  return { pool_id: '9b893bef-3b5a-4ffa-951d-8ba27f9c9782', user_id: targetUserId, status: 'PENDING' as const };
}

export function authorizeCommissionerAdjudication(currentUserRole: string, targetUserId: string, targetPoolId: string, action: 'ACTIVE' | 'REJECTED') {
  if (currentUserRole !== 'ADMIN') {
    throw new Error('HTTP 403 Forbidden: Insufficient pool privileges');
  }
  if (!targetPoolId || targetPoolId !== '9b893bef-3b5a-4ffa-951d-8ba27f9c9782') {
    throw new Error('HTTP 403 Forbidden: Target pool mismatch');
  }
  return { targetUserId, targetPoolId, newStatus: action, adjudicatedAt: new Date().toISOString() };
}

export function stepTiebreakerScore(currentVal: string, delta: number): string {
  const parsed = parseFloat(currentVal);
  if (isNaN(parsed)) return '0.0';
  return (Math.round((parsed + delta) * 10) / 10).toFixed(1);
}

import { setActiveSessionToken } from '../lib/apiClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession?.user) {
          const authUser: User = {
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            role: (currentSession.user.app_metadata?.role as 'ADMIN' | 'USER') || 'USER'
          };
          setUser(authUser);
          setToken(currentSession.access_token);
          setActiveSessionToken(currentSession.access_token);
        } else {
          setActiveSessionToken(null);
        }
      } catch (err) {
        console.warn('Failed to fetch Supabase session:', err);
        setActiveSessionToken(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, newSession: any) => {
      setSession(newSession);
      if (newSession?.user) {
        const authUser: User = {
          id: newSession.user.id,
          email: newSession.user.email || '',
          role: (newSession.user.app_metadata?.role as 'ADMIN' | 'USER') || 'USER'
        };
        setUser(authUser);
        setToken(newSession.access_token);
        setActiveSessionToken(newSession.access_token);
      } else {
        setUser(null);
        setToken(null);
        setActiveSessionToken(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setActiveSessionToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSession(null);
    setActiveSessionToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('nfl_pickem_jwt_token');
      localStorage.removeItem('token');
      localStorage.removeItem('nfl_pickem_user');
      localStorage.removeItem('auth_user');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    logout();
  };

  const isAuthenticated = !!(session || (token && user));
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        loading,
        login,
        logout,
        signOut,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
