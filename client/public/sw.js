/**
 * The offline shell.
 *
 * Clinch is a page you open on a Sunday evening, often on a phone, often on a
 * train. Installed to a home screen it looked like an app but still opened like
 * a website: a blank screen until the network answered. This makes a cold open
 * instant, and makes a signal-less one show the last table you saw rather than
 * a browser error.
 *
 * Nothing here changes the "no state on disk" rule the server keeps — every
 * byte of this lives in the reader's own browser cache, and clearing site data
 * removes all of it.
 *
 * Three rules, and the reasoning matters more than the code:
 *
 *  - **Navigations go to the network first.** The shell is only served from
 *    cache when the network actually fails. Cache-first would be faster still
 *    and is the usual advice, but it means a deploy cannot reach a reader who
 *    keeps the app installed — and this app ships several times a week.
 *  - **Fingerprinted files go to the cache first.** Everything under /assets/
 *    carries a content hash, and the logos and fonts are content-stable, so a
 *    hit is always correct and a miss just fetches.
 *  - **The snapshot is cached, but only ever served when the network fails**,
 *    and then it is marked stale on the way out, so the page shows the banner
 *    it already has for old data instead of quietly presenting last Sunday's
 *    table as this Sunday's.
 *
 * What is deliberately not touched: `/api/stream`, because an event stream is
 * a connection that never finishes and must not be buffered or replayed; the
 * calendar routes, whose `Content-Disposition` is the whole point of them; and
 * anything that isn't a GET.
 *
 * To retire this worker, ship one whose `install` calls
 * `self.registration.unregister()` — deleting the file only leaves the last
 * installed copy running.
 */

/** Bump to evict everything a previous version cached. */
const VERSION = "v1";
const SHELL = `clinch-shell-${VERSION}`;
const ASSETS = `clinch-assets-${VERSION}`;
const DATA = `clinch-data-${VERSION}`;
const MINE = [SHELL, ASSETS, DATA];

/** The document every route is served from; also the offline fallback. */
const SHELL_URL = "/";

const ASSET_PATHS = ["/assets/", "/logos/", "/fonts/", "/icons/"];
const ASSET_FILES = ["/favicon.svg", "/manifest.webmanifest"];

/** API responses worth keeping for an offline open, longest prefix first. */
const CACHEABLE_API = [
  "/api/snapshot",
  "/api/season/",
  "/api/week/",
];

/** A game's JSON — but not its calendar routes, which are downloads. */
const GAME_JSON = /^\/api\/game\/\d+$/;

/**
 * The shell, plus the files it names.
 *
 * This worker is a plain file the bundler never sees, so it cannot know this
 * build's fingerprinted filenames — but the shell it just fetched does, in its
 * own `<script>`, `<link>` and preload tags. Reading them back out is what
 * makes the *first* visit survive going offline; without it nothing but the
 * HTML is cached until the reader comes back online at least once, and the
 * app would open to an unstyled page.
 *
 * Logos are left to runtime caching: there are 32 of them, only a few are on
 * screen at a time, and they are not worth a quarter of a megabyte on install.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL);
  const response = await fetch(SHELL_URL, { cache: "reload" });
  if (!storable(response)) return;
  await cache.put(SHELL_URL, response.clone());

  const html = await response.text();
  const referenced = [...html.matchAll(/["'(](\/(?:assets|fonts)\/[A-Za-z0-9._-]+)["')]/g)].map((m) => m[1]);
  if (referenced.length === 0) return;

  const assets = await caches.open(ASSETS);
  await Promise.all(
    [...new Set(referenced)].map((href) =>
      assets.add(new Request(href, { cache: "reload" })).catch(() => undefined),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheShell()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !MINE.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Only a real, own-origin 200 is worth keeping. */
function storable(response) {
  return response && response.status === 200 && response.type === "basic";
}

function isAsset(url) {
  return (
    ASSET_PATHS.some((prefix) => url.pathname.startsWith(prefix)) ||
    ASSET_FILES.includes(url.pathname)
  );
}

function isCacheableApi(url) {
  return CACHEABLE_API.some((prefix) => url.pathname.startsWith(prefix)) || GAME_JSON.test(url.pathname);
}

/** Cache first: these never change under a given URL. */
async function fromCacheFirst(request) {
  const hit = await caches.match(request, { cacheName: ASSETS });
  if (hit) return hit;

  const response = await fetch(request);
  if (storable(response)) {
    const copy = response.clone();
    void caches.open(ASSETS).then((cache) => cache.put(request, copy));
  }
  return response;
}

/**
 * Network first, cache as a fallback. The fallback is the interesting half:
 * without it an offline open is a browser error page, and with it the reader
 * gets the last table they were shown.
 */
async function fromNetworkFirst(request, cacheName, onFallback) {
  try {
    // `no-store`, because otherwise "network first" quietly means "HTTP cache
    // first": the browser can answer this fetch from its own cache, and then a
    // stale snapshot arrives looking live and a redeployed shell never lands.
    // Measured — both happened before this argument was here.
    const response = await fetch(request, { cache: "no-store" });
    if (storable(response)) {
      const copy = response.clone();
      void caches.open(cacheName).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch (error) {
    const hit = await caches.match(request, { cacheName });
    if (hit) return onFallback ? onFallback(hit) : hit;
    throw error;
  }
}

/**
 * A snapshot pulled from the cache is, by definition, not live — so it goes out
 * carrying the same `stale` flag the server sets when its own poll is failing,
 * and the page renders the banner it already has for that. Better a table with
 * a date on it than a table pretending to be current.
 */
async function markStale(response) {
  try {
    const snapshot = await response.clone().json();
    return new Response(JSON.stringify({ ...snapshot, stale: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return response;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The event stream, and the two calendar routes, are passed straight through.
  if (url.pathname.startsWith("/api/stream")) return;

  if (request.mode === "navigate") {
    // Every route is served the same document, so one cached entry answers all
    // of them — including a `?game=` link, which would otherwise put a copy of
    // the shell in the cache per game.
    //
    // Fetched by URL rather than by passing the request on: a navigation
    // request cannot be re-created with different options (the constructor
    // rejects mode "navigate"), and `no-store` is the whole point here.
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(SHELL_URL, { cache: "no-store", credentials: "same-origin" });
          if (storable(response)) {
            const copy = response.clone();
            void caches.open(SHELL).then((cache) => cache.put(SHELL_URL, copy));
          }
          return response;
        } catch {
          return (await caches.match(SHELL_URL, { cacheName: SHELL })) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(fromCacheFirst(request));
    return;
  }

  if (isCacheableApi(url)) {
    const stale = url.pathname === "/api/snapshot" ? markStale : undefined;
    event.respondWith(fromNetworkFirst(request, DATA, stale));
  }
});
