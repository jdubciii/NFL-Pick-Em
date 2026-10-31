import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { cleanLegacyBootstrapStorage } from './lib/apiClient';

if (typeof window !== 'undefined') {
  cleanLegacyBootstrapStorage(localStorage);
}

const routerBasename = import.meta.env.BASE_URL || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
