import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api':       { target: 'http://localhost:9000', changeOrigin: true },
      '/auth':      { target: 'http://localhost:9000', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:9000', changeOrigin: true },
      '/inventory': { target: 'http://localhost:9000', changeOrigin: true },
      '/orders':    { target: 'http://localhost:9000', changeOrigin: true },
      '/invoices':  { target: 'http://localhost:9000', changeOrigin: true },
    },
  },
});
