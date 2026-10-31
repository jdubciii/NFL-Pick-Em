import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';

let gitCommit = process.env.VITE_GIT_COMMIT || process.env.GITHUB_SHA || '';
if (!gitCommit) {
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    gitCommit = 'dev';
  }
}
const buildTime = new Date().toISOString();

export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS ? '/NFL-Pick-Em/' : '/'),
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    __APP_COMMIT_HASH__: JSON.stringify(gitCommit),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}));
