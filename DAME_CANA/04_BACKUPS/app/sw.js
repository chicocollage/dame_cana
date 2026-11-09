const CACHE = "registro-entrenamiento-v50";
const ASSETS = ["./", "index.html", "checkin.html", "styles.css?v=50", "vendor/pdf-lib-1.17.1.min.js?v=50", "pdf-export.js?v=50", "json-export.js?v=50", "history-tools.js?v=50", "exercise-metadata.js?v=50", "exercise-catalog.js?v=50", "day-templates.js?v=50", "parser.js?v=50", "historical-parser.js?v=50", "feedback-tools.js?v=50", "rest-timer-tools.js?v=50", "timer-sounds.js?v=50", "sync-queue.js?v=50", "gem-command-tools.js?v=50", "technical-data.js?v=50", "technical-tools.js?v=50", "app.js?v=50", "workout-note-review.js?v=50", "manifest.webmanifest", "manifest.webmanifest?v=50", "dclog.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "dclog-icon.svg", "dclog-icon.svg?v=50", "dclog-icon-192.png", "dclog-icon-512.png", "dclog-maskable-512.png", "dclog-apple-touch-icon.png", "dclog-apple-touch-icon.png?v=50"];

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
