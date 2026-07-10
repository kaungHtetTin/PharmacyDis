const CACHE_VERSION = 'sales-pwa-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PRECACHE_URLS = [
  '/sales/dashboard',
  '/sales/new-order',
  '/sales/orders',
  '/favicon.png',
  '/logo.png',
  '/pwa/sales-icon-192.png',
  '/pwa/sales-icon-512.png',
  '/build/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))))
      .then(() => precacheBuildAssets())
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('sales-pwa-') && key !== APP_SHELL_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (url.pathname.startsWith('/build/assets/') || url.pathname === '/favicon.png' || url.pathname === '/logo.png') {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith('/sales/')) {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(APP_SHELL_CACHE);
  cache.put(request, response.clone());

  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());

    return response;
  } catch (error) {
    return caches.match(request);
  }
}

async function precacheBuildAssets() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const response = await fetch('/build/manifest.json', { cache: 'no-store' });

  if (!response.ok) {
    return;
  }

  const manifest = await response.json();
  const urls = Object.values(manifest)
    .flatMap((entry) => [entry.file, ...(entry.css || [])])
    .filter(Boolean)
    .map((path) => `/build/${path}`);

  await Promise.all(urls.map((url) => cache.add(url).catch(() => null)));
}
