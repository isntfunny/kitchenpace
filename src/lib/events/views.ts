import type { ActivityLog, Notification } from '@prisma/client';

import { hydrateActivityFeedItems, type ActivityFeedScope } from '@app/lib/activity-feed';

export type NotificationView = {
    id: string;
    title: string;
    message: string;
    type: string;
    data: Record<string, unknown> | null;
    read: boolean;
    createdAt: string;
};

export function serializeNotification(notification: Notification): NotificationView {
    return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: (notification.data as Record<string, unknown> | null) ?? null,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
    };
}

export async function serializeActivityLog(activity: ActivityLog, scope: ActivityFeedScope) {
    const items = await hydrateActivityFeedItems([activity], scope);
    return items[0] ?? null;
}
