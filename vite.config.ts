import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * `base: './'` rende il build portabile su GitHub Pages
 * (project site, custom domain, sottocartelle) senza dover
 * hardcodare il nome del repository.
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Nebula — Social Demo',
        short_name: 'Nebula',
        description:
          'Una demo di social network che vive interamente nel browser: SQLite (SQL.js) + IndexedDB, zero backend.',
        lang: 'it',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        theme_color: '#07070b',
        background_color: '#07070b',
        categories: ['social', 'productivity', 'developer'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
