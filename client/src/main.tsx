import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const DEFAULT_POOL_ID = '8b384090-1307-47f0-b355-3ada4228a050';
const DEFAULT_USER = {
  id: '4cbde3a9-6f8f-44cf-80fa-3c16c03810db',
  email: 'jack@nflpickem.com',
  name: 'Jack (You)',
  role: 'ADMIN',
};
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRjYmRlM2E5LTZmOGYtNDRjZi04MGZhLTNjMTZjMDM4MTBkYiIsImVtYWlsIjoiamFja0BuZmxwaWNrZW0uY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzkxMzQyNTY0LCJleHAiOjE4MjI4Nzg1NjR9.3dMJbe9Kx5jzHwQinBmfuS0ygIzWXFwF3XQm9WOBLig';

// Auto-inject default dev / commissioner credentials if missing in local/mobile storage
if (typeof window !== 'undefined') {
  try {
    const existingUser = localStorage.getItem('auth_user') || localStorage.getItem('nfl_pickem_user');
    const existingToken = localStorage.getItem('token') || localStorage.getItem('nfl_pickem_jwt_token');

    if (!existingUser) {
      localStorage.setItem('auth_user', JSON.stringify(DEFAULT_USER));
      localStorage.setItem('nfl_pickem_user', JSON.stringify(DEFAULT_USER));
    }
    if (!existingToken) {
      localStorage.setItem('token', DEFAULT_TOKEN);
      localStorage.setItem('nfl_pickem_jwt_token', DEFAULT_TOKEN);
    }
    if (!localStorage.getItem('active_pool_id')) {
      localStorage.setItem('active_pool_id', DEFAULT_POOL_ID);
    }
  } catch (e) {
    console.warn('Failed to access localStorage during initialization:', e);
  }
}

// Global API Interceptor for Capacitor & Mobile Testing
const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'http:' ||
    window.location.protocol === 'https:'
  ) ? 'http://192.168.1.18:3000' : ''
);

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Clone or initialize options
    const options: RequestInit = { ...(init || {}) };
    options.credentials = 'include';

    // Prepare headers
    const headers = new Headers(options.headers || (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined));
    
    // Resolve token & dev auth credentials
    const token = localStorage.getItem('token') || localStorage.getItem('nfl_pickem_jwt_token') || DEFAULT_TOKEN;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let userEmail = 'jack@nflpickem.com';
    let userRole = 'ADMIN';
    try {
      const stored = localStorage.getItem('auth_user') || localStorage.getItem('nfl_pickem_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) userEmail = parsed.email;
        if (parsed.role) userRole = parsed.role;
      }
    } catch {
      // fallback to defaults
    }

    if (!headers.has('x-user-email')) {
      headers.set('x-user-email', userEmail);
    }
    if (!headers.has('x-user-role')) {
      headers.set('x-user-role', userRole);
    }
    
    options.headers = headers;

    // If request is relative /api, prefix with API_BASE
    if (urlString.startsWith('/api')) {
      urlString = `${API_BASE}${urlString}`;
    }

    return originalFetch(urlString, options);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
