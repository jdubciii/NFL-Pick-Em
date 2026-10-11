import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const DEFAULT_POOL_ID = '0f497f1b-9002-49bd-ad2a-68ae34cb8afd';
const DEFAULT_USER = {
  id: '4cbde3a9-6f8f-44cf-80fa-3c16c03810db',
  email: 'jack@nflpickem.com',
  name: 'Jack (You)',
  role: 'ADMIN',
};
const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRjYmRlM2E5LTZmOGYtNDRjZi04MGZhLTNjMTZjMDM4MTBkYiIsImVtYWlsIjoiamFja0BuZmxwaWNrZW0uY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzkxMzQyNTY0LCJleHAiOjE4MjI4Nzg1NjR9.3dMJbe9Kx5jzHwQinBmfuS0ygIzWXFwF3XQm9WOBLig';

if (typeof window !== 'undefined') {
  try {
    localStorage.setItem('auth_user', JSON.stringify(DEFAULT_USER));
    localStorage.setItem('nfl_pickem_user', JSON.stringify(DEFAULT_USER));
    localStorage.setItem('token', DEFAULT_TOKEN);
    localStorage.setItem('nfl_pickem_jwt_token', DEFAULT_TOKEN);
    localStorage.setItem('pool_id', DEFAULT_POOL_ID);
    localStorage.setItem('nfl_pickem_pool_id', DEFAULT_POOL_ID);
  } catch (e) {
    console.error('Failed to seed default credentials', e);
  }

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    const BACKEND_BASE = 'http://192.168.1.18:3000';

    if (url.startsWith('/api') || url.startsWith('api/')) {
      url = BACKEND_BASE + (url.startsWith('/') ? '' : '/') + url;
    } else if (url.includes('localhost/api')) {
      url = url.replace(/^https?:\/\/localhost(:\d+)?\/api/, BACKEND_BASE + '/api');
    }

    const modifiedInit = init ? { ...init } : {};
    const headers = new Headers(modifiedInit.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', 'Bearer ' + DEFAULT_TOKEN);
    }
    if (!headers.has('x-user-email')) {
      headers.set('x-user-email', 'jack@nflpickem.com');
    }
    if (!headers.has('x-user-role')) {
      headers.set('x-user-role', 'ADMIN');
    }
    if (!headers.has('x-pool-id')) {
      headers.set('x-pool-id', DEFAULT_POOL_ID);
    }
    modifiedInit.headers = headers;

    if (input instanceof Request) {
      return originalFetch(new Request(url, modifiedInit));
    }
    return originalFetch(url, modifiedInit);
  };
}

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);


