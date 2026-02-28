'use strict';

self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    const title = data.title ?? 'KüchenTakt';
    const options = {
        body: data.body ?? 'Neue Aktivität in deiner Küche',
        icon: '/kitchenpace.png',
        badge: '/favicon.ico',
        data: {
            url: data.url ?? '/',
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url;
    event.waitUntil(
        (async () => {
            const clientsList = await clients.matchAll({
                type: 'window',
                includeUncontrolled: true,
            });
            for (const client of clientsList) {
                if ('focus' in client) {
                    await client.focus();
                    await client.navigate(url);
                    return;
                }
            }
            if (url && 'openWindow' in clients) {
                await clients.openWindow(url);
            }
        })(),
    );
});
