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

export async function autoRepairPoolMembership(
  userId: string,
  userEmail: string,
  token?: string | null
): Promise<'PENDING' | 'ACTIVE' | null> {
  const activePoolId = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';
  try {
    const { data, error } = await supabase
      .from('pool_memberships')
      .select('status')
      .eq('pool_id', activePoolId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // Missing membership row detected! Dispatch join route
      try {
        await fetch(`/api/pools/${activePoolId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-user-email': userEmail,
          },
          body: JSON.stringify({ inviteCode: 'MAIN26' }),
        });
      } catch (netErr) {
        console.warn('[AutoRepair] Join API dispatch notice:', netErr);
      }

      await supabase.from('pool_memberships').upsert({
        pool_id: activePoolId,
        user_id: userId,
        status: 'PENDING',
      });
      return 'PENDING';
    }
    return data.status as 'ACTIVE' | 'PENDING';
  } catch (err) {
    console.warn('[AutoRepair] Execution note:', err);
    return 'PENDING';
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'nfl_pickem_jwt_token';
const USER_KEY = 'nfl_pickem_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token') || null;
  });

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY) || localStorage.getItem('auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

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
            role: (currentSession.user.user_metadata?.role as 'ADMIN' | 'USER') || 'USER'
          };
          setUser(authUser);
          setToken(currentSession.access_token);
        }
      } catch (err) {
        console.warn('Failed to fetch Supabase session:', err);
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
          role: (newSession.user.user_metadata?.role as 'ADMIN' | 'USER') || 'USER'
        };
        setUser(authUser);
        setToken(newSession.access_token);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSession(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('auth_user');
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
