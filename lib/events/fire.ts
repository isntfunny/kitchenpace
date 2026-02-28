import type { ActivityLog, Notification, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { trackServerEvent } from '@/lib/openpanel';
import { prisma } from '@/lib/prisma';

import {
    EVENT_DEFINITIONS,
    NOTIFICATION_PREFERENCE_DEFAULTS,
    type EventDataMap,
    type EventName,
    type NotificationContext,
    type NotificationDefinition,
    type NotificationProfile,
} from './config';

type NotificationTarget = {
    id: string;
    profile: NotificationProfile | null;
};

export type EventPayload<T extends EventName> = {
    event: T;
    actorId: string;
    recipientId?: string;
    data: EventDataMap[T];
    metadata?: Record<string, unknown>;
    revalidatePaths?: string[];
    trackProperties?: Record<string, string | number | boolean>;
    skipActivity?: boolean;
};

export type FireEventResult = {
    activity: ActivityLog | null;
    notification: Notification | null;
};

export async function fireEvent<T extends EventName>(
    payload: EventPayload<T>,
): Promise<FireEventResult> {
    const definition = EVENT_DEFINITIONS[payload.event];
    const actor = await prisma.user.findUnique({
        where: { id: payload.actorId },
        include: { profile: true },
    });

    if (!actor) {
        throw new Error('ACTOR_NOT_FOUND');
    }

    const recipientPromise =
        definition.notification && payload.recipientId && payload.recipientId !== payload.actorId
            ? prisma.user.findUnique({
                  where: { id: payload.recipientId },
                  include: { profile: true },
              })
            : Promise.resolve(null);

    const recipient = await recipientPromise;
    const actorName = actor.profile?.nickname ?? actor.name ?? 'Ein Koch';
    const actorAnonymized = actor.profile?.showInActivity === false;
    const actorLabel = actorAnonymized ? 'Jemand' : actorName;

    const context: NotificationContext<T> = {
        actorLabel,
        actorAnonymized,
        actorId: actor.id,
        data: payload.data,
        recipientId: payload.recipientId,
        recipientProfile: (recipient?.profile ?? null) as NotificationProfile | null,
    };

    const metadataFromDefinition = definition.activity.getMetadata?.(context);
    const metadataPayload =
        metadataFromDefinition || payload.metadata
            ? { ...(metadataFromDefinition ?? {}), ...(payload.metadata ?? {}) }
            : undefined;

    const activity = payload.skipActivity
        ? null
        : await prisma.activityLog.create({
              data: {
                  userId: actor.id,
                  type: definition.activity.type,
                  targetId: definition.activity.getTargetId(context) ?? null,
                  targetType: definition.activity.targetType,
                  ...(metadataPayload
                      ? { metadata: metadataPayload as Prisma.InputJsonValue }
                      : {}),
              },
          });

    let notification = null;

    if (definition.notification && recipient) {
        const recipientContext = {
            id: recipient.id,
            profile: (recipient.profile ?? null) as NotificationProfile | null,
        };
        const shouldNotify = shouldCreateNotification(
            definition.notification,
            context,
            recipientContext,
        );

        if (shouldNotify) {
            const notificationPayload = definition.notification.getData?.(context) ?? {
                actorId: context.actorId,
                ...context.data,
            };
            const template = definition.notification.template(context);
            notification = await prisma.notification.create({
                data: {
                    userId: recipient.id,
                    type: definition.notification.type,
                    title: template.title,
                    message: template.message,
                    data: notificationPayload as Prisma.InputJsonValue,
                },
            });
        }
    }

    if (definition.tracking) {
        const defaultProperties = definition.tracking.getProperties?.(context) ?? {};
        const mergedProperties = {
            ...defaultProperties,
            ...(payload.trackProperties ?? {}),
        };
        trackServerEvent(definition.tracking.name, mergedProperties, { profileId: actor.id });
    }

    if (payload.revalidatePaths?.length) {
        await Promise.all(payload.revalidatePaths.map((path) => revalidatePath(path)));
    }

    return { activity, notification };
}

function shouldCreateNotification<T extends EventName>(
    definition: NotificationDefinition<T>,
    context: NotificationContext<T>,
    recipient: NotificationTarget,
): boolean {
    // Allow self-notifications for SYSTEM type (e.g., welcome messages)
    if (recipient.id === context.actorId && definition.type !== 'SYSTEM') {
        return false;
    }

    const preference = recipient.profile?.[definition.preference];
    const isPreferenceEnabled =
        preference ?? NOTIFICATION_PREFERENCE_DEFAULTS[definition.preference];

    if (!isPreferenceEnabled) {
        return false;
    }

    if (context.actorAnonymized && !(recipient.profile?.notifyOnAnonymous ?? false)) {
        return false;
    }

    return true;
}
