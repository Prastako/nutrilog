/* NutriLog service worker.
   This file exists because a service worker cannot be inlined into the HTML:
   the browser will only register a worker from a real same origin script file.
   index.html is fetched from the network first, so replacing index.html on
   GitHub Pages is enough to update the app; the cache is only the offline
   fallback. Data files are requested with ?v=<version> and served from the
   cache first, so the 1 MB food database downloads once per version. */

const CACHE = 'nutrilog-shell-0.2.3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  /* Never touch calls to Anthropic, Open Food Facts or GitHub. */
  if (url.origin !== self.location.origin) return;

  if (url.pathname.indexOf('/data/') >= 0 && url.search.indexOf('v=') >= 0) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => null);
        }
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => null);
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
