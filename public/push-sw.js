/* Service worker of the administration (Z33) — push notifications only, no caching of pages. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/admin";
  event.waitUntil(
    self.registration.showNotification(data.title || "", {
      body: data.body || "",
      tag: data.tag,
      icon: "/pwa/icon/192",
      badge: "/pwa/icon/96",
      data: { url },
    }),
  );
});

// Click opens the target like in the bell: an open window of the app is reused.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then((c) => (c && "navigate" in c ? c.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
