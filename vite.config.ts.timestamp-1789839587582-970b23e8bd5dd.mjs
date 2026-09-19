// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    /* Replaces the old hand-rolled public/sw.js, which was cache-first over a
       precached index.html with fixed cache names -- so a returning user was
       pinned to whatever build they first loaded, forever. Workbox writes a
       precache manifest with a content revision per file, so dist/sw.js changes
       on every deploy that changes anything, the browser detects the update, and
       superseded precaches are dropped. */
    VitePWA({
      registerType: "prompt",
      // the new worker waits; src/components/dw/UpdateBanner.tsx surfaces it
      injectRegister: null,
      // registration lives in the React app, not an inline script
      manifest: false,
      // keep the hand-written public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        // OneSignal's worker is its own registration at /onesignal/ and must
        // never be precached or served through Workbox.
        globIgnores: ["**/onesignal/**", "**/sw-legacy-cleanup.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/onesignal\//, /^\/\.netlify\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // cleanupOutdatedCaches only knows about Workbox's own caches; the
        // pre-Workbox daily-wins-* caches would otherwise survive forever on
        // every existing installation.
        importScripts: ["/sw-legacy-cleanup.js"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIC8qIFJlcGxhY2VzIHRoZSBvbGQgaGFuZC1yb2xsZWQgcHVibGljL3N3LmpzLCB3aGljaCB3YXMgY2FjaGUtZmlyc3Qgb3ZlciBhXG4gICAgICAgcHJlY2FjaGVkIGluZGV4Lmh0bWwgd2l0aCBmaXhlZCBjYWNoZSBuYW1lcyAtLSBzbyBhIHJldHVybmluZyB1c2VyIHdhc1xuICAgICAgIHBpbm5lZCB0byB3aGF0ZXZlciBidWlsZCB0aGV5IGZpcnN0IGxvYWRlZCwgZm9yZXZlci4gV29ya2JveCB3cml0ZXMgYVxuICAgICAgIHByZWNhY2hlIG1hbmlmZXN0IHdpdGggYSBjb250ZW50IHJldmlzaW9uIHBlciBmaWxlLCBzbyBkaXN0L3N3LmpzIGNoYW5nZXNcbiAgICAgICBvbiBldmVyeSBkZXBsb3kgdGhhdCBjaGFuZ2VzIGFueXRoaW5nLCB0aGUgYnJvd3NlciBkZXRlY3RzIHRoZSB1cGRhdGUsIGFuZFxuICAgICAgIHN1cGVyc2VkZWQgcHJlY2FjaGVzIGFyZSBkcm9wcGVkLiAqL1xuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JywgLy8gdGhlIG5ldyB3b3JrZXIgd2FpdHM7IHNyYy9jb21wb25lbnRzL2R3L1VwZGF0ZUJhbm5lci50c3ggc3VyZmFjZXMgaXRcbiAgICAgIGluamVjdFJlZ2lzdGVyOiBudWxsLCAvLyByZWdpc3RyYXRpb24gbGl2ZXMgaW4gdGhlIFJlYWN0IGFwcCwgbm90IGFuIGlubGluZSBzY3JpcHRcbiAgICAgIG1hbmlmZXN0OiBmYWxzZSwgLy8ga2VlcCB0aGUgaGFuZC13cml0dGVuIHB1YmxpYy9tYW5pZmVzdC5qc29uXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3ZWJtYW5pZmVzdH0nXSxcbiAgICAgICAgLy8gT25lU2lnbmFsJ3Mgd29ya2VyIGlzIGl0cyBvd24gcmVnaXN0cmF0aW9uIGF0IC9vbmVzaWduYWwvIGFuZCBtdXN0XG4gICAgICAgIC8vIG5ldmVyIGJlIHByZWNhY2hlZCBvciBzZXJ2ZWQgdGhyb3VnaCBXb3JrYm94LlxuICAgICAgICBnbG9iSWdub3JlczogWycqKi9vbmVzaWduYWwvKionLCAnKiovc3ctbGVnYWN5LWNsZWFudXAuanMnXSxcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJy9pbmRleC5odG1sJyxcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9vbmVzaWduYWxcXC8vLCAvXlxcL1xcLm5ldGxpZnlcXC8vXSxcbiAgICAgICAgY2xlYW51cE91dGRhdGVkQ2FjaGVzOiB0cnVlLFxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXG4gICAgICAgIC8vIGNsZWFudXBPdXRkYXRlZENhY2hlcyBvbmx5IGtub3dzIGFib3V0IFdvcmtib3gncyBvd24gY2FjaGVzOyB0aGVcbiAgICAgICAgLy8gcHJlLVdvcmtib3ggZGFpbHktd2lucy0qIGNhY2hlcyB3b3VsZCBvdGhlcndpc2Ugc3Vydml2ZSBmb3JldmVyIG9uXG4gICAgICAgIC8vIGV2ZXJ5IGV4aXN0aW5nIGluc3RhbGxhdGlvbi5cbiAgICAgICAgaW1wb3J0U2NyaXB0czogWycvc3ctbGVnYWN5LWNsZWFudXAuanMnXSxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuKD86Z29vZ2xlYXBpc3xnc3RhdGljKVxcLmNvbVxcLy8sXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dvb2dsZS1mb250cycsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMjAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9LFxuICAgICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUd4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFPTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUE7QUFBQSxNQUNkLGdCQUFnQjtBQUFBO0FBQUEsTUFDaEIsVUFBVTtBQUFBO0FBQUEsTUFDVixTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsNENBQTRDO0FBQUE7QUFBQTtBQUFBLFFBRzNELGFBQWEsQ0FBQyxtQkFBbUIseUJBQXlCO0FBQUEsUUFDMUQsa0JBQWtCO0FBQUEsUUFDbEIsMEJBQTBCLENBQUMsa0JBQWtCLGdCQUFnQjtBQUFBLFFBQzdELHVCQUF1QjtBQUFBLFFBQ3ZCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUlkLGVBQWUsQ0FBQyx1QkFBdUI7QUFBQSxRQUN2QyxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZLEVBQUUsWUFBWSxJQUFJLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSTtBQUFBLGNBQ2hFLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxHQUFHLEdBQUcsRUFBRTtBQUFBLFlBQzFDO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
