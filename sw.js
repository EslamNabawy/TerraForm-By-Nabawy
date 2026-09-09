/**
 * TERRAFORM BY NABAWY — SERVICE WORKER (sw.js)
 * True offline support: precaches the app shell (pages, styles, scripts,
 * search/drill data, notes) on install; runtime-caches same-origin GETs
 * (including the lite PDFs once downloaded) for later offline visits.
 * PDFs are NOT precached — they are too large to fetch up front.
 */
const CACHE = 'tf-nabawy-v1';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './offline-data.js',
  './search_index.json',
  './exam_drills.json',
  './favicon.svg',
  './books/book-reader.css',
  './books/book-reader.js',
  './books/vol1-foundations.html',
  './books/vol2-production.html',
  './books/lab.html',
  './books/exam-center.html',
  './notes/09-alb-walkthrough.md',
  './notes/17-what-is-terraform-facts.md',
  './notes/18-terraform-init.md',
  './notes/19-providers-catalog.md',
  './notes/20-core-cli-commands.md',
  './notes/21-state-file-what-why.md',
  './notes/22-state-commands.md',
  './notes/23-fmt-and-destroy.md',
  './notes/24-more-cli-commands.md',
  './notes/25-provisioners-doctrine.md',
  './notes/26-capstone-hands-on-chain.md',
  './code-modules-evolution/README.md',
  './code-modules-evolution/stage1-no-vars-no-loop-no-module/main.tf',
  './code-modules-evolution/stage2-vars-no-loop-no-module/main.tf',
  './code-modules-evolution/stage3-vars-loop-no-module/main.tf',
  './code-modules-evolution/stage4-vars-loop-module/main.tf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Only same-origin GETs (lets HEAD size-probes and cross-origin hits pass through).
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then(
      hit =>
        hit ||
        fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
