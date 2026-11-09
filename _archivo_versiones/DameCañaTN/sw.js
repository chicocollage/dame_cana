const CACHE = "damecanatn-titanium-v10";
const ASSETS = [
  "./",
  "index.html",
  "checkin.html",
  "styles.css?v=tn7",
  "vendor/pdf-lib-1.17.1.min.js?v=tn7",
  "pdf-export.js?v=tn7",
  "json-export.js?v=tn7",
  "history-tools.js?v=tn7",
  "exercise-metadata.js?v=tn7",
  "exercise-catalog.js?v=tn7",
  "day-templates.js?v=tn7",
  "parser.js?v=tn7",
  "historical-parser.js?v=tn7",
  "feedback-tools.js?v=tn7",
  "rest-timer-tools.js?v=tn7",
  "timer-sounds.js?v=tn7",
  "sync-queue.js?v=tn7",
  "gem-command-tools.js?v=tn7",
  "technical-data.js?v=tn7",
  "technical-tools.js?v=tn7",
  "app.js?v=tn7",
  "workout-note-review.js?v=tn7",
  "apex-tn-ui.js?v=tn7",
  "damecanatn.webmanifest",
  "dclog-icon.svg",
  "dclog-icon.svg?v=tn7",
  "dclog-icon-192.png",
  "dclog-icon-512.png",
  "dclog-maskable-512.png",
  "dclog-apple-touch-icon.png",
  "dclog-apple-touch-icon.png?v=tn7",
  "assets/holo/glute.webp",
  "assets/holo/quads.webp",
  "assets/holo/hamstrings.webp",
  "assets/holo/back.webp",
  "assets/holo/chest.webp",
  "assets/holo/chest_clavicular.webp",
  "assets/holo/chest_sternal.webp",
  "assets/holo/shoulders.webp",
  "assets/holo/deltoid_lateral.webp",
  "assets/holo/deltoid_posterior.webp",
  "assets/holo/arms.webp",
  "assets/holo/triceps_longhead.webp",
  "assets/holo/triceps_lateral.webp",
  "assets/holo/biceps_longhead.webp",
  "assets/holo/core.webp"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network First para desarrollo y actualizaciones en vivo
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.url.startsWith("http")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./")))
  );
});

