import { prisma } from '@shared/prisma';

type WebPushLib = {
    setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
    sendNotification: (
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
        payload: string,
    ) => Promise<unknown>;
};

type PushPayload = {
    title: string;
    body: string;
    url: string;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:info@kuechentakt.de';

let webpush: WebPushLib | null = null;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    import('web-push').then((mod) => {
        webpush = mod.default ?? (mod as unknown as WebPushLib);
        webpush!.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    });
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!webpush) return;

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush!.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys as { p256dh: string; auth: string },
                    },
                    JSON.stringify(payload),
                );
            } catch (err: unknown) {
                const statusCode = (err as { statusCode?: number }).statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                }
            }
        }),
    );
}
