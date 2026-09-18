/* Imported by the Workbox-generated service worker.

   Workbox's cleanupOutdatedCaches only removes its own superseded precaches. The
   caches below were created by the previous hand-rolled public/sw.js, whose names
   were hardcoded and whose cleanup code could therefore never match them. Without
   this, every existing installation would keep serving a stale index.html out of
   daily-wins-static-v1 indefinitely. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name.startsWith('daily-wins-')).map((name) => caches.delete(name))
      )
    )
  );
});
