// SKA service worker: lets the installed app open with no signal and load faster on every phone and computer.
// It only keeps the app's own files (code, styles, icons) and the offline page. Pages and figures are never
// stored on the device, because they hold business records.

const VERSION = "ska-v1";
const FILES = `${VERSION}-files`;
const OFFLINE_URL = "/offline";
const MAX_FILES = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(FILES)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg", "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Built app files have a content hash in their name, so a stored copy is never out of date.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(fromCacheThenNetwork(request));
    return;
  }

  // Pages always come from the network; with no signal, show the offline page instead of the browser's error.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});

async function fromCacheThenNetwork(request) {
  const cache = await caches.open(FILES);
  const stored = await cache.match(request);
  if (stored) return stored;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    if (keys.length > MAX_FILES) await Promise.all(keys.slice(0, keys.length - MAX_FILES).map((key) => cache.delete(key)));
  }
  return response;
}
