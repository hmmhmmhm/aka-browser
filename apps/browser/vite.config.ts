import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: path.join(__dirname, 'src/renderer'),
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: path.join(__dirname, 'dist-renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, 'src/renderer/index.html'),
        'pages/blank-page': path.join(__dirname, 'src/renderer/pages/blank-page-entry.tsx'),
        'pages/error-page': path.join(__dirname, 'src/renderer/pages/error-page-entry.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep page entries in pages/ directory
          if (chunkInfo.name.startsWith('pages/')) {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  server: {
    port: 5173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
});
