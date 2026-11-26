/* ADS (Abi Digital Solutions) — service worker (ringan): halaman utama bisa dibuka cepat & offline */
const VER = "ads-v16";
const CORE = ["./", "index.html", "style.css", "script.js", "bugs.js", "assets/hero-hp.webp", "assets/hero-pc.webp", "manifest.webmanifest", "favicon.png", "apple-touch-icon.png",
  "assets/logo-wide.webp", "assets/tex/wood-dark.webp", "assets/tex/wood-light.webp", "assets/tex/grain.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const swr = (req) => caches.open(VER).then(c => c.match(req).then(hit => {
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {           // halaman: online dulu, cadangan dari cache
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put("index.html", cp)); } return r; })
      .catch(() => caches.match("index.html").then(r => r || caches.match("./"))));
    return;
  }
  if (url.origin === location.origin && /\.(css|js|webmanifest)$/.test(url.pathname)) {   // kode: online dulu agar update langsung terlihat
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; }).catch(() => caches.match(req)));
    return;
  }
  if (url.origin === location.origin || /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) e.respondWith(swr(req));
});
