import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for Mewsy chat widget frontend.
// In production, the built output (dist/) is served statically by the Hono backend.
// In development, the Vite dev server proxies API requests to the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /webhook/ requests to the backend during development
    proxy: {
      '/webhook': 'http://localhost:4010',
    },
  },
  build: {
    outDir: 'dist',
  },
});
