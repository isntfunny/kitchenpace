import { createHmac, timingSafeEqual } from 'crypto';

import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';

// ── Singleton client ────────────────────────────────────────────────────────

let apiClient: ApiClient | null = null;

function getApiClient(): ApiClient {
    if (!apiClient) {
        const clientId = process.env.TWITCH_CLIENT_ID;
        const clientSecret = process.env.TWITCH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set');
        }
        const authProvider = new AppTokenAuthProvider(clientId, clientSecret);
        apiClient = new ApiClient({ authProvider });
    }
    return apiClient;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface TwitchUser {
    id: string;
    login: string;
    displayName: string;
    profileImageUrl: string;
}

/**
 * Look up a Twitch user by login name.
 * Returns null if the user doesn't exist.
 */
export async function getTwitchUser(login: string): Promise<TwitchUser | null> {
    const client = getApiClient();
    const user = await client.users.getUserByName(login);
    if (!user) return null;
    return {
        id: user.id,
        login: user.name,
        displayName: user.displayName,
        profileImageUrl: user.profilePictureUrl,
    };
}

/**
 * Get current stream info for a Twitch user.
 * Returns null if the user is not live.
 */
export async function getTwitchStream(twitchUserId: string) {
    const client = getApiClient();
    const stream = await client.streams.getStreamByUserId(twitchUserId);
    if (!stream) return null;
    return {
        id: stream.id,
        title: stream.title,
        viewerCount: stream.viewers,
        startedAt: stream.startDate,
        thumbnailUrl: stream.thumbnailUrl,
        gameName: stream.gameName,
    };
}

// ── EventSub management ─────────────────────────────────────────────────────

const EVENTSUB_CALLBACK_URL =
    process.env.TWITCH_EVENTSUB_CALLBACK_URL ?? 'http://localhost:3000/api/twitch/webhook';

/**
 * Create stream.online and stream.offline EventSub subscriptions for a broadcaster.
 * Returns both subscription IDs.
 */
export async function createStreamEventSubs(
    twitchUserId: string,
    secret: string,
): Promise<{ onlineId: string; offlineId: string }> {
    const client = getApiClient();
    const transport = { method: 'webhook' as const, callback: EVENTSUB_CALLBACK_URL, secret };

    const [online, offline] = await Promise.all([
        client.eventSub.subscribeToStreamOnlineEvents(twitchUserId, transport),
        client.eventSub.subscribeToStreamOfflineEvents(twitchUserId, transport),
    ]);

    return { onlineId: online.id, offlineId: offline.id };
}

/**
 * Delete an EventSub subscription by ID.
 */
export async function deleteEventSubSubscription(subscriptionId: string): Promise<void> {
    const client = getApiClient();
    await client.eventSub.deleteSubscription(subscriptionId);
}

// ── Webhook signature verification ──────────────────────────────────────────

const TWITCH_MESSAGE_ID_HEADER = 'twitch-eventsub-message-id';
const TWITCH_MESSAGE_TIMESTAMP_HEADER = 'twitch-eventsub-message-timestamp';
const TWITCH_MESSAGE_SIGNATURE_HEADER = 'twitch-eventsub-message-signature';

/**
 * Verify the HMAC-SHA256 signature of a Twitch EventSub webhook request.
 * Returns true if the signature is valid.
 */
export function verifyWebhookSignature(headers: Headers, rawBody: string, secret: string): boolean {
    const messageId = headers.get(TWITCH_MESSAGE_ID_HEADER);
    const timestamp = headers.get(TWITCH_MESSAGE_TIMESTAMP_HEADER);
    const expectedSig = headers.get(TWITCH_MESSAGE_SIGNATURE_HEADER);

    if (!messageId || !timestamp || !expectedSig) return false;

    // Reject messages older than 10 minutes (replay protection)
    const messageAge = Date.now() - new Date(timestamp).getTime();
    if (messageAge > 10 * 60 * 1000) return false;

    const hmacMessage = messageId + timestamp + rawBody;
    const computedSig = 'sha256=' + createHmac('sha256', secret).update(hmacMessage).digest('hex');

    try {
        return timingSafeEqual(Buffer.from(computedSig), Buffer.from(expectedSig));
    } catch {
        return false;
    }
}
