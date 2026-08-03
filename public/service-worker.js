const CACHE='doch20-v15';
const CORE=['/','/index.html','/styles.css','/app.js?v=15.0.0','/manifest.webmanifest','/icon.svg'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(url.pathname.startsWith('/api/')){
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy));
        return response;
      })
      .catch(()=>caches.match(req).then(hit=>hit||caches.match('/index.html')))
  );
});
