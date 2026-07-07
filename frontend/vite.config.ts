import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Soporte para celulares antiguos (Android 5+, Safari 11+): genera un
    // bundle legacy con polyfills ademas del moderno; sin esto los telefonos
    // viejos quedan en pantalla blanca al no poder parsear ES2020+.
    legacy({
      targets: ['defaults', 'android >= 5', 'chrome >= 60', 'safari >= 11', 'not dead'],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'VotoControl Moquegua 2026',
        short_name: 'VotoControl',
        description: 'Sistema de fiscalización electoral — ERM Moquegua 2026',
        theme_color: '#1B3A6B',
        background_color: '#0f1729',
        display: 'standalone',
        start_url: '/',
        lang: 'es-PE',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/candidatos/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-candidatos', expiration: { maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
