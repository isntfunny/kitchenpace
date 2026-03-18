import crypto from 'crypto';

import { Job } from 'bullmq';

import { publishRealtimeEvent } from '@app/lib/realtime/broker';
import {
    createStreamEventSubs,
    deleteEventSubSubscription,
    getTwitchStream,
} from '@app/lib/twitch/api';

import { prisma } from './prisma';
import {
    TwitchHealthCheckJob,
    TwitchRegisterEventSubJob,
    TwitchStreamOfflineJob,
    TwitchStreamOnlineJob,
    TwitchUnregisterEventSubJob,
} from './types';

export async function processRegisterEventSub(
    job: Job<TwitchRegisterEventSubJob>,
): Promise<{ onlineId: string; offlineId: string }> {
    const { userId, twitchId } = job.data;

    console.log(`[Twitch] Processing register-eventsub job ${job.id}`, { userId, twitchId });

    try {
        // Persist secret BEFORE calling Twitch API so retries reuse the same secret
        // (avoids orphaning subscriptions signed with a different secret on retry).
        // upsert returns the record — existing secret is preserved on update (no-op),
        // new secret is generated on create.
        const record = await prisma.twitchStream.upsert({
            where: { userId },
            create: { userId, eventSubSecret: crypto.randomUUID() },
            update: {},
            select: { eventSubSecret: true },
        });

        const secret = record.eventSubSecret!;

        // Now register with Twitch using the persisted secret
        const { onlineId, offlineId } = await createStreamEventSubs(twitchId, secret);

        // Store the subscription IDs
        await prisma.twitchStream.update({
            where: { userId },
            data: {
                eventSubOnlineId: onlineId,
                eventSubOfflineId: offlineId,
            },
        });

        console.log(`[Twitch] Registered EventSub for user ${userId}`, { onlineId, offlineId });

        return { onlineId, offlineId };
    } catch (error) {
        console.error(`[Twitch] register-eventsub job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processUnregisterEventSub(
    job: Job<TwitchUnregisterEventSubJob>,
): Promise<{ deleted: boolean }> {
    const { userId, eventSubOnlineId, eventSubOfflineId } = job.data;

    console.log(`[Twitch] Processing unregister-eventsub job ${job.id}`, { userId });

    try {
        const deletePromises: Promise<void>[] = [];

        if (eventSubOnlineId) {
            deletePromises.push(
                deleteEventSubSubscription(eventSubOnlineId).catch((err) => {
                    console.warn(`[Twitch] Failed to delete online EventSub ${eventSubOnlineId}`, {
                        error: err instanceof Error ? err.message : String(err),
                    });
                }),
            );
        }

        if (eventSubOfflineId) {
            deletePromises.push(
                deleteEventSubSubscription(eventSubOfflineId).catch((err) => {
                    console.warn(
                        `[Twitch] Failed to delete offline EventSub ${eventSubOfflineId}`,
                        {
                            error: err instanceof Error ? err.message : String(err),
                        },
                    );
                }),
            );
        }

        await Promise.all(deletePromises);

        await prisma.twitchStream.delete({
            where: { userId },
        });

        console.log(`[Twitch] Unregistered EventSub and deleted TwitchStream for user ${userId}`);

        return { deleted: true };
    } catch (error) {
        console.error(`[Twitch] unregister-eventsub job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processStreamOnline(
    job: Job<TwitchStreamOnlineJob>,
): Promise<{ updated: boolean }> {
    const { userId, twitchStreamId, startedAt } = job.data;

    console.log(`[Twitch] Processing stream-online job ${job.id}`, { userId, twitchStreamId });

    try {
        // Fetch current stream info from Twitch API before the DB write
        // so we can do a single atomic update (avoids race with offline events)
        const profile = await prisma.profile.findFirst({
            where: { userId },
            select: { twitchId: true },
        });

        const streamInfo = profile?.twitchId ? await getTwitchStream(profile.twitchId) : null;

        // Single atomic update with all stream data
        const twitchStream = await prisma.twitchStream.update({
            where: { userId },
            data: {
                isLive: true,
                twitchStreamId,
                startedAt: new Date(startedAt),
                endedAt: null,
                title: streamInfo?.title ?? undefined,
                viewerCount: streamInfo?.viewerCount ?? undefined,
            },
        });

        // Create ActivityLog entry + publish realtime event concurrently
        await Promise.all([
            prisma.activityLog.create({
                data: {
                    userId,
                    type: 'STREAM_STARTED',
                    targetId: twitchStream.id,
                    targetType: 'TwitchStream',
                    metadata: {
                        twitchStreamId,
                        title: streamInfo?.title ?? null,
                        gameName: streamInfo?.gameName ?? null,
                    },
                },
            }),
            publishRealtimeEvent('activity:global', {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                type: 'STREAM_STARTED',
                payload: {
                    userId,
                    twitchStreamId,
                    title: streamInfo?.title ?? null,
                    gameName: streamInfo?.gameName ?? null,
                },
            }),
        ]);

        console.log(`[Twitch] Stream online for user ${userId}`, {
            title: streamInfo?.title,
        });

        return { updated: true };
    } catch (error) {
        console.error(`[Twitch] stream-online job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processStreamOffline(
    job: Job<TwitchStreamOfflineJob>,
): Promise<{ updated: boolean }> {
    const { userId } = job.data;

    console.log(`[Twitch] Processing stream-offline job ${job.id}`, { userId });

    try {
        await prisma.twitchStream.update({
            where: { userId },
            data: {
                isLive: false,
                endedAt: new Date(),
            },
        });

        console.log(`[Twitch] Stream offline for user ${userId}`);

        return { updated: true };
    } catch (error) {
        console.error(`[Twitch] stream-offline job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processHealthCheck(
    job: Job<TwitchHealthCheckJob>,
): Promise<{ checked: number }> {
    console.log(`[Twitch] Processing health-check job ${job.id}`);

    try {
        const streams = await prisma.twitchStream.findMany({
            where: {
                eventSubOnlineId: { not: null },
            },
            select: {
                id: true,
                userId: true,
                eventSubOnlineId: true,
                eventSubOfflineId: true,
            },
        });

        // TODO: Verify each EventSub subscription still exists via Twitch API
        // For now, just log the count of active subscriptions
        console.log(`[Twitch] Health check: ${streams.length} active EventSub subscriptions`);

        return { checked: streams.length };
    } catch (error) {
        console.error(`[Twitch] health-check job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
