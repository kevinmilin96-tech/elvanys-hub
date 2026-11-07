// Agorys — service worker (07/11/2026) : reçoit les alertes envoyées par le facteur et les affiche ; un toucher ouvre
// Agorys à la bonne page (data.url = « #/post/… », « #/conv/… », « #/agenda »). Rien d'autre (pas de cache).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const titre = data.title || 'Agorys';
  const options = {
    body: data.body || '',
    tag: data.tag || 'agorys',
    icon: new URL('agorys-192.png', self.registration.scope).href,
    badge: new URL('agorys-192.png', self.registration.scope).href,
    vibrate: [150, 80, 150],
    renotify: true,
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const base = self.registration.scope; // https://…/agorys/
  const url = base + (event.notification.data && event.notification.data.url ? String(event.notification.data.url) : '#/');
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
    for (const c of liste) { if (c.url.indexOf(base) === 0 && 'focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(url);
    return null;
  }));
});
