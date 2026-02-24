// sw.js
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/data/logo-IOS.png', // Ton icône existante
            badge: '/data/logo-IOS.png',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});