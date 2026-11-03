import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { OwnerAdminApp } from './OwnerAdminApp';

const rootElement = document.getElementById('owner-root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AuthProvider>
        <HashRouter>
          <OwnerAdminApp />
        </HashRouter>
      </AuthProvider>
    </StrictMode>
  );
}
