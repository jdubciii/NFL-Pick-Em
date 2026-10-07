import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

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
    
    // If request is relative /api, prefix with API_BASE when not on dev server with proxy
    if (urlString.startsWith('/api')) {
      urlString = `${API_BASE}${urlString}`;
      return originalFetch(urlString, init);
    }
    
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
