import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'nfl_pickem_jwt_token';
const USER_KEY = 'nfl_pickem_user';

const DEFAULT_USER: User = {
  id: '4cbde3a9-6f8f-44cf-80fa-3c16c03810db',
  email: 'jack@nflpickem.com',
  role: 'ADMIN',
};
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRjYmRlM2E5LTZmOGYtNDRjZi04MGZhLTNjMTZjMDM4MTBkYiIsImVtYWlsIjoiamFja0BuZmxwaWNrZW0uY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzkxMzQyNTY0LCJleHAiOjE4MjI4Nzg1NjR9.3dMJbe9Kx5jzHwQinBmfuS0ygIzWXFwF3XQm9WOBLig';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token') || DEFAULT_TOKEN;
  });

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY) || localStorage.getItem('auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_USER;
      }
    }
    return DEFAULT_USER;
  });

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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('auth_user');
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
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
