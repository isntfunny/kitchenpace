import type { Notification, Prisma } from '@prisma/client';

import { resolveNotificationHref } from '@app/components/notifications/utils';
import { sendPushToUser } from '@app/lib/push/send';
import { publishRealtimeEvent } from '@app/lib/realtime/broker';
import { prisma } from '@shared/prisma';

import { serializeActivityLog, serializeNotification } from './views';

type CreateNotificationInput = {
    userId: string;
    type: Prisma.NotificationCreateInput['type'];
    title: string;
    message: string;
    data?: Prisma.InputJsonValue;
};

type CreateActivityLogInput = {
    userId: string;
    type: Prisma.ActivityLogCreateInput['type'];
    targetId?: string | null;
    targetType?: string | null;
    metadata?: Prisma.InputJsonValue;
    publishGlobal?: boolean;
};

export async function createUserNotification(
    input: CreateNotificationInput,
): Promise<Notification> {
    const notification = await prisma.notification.create({
        data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            ...(input.data ? { data: input.data } : {}),
        },
    });

    const view = serializeNotification(notification);
    publishRealtimeEvent(`notifications:user:${input.userId}`, {
        id: view.id,
        createdAt: view.createdAt,
        type: 'notification.created',
        payload: view,
    }).catch((err) => console.error('[Realtime] Failed to publish notification event', err));

    const pushUrl = resolveNotificationHref({
        data: (notification.data as Record<string, unknown> | null) ?? {},
        type: notification.type,
    });
    sendPushToUser(input.userId, {
        title: input.title,
        body: input.message,
        url: pushUrl,
    }).catch((err) => console.error('[Push] Failed to send push notification', err));

    return notification;
}

export async function createActivityLog(input: CreateActivityLogInput) {
    const activity = await prisma.activityLog.create({
        data: {
            userId: input.userId,
            type: input.type,
            targetId: input.targetId ?? null,
            targetType: input.targetType ?? null,
            ...(input.metadata ? { metadata: input.metadata } : {}),
        },
    });

    const [globalItem, userItem] = await Promise.all([
        input.publishGlobal === false
            ? Promise.resolve(null)
            : serializeActivityLog(activity, 'global'),
        serializeActivityLog(activity, { type: 'user', userId: input.userId }),
    ]);

    if (globalItem) {
        publishRealtimeEvent('activity:global', {
            id: globalItem.id,
            createdAt: globalItem.createdAt,
            type: 'activity.created',
            payload: globalItem,
        }).catch((err) => console.error('[Realtime] Failed to publish activity:global event', err));
    }

    if (userItem) {
        publishRealtimeEvent(`activity:user:${input.userId}`, {
            id: userItem.id,
            createdAt: userItem.createdAt,
            type: 'activity.created',
            payload: userItem,
        }).catch((err) => console.error('[Realtime] Failed to publish activity:user event', err));
    }

    return activity;
}
