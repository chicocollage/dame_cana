const CACHE = "damecanatn-aire-v17";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./checkin.html",
  "./biohacks.html",
  "./styles.css",
  "./damecanatn.webmanifest",
  "./dclog.webmanifest",
  "./manifest.webmanifest",
  "./dclog-icon.svg",
  "./dclog-icon-192.png",
  "./dclog-icon-512.png",
  "./dclog-maskable-512.png",
  "./dclog-apple-touch-icon.png",
  "./app.js",
  "./apex-tn-ui.js",
  "./parser.js",
  "./day-templates.js",
  "./exercise-catalog.js",
  "./exercise-metadata.js",
  "./history-tools.js",
  "./historical-parser.js",
  "./feedback-tools.js",
  "./rest-timer-tools.js",
  "./timer-sounds.js",
  "./sync-queue.js",
  "./technical-data.js",
  "./technical-tools.js",
  "./workout-note-review.js",
  "./json-export.js",
  "./pdf-export.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        CORE_ASSETS.map((url) =>
          fetch(url, { cache: "reload" }).then((res) => {
            if (res && res.ok) return cache.put(url, res);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html", { ignoreSearch: true });
          }
          return Response.error();
        })
      )
  );
});
