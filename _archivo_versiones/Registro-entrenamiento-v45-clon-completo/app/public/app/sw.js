const CACHE = "registro-entrenamiento-v45";
const ASSETS = ["./", "index.html", "checkin.html", "styles.css?v=45", "vendor/pdf-lib-1.17.1.min.js?v=45", "pdf-export.js?v=45", "json-export.js?v=45", "history-tools.js?v=45", "exercise-metadata.js?v=45", "exercise-catalog.js?v=45", "day-templates.js?v=45", "parser.js?v=45", "historical-parser.js?v=45", "feedback-tools.js?v=45", "rest-timer-tools.js?v=45", "timer-sounds.js?v=45", "sync-queue.js?v=45", "gem-command-tools.js?v=45", "technical-data.js?v=45", "technical-tools.js?v=45", "app.js?v=45", "workout-note-review.js?v=45", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./")))
    );
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
