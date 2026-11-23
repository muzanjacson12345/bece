const CACHE = 'bece-v61';
const ASSETS = ['./', './index.html', './css/app.css', './css/motion.css', './js/01-theme-engine.js', './js/02-question-bank.js', './js/03-revision-notes.js', './js/04-learning-insights.js', './js/05-maths-content.js', './js/06-rme-content.js', './js/07-app-core.js', './js/08-app-module.js', './js/09-app-enhancements.js', './js/10-overview-ui-interactions.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './icon-180.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
