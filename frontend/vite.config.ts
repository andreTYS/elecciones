import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // El bundle "moderno" de Vite asume por defecto Safari 14+ (sintaxis ES2020:
  // ?., ??). Safari 11-13.3 (iPhone 6s/7/8 con iOS viejo) SI soporta
  // <script type="module"> pero NO esa sintaxis: el navegador cargaria el
  // bundle moderno (no el legacy) y fallaria en silencio -> pantalla blanca.
  // Bajar el target aqui tambien fuerza a esbuild a transpilar esa sintaxis
  // en el bundle moderno, cerrando ese hueco especifico de iPhone.
  build: {
    target: ['es2015', 'safari11'],
  },
  plugins: [
    react(),
    // Soporte para celulares muy antiguos sin soporte de ES Modules
    // (Android 5-6 con navegador de fabrica, Safari <10.1): genera un
    // segundo bundle legacy transpilado a ES5 con polyfills via core-js.
    legacy({
      targets: ['defaults', 'android >= 5', 'chrome >= 60', 'safari >= 11', 'not dead'],
      renderModernChunks: true,
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
