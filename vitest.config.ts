import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'client/node_modules/react'),
      'react-dom': path.resolve(__dirname, 'client/node_modules/react-dom'),
      'lucide-react': path.resolve(__dirname, 'client/node_modules/lucide-react'),
    },
  },
  test: {
    pool: 'threads',
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    watch: false,
  },
});
