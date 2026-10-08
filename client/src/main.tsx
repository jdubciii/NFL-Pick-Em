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

// Global fetch interceptor
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    
    if (url.startsWith('/')) {
      const host = window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== ''
        ? window.location.hostname
        : '192.168.1.29';
      url = `http://${host}:3000${url}`;
    }

    const modifiedInit: RequestInit = {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.headers || {}),
        'x-user-email': 'jack@nflpickem.com',
        'x-user-role': 'ADMIN',
      },
    };

    return originalFetch(url, modifiedInit);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
