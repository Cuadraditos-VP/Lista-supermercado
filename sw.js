/* Service worker de la Lista del súper.
   - Los archivos propios (página, ícono, manifiesto) se piden primero a internet,
     así cada cambio que subas a GitHub llega solo; si no hay señal, usa la copia guardada.
   - Las librerías de Firebase se guardan para que la app abra más rápido.
   - Los datos de la lista NO pasan por acá: van directo a Firebase.            */
const VERSION = "super-v5";
const PROPIOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(PROPIOS.map(u => new Request(u, { cache: "reload" }))))
      .catch(() => {})                       // si falta algún archivo, igual se instala
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Archivos de la app: primero internet, si falla la copia guardada
  if (url.origin === location.origin){
    e.respondWith(
      fetch(req, { cache: "no-cache" })   // siempre pregunta a GitHub si hay versión nueva
        .then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Librerías de Firebase (gstatic): copia guardada y se renueva en segundo plano
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")){
    e.respondWith(
      caches.open(VERSION).then(c => c.match(req).then(guardada => {
        const red = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => guardada);
        return guardada || red;
      }))
    );
  }
  // Todo lo demás (Firebase, IA) pasa directo
});
