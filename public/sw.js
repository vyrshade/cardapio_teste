const CACHE = 'pecaja_{{BUILD_ID}}';;
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];


self.addEventListener('install', e => {
  self.skipWaiting();
});


self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});


self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});


self.addEventListener('message', e => {  
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
