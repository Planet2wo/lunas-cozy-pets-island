import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths so dist/ works from any folder or sub-path (itch.io, GitHub Pages, AI Studio)
  base: './',
  publicDir: 'public',
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});