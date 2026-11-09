// CHRONOS Service Worker：アプリ本体をキャッシュして、オフラインでも開けるようにする
const CACHE = "chronos-v1";
const FONT_CACHE = "keikaku-fonts";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin){
    // ページ本体はネット優先（更新がすぐ届く）、圏外ならキャッシュ
    if (req.mode === "navigate"){
      e.respondWith(
        fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return res; })
          .catch(() => caches.match("./index.html"))
      );
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res;
    })));
    return;
  }

  // Google Fonts はキャッシュを先に返し、裏で更新
  if (/^fonts.(googleapis|gstatic).com$/.test(url.hostname)){
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
