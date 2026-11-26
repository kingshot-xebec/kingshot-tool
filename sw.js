/**
 * ks tool PWA Service Worker（Network-First + HTTPキャッシュ回避・Firebase非干渉）
 * - 外部通信（Firebase Realtime Database・Firebase SDK・Gemini API等）は一切キャッシュせず素通りします。
 * - HTML/CSS/JS は常にサーバーから最新（cache: "no-store"）を優先取得し、オフライン時のみキャッシュを返します。
 */
const CACHE_NAME = "ks-tool-pwa-v2";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/common.css",
  "./assets/firebase-init.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./map/",
  "./map/manifest.webmanifest",
  "./bear/",
  "./bear/manifest.webmanifest",
  "./notice/",
  "./notice/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: "no-store" })).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Firebase・Google API・外部CDN等は一切干渉せず素通り
  if (url.origin !== self.location.origin) return;

  const isCodeOrDoc =
    req.mode === "navigate" ||
    /\.(?:html?|css|js|webmanifest)$/i.test(url.pathname) ||
    url.pathname.endsWith("/");

  const fetchReq = isCodeOrDoc
    ? new Request(req.url, { method: "GET", cache: "no-store", credentials: "same-origin" })
    : req;

  event.respondWith(
    fetch(fetchReq)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./")))
  );
});
