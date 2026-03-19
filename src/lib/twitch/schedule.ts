import { ApiClient } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';

import { TWITCH_PROVIDER_ID } from '@app/lib/twitch/api';
import { prisma } from '@shared/prisma';

// ── Food & Drink category ────────────────────────────────────────────────────
// Twitch category ID for "Food & Drink" — stable, well-known value.
const FOOD_CATEGORY_ID = '509667';

// ── User API client ──────────────────────────────────────────────────────────
// Creates a twurple ApiClient authenticated as the user (not the app).
// Reads the OAuth tokens from Better Auth's `account` table and
// auto-refreshes when expired.

async function getUserApiClient(
    userId: string,
): Promise<{ client: ApiClient; twitchUserId: string } | null> {
    const account = await prisma.account.findFirst({
        where: { userId, providerId: TWITCH_PROVIDER_ID },
        select: {
            accessToken: true,
            refreshToken: true,
            accessTokenExpiresAt: true,
            accountId: true,
        },
    });

    if (!account?.accessToken || !account?.refreshToken) return null;

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });
    authProvider.addUser(
        account.accountId,
        {
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            expiresIn: account.accessTokenExpiresAt
                ? Math.floor((account.accessTokenExpiresAt.getTime() - Date.now()) / 1000)
                : 0,
            obtainmentTimestamp: Date.now(),
            scope: ['channel:manage:schedule'],
        },
        [],
    );

    // Persist refreshed tokens back to the DB
    authProvider.onRefresh(async (_userId, tokenData) => {
        await prisma.account.updateMany({
            where: { userId, providerId: TWITCH_PROVIDER_ID },
            data: {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken ?? undefined,
                accessTokenExpiresAt: tokenData.expiresIn
                    ? new Date(Date.now() + tokenData.expiresIn * 1000)
                    : undefined,
            },
        });
    });

    const client = new ApiClient({ authProvider });
    return { client, twitchUserId: account.accountId };
}

// ── Schedule CRUD ────────────────────────────────────────────────────────────

export interface ScheduleSegmentInput {
    title: string;
    startDate: Date;
    timezone: string;
    durationMinutes?: number;
}

/**
 * Create a schedule segment on the user's Twitch channel.
 * Returns the segment ID, or null if the user doesn't have Twitch linked
 * or lacks affiliate/partner status (403).
 */
export async function createScheduleSegment(
    userId: string,
    input: ScheduleSegmentInput,
): Promise<string | null> {
    const userClient = await getUserApiClient(userId);
    if (!userClient) return null;

    const { client, twitchUserId } = userClient;

    try {
        const segment = await client.schedule.createScheduleSegment(twitchUserId, {
            startDate: input.startDate.toISOString(),
            timezone: input.timezone,
            duration: input.durationMinutes ?? 120,
            isRecurring: false,
            title: input.title.slice(0, 140),
            categoryId: FOOD_CATEGORY_ID,
        });

        return segment.id;
    } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 403) {
            // Non-affiliate/partner — can't create one-off segments
            console.warn(
                '[Twitch Schedule] User is not affiliate/partner, skipping segment creation',
            );
            return null;
        }
        throw err;
    }
}

/**
 * Update an existing schedule segment.
 * Silently returns if the segment doesn't exist anymore (404).
 */
export async function updateScheduleSegment(
    userId: string,
    segmentId: string,
    input: ScheduleSegmentInput,
): Promise<void> {
    const userClient = await getUserApiClient(userId);
    if (!userClient) return;

    const { client, twitchUserId } = userClient;

    try {
        await client.schedule.updateScheduleSegment(twitchUserId, segmentId, {
            startDate: input.startDate.toISOString(),
            timezone: input.timezone,
            duration: input.durationMinutes ?? 120,
            title: input.title.slice(0, 140),
            categoryId: FOOD_CATEGORY_ID,
        });
    } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404) return; // Segment was deleted externally
        throw err;
    }
}

/**
 * Delete a schedule segment from the user's Twitch channel.
 * Silently returns if the segment doesn't exist anymore (404).
 */
export async function deleteScheduleSegment(userId: string, segmentId: string): Promise<void> {
    const userClient = await getUserApiClient(userId);
    if (!userClient) return;

    const { client, twitchUserId } = userClient;

    try {
        await client.schedule.deleteScheduleSegment(twitchUserId, segmentId);
    } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404) return; // Already gone
        throw err;
    }
}
