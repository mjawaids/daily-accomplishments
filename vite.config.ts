import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// Calendar version (YYYY.MM.DD.N). deploy.yml stamps it into package.json in CI;
// git keeps a 0.0.0 placeholder, which is what local builds show.
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? version) },
  plugins: [
    react(),
    /* Replaces the old hand-rolled public/sw.js, which was cache-first over a
       precached index.html with fixed cache names -- so a returning user was
       pinned to whatever build they first loaded, forever. Workbox writes a
       precache manifest with a content revision per file, so dist/sw.js changes
       on every deploy that changes anything, the browser detects the update, and
       superseded precaches are dropped. */
    VitePWA({
      registerType: 'prompt', // the new worker waits; src/components/dw/UpdateBanner.tsx surfaces it
      injectRegister: null, // registration lives in the React app, not an inline script
      manifest: false, // keep the hand-written public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // OneSignal's worker is its own registration at /onesignal/ and must
        // never be precached or served through Workbox.
        globIgnores: ['**/onesignal/**', '**/sw-legacy-cleanup.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/onesignal\//, /^\/\.netlify\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // cleanupOutdatedCaches only knows about Workbox's own caches; the
        // pre-Workbox daily-wins-* caches would otherwise survive forever on
        // every existing installation.
        importScripts: ['/sw-legacy-cleanup.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Keeps the app chunk under Vite's 500 kB warning limit and lets the
        // rarely-changing vendor code stay cached across deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
