import { NextRequest, NextResponse } from 'next/server';

import { getRealtimeRedis } from '@app/lib/realtime/redis';
import { verifyWebhookSignature } from '@app/lib/twitch/api';
import { prisma } from '@shared/prisma';
import { addTwitchStreamOfflineJob, addTwitchStreamOnlineJob } from '@worker/queues/index';

const TWITCH_MESSAGE_TYPE_HEADER = 'twitch-eventsub-message-type';
const TWITCH_MESSAGE_ID_HEADER = 'twitch-eventsub-message-id';
const MESSAGE_DEDUP_TTL = 600; // 10 minutes, matching the timestamp replay window

// ── Twitch EventSub webhook types ──────────────────────────────────────────

interface EventSubSubscription {
    id: string;
    type: string;
    condition: {
        broadcaster_user_id: string;
    };
}

interface EventSubBody {
    challenge?: string;
    subscription: EventSubSubscription;
    event?: {
        broadcaster_user_id: string;
        broadcaster_user_login: string;
        broadcaster_user_name: string;
        id?: string;
        started_at?: string;
    };
}

/**
 * POST /api/twitch/webhook
 *
 * Receives Twitch EventSub webhook notifications for stream.online / stream.offline events.
 * No auth check — this endpoint is called by Twitch's servers.
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();

    const messageType = request.headers.get(TWITCH_MESSAGE_TYPE_HEADER);

    if (!messageType) {
        return NextResponse.json({ error: 'Missing message type header' }, { status: 400 });
    }

    let body: EventSubBody;
    try {
        body = JSON.parse(rawBody) as EventSubBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ── Callback verification (Twitch handshake) ───────────────────────────

    if (messageType === 'webhook_callback_verification') {
        const broadcasterId = body.subscription?.condition?.broadcaster_user_id;
        if (!broadcasterId || !body.challenge) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Only confirm handshake for broadcasters we actually registered
        const knownStream = await prisma.twitchStream.findFirst({
            where: { user: { profile: { twitchId: broadcasterId } } },
            select: { id: true },
        });
        if (!knownStream) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return new NextResponse(body.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // ── Revocation ─────────────────────────────────────────────────────────

    if (messageType === 'revocation') {
        console.warn('[Twitch Webhook] Subscription revoked', {
            subscriptionId: body.subscription.id,
            type: body.subscription.type,
            broadcasterUserId: body.subscription.condition.broadcaster_user_id,
        });
        return NextResponse.json({ ok: true });
    }

    // ── Notification ───────────────────────────────────────────────────────

    if (messageType !== 'notification') {
        return NextResponse.json({ error: 'Unknown message type' }, { status: 400 });
    }

    const broadcasterUserId = body.subscription.condition.broadcaster_user_id;

    // Look up the TwitchStream record by matching the broadcaster's Twitch ID on Profile
    const twitchStream = await prisma.twitchStream.findFirst({
        where: { user: { profile: { twitchId: broadcasterUserId } } },
    });

    if (!twitchStream || !twitchStream.eventSubSecret) {
        console.warn('[Twitch Webhook] Unknown broadcaster or missing secret', {
            broadcasterUserId,
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify HMAC signature
    if (!verifyWebhookSignature(request.headers, rawBody, twitchStream.eventSubSecret)) {
        console.warn('[Twitch Webhook] Invalid signature', {
            broadcasterUserId,
            subscriptionType: body.subscription.type,
        });
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Deduplicate: reject replayed messages within the 10-minute window
    const messageId = request.headers.get(TWITCH_MESSAGE_ID_HEADER);
    if (!messageId) {
        return NextResponse.json({ error: 'Missing message ID' }, { status: 400 });
    }
    const redis = getRealtimeRedis();
    const isNew = await redis.set(`twitch:msg:${messageId}`, '1', 'EX', MESSAGE_DEDUP_TTL, 'NX');
    if (!isNew) {
        return NextResponse.json({ ok: true });
    }

    // Dispatch based on subscription type
    const subscriptionType = body.subscription.type;

    if (subscriptionType === 'stream.online') {
        const startedAt = body.event?.started_at ?? new Date().toISOString();
        const twitchStreamId = body.event?.id ?? null;

        console.info('[Twitch Webhook] Stream online', {
            userId: twitchStream.userId,
            twitchStreamId,
            startedAt,
        });

        await addTwitchStreamOnlineJob(twitchStream.userId, twitchStreamId ?? '', startedAt);
    } else if (subscriptionType === 'stream.offline') {
        console.info('[Twitch Webhook] Stream offline', {
            userId: twitchStream.userId,
        });

        await addTwitchStreamOfflineJob(twitchStream.userId);
    } else {
        console.warn('[Twitch Webhook] Unhandled subscription type', { subscriptionType });
    }

    return NextResponse.json({ ok: true });
}
