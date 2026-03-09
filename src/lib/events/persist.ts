import type { ActivityType, Notification, Prisma } from '@prisma/client';

import { resolveNotificationHref } from '@app/components/notifications/utils';
import { sendPushToUser } from '@app/lib/push/send';
import { publishRealtimeEvent } from '@app/lib/realtime/broker';
import { prisma } from '@shared/prisma';

import { serializeActivityLog, serializeNotification } from './views';

const DEDUPLICATION_WINDOW_MINUTES = 30;

type Strategy = 'upsert' | 'append';

const ACTIVITY_STRATEGIES: Record<ActivityType, Strategy> = {
    RECIPE_RATED: 'upsert',
    RECIPE_FAVORITED: 'append',
    RECIPE_UNFAVORITED: 'append',
    RECIPE_CREATED: 'append',
    RECIPE_COOKED: 'append',
    RECIPE_COMMENTED: 'append',
    USER_FOLLOWED: 'append',
    USER_REGISTERED: 'append',
    USER_ACTIVATED: 'append',
    MEAL_PLAN_CREATED: 'append',
    SHOPPING_LIST_CREATED: 'append',
};

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

async function findRecentActivity(
    userId: string,
    type: ActivityType,
    targetId: string | null,
): Promise<{ id: string; createdAt: Date } | null> {
    const since = new Date(Date.now() - DEDUPLICATION_WINDOW_MINUTES * 60 * 1000);

    return prisma.activityLog.findFirst({
        where: {
            userId,
            type,
            targetId: targetId ?? null,
            createdAt: { gte: since },
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });
}

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
    const strategy = ACTIVITY_STRATEGIES[input.type];
    const targetId = input.targetId ?? null;

    // Handle UPSERT strategy: update existing entry within time window instead of creating new one
    if (strategy === 'upsert' && targetId) {
        const existing = await findRecentActivity(input.userId, input.type, targetId);
        if (existing) {
            const updated = await prisma.activityLog.update({
                where: { id: existing.id },
                data: {
                    createdAt: new Date(),
                    ...(input.metadata ? { metadata: input.metadata } : {}),
                },
            });
            return updated;
        }
    }

    const activity = await prisma.activityLog.create({
        data: {
            userId: input.userId,
            type: input.type,
            targetId: targetId,
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
