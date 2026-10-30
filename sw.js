// JainJoy offline support: the app shell, data and the astronomy library are cached so it opens without internet.
const CACHE = 'jainjoy-v2.3.1';
const V = '?v=2.3.1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './css/app.css' + V,
  './js/data/ingredients.js' + V, './js/data/regions-india.js' + V, './js/data/regions.js' + V, './js/data/steps.js' + V,
  './js/data/recipes-breakfast.js' + V, './js/data/recipes-lunch.js' + V, './js/data/recipes-dinner.js' + V, './js/data/recipes-snacks.js' + V, './js/data/nutrition.js' + V,
  './js/data/legacy-v1.js' + V, './js/engine/astro.js' + V, './js/engine/panchang.js' + V, './js/engine/compliance.js' + V,
  './js/engine/planner.js' + V, './js/db.js' + V, './js/i18n.js' + V, './js/config.js' + V, './js/app.js' + V];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];  // visitor counter (gc.zgo.at) is never cached
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // network first so updates show; cache fallback when offline
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (CDN.some(h => url.hostname.endsWith(h))) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
