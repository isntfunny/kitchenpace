import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';

import type { Session } from '@app/lib/auth';

import {
    getFeatureFlagDefaults,
    getFeatureFlagName,
    getFliptAuthToken,
    getFliptBaseUrl,
    getFliptEnvironmentKey,
    getFliptNamespaceKey,
} from './config';
import { FEATURE_FLAGS, type FeatureFlagName, type FeatureFlagValues } from './definitions';

export interface ServerFeatureFlagsResult {
    flags: FeatureFlagValues;
    allFlags: Record<string, boolean>;
    ready: boolean;
    provider: 'local' | 'flipt';
    error: string | null;
}

interface FliptBooleanFlag {
    key: string;
    type: string;
}

function normalizeRole(role?: string | null, isAuthenticated = false): string {
    switch (role) {
        case 'admin':
            return 'admin';
        case 'moderator':
            return 'mod';
        case 'user':
            return 'user';
        default:
            return isAuthenticated ? 'user' : 'guest';
    }
}

function buildEvaluationContext(session: Session | null): Record<string, string> {
    const isAuthenticated = Boolean(session?.user?.id);
    const context: Record<string, string> = {
        role: normalizeRole(session?.user?.role, isAuthenticated),
        authenticated: isAuthenticated ? 'true' : 'false',
    };

    if (session?.user?.id) {
        context.userId = session.user.id;
    }

    if (session?.user?.email) {
        context.email = session.user.email;
    }

    return context;
}

function getEntityId(session: Session | null): string {
    return session?.user?.id?.trim() || 'anonymous';
}

function getAuthHeaders(): HeadersInit {
    const token = getFliptAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function listBooleanFlags(): Promise<FliptBooleanFlag[]> {
    const response = await fetch(
        `${getFliptBaseUrl()}/internal/v1/evaluation/snapshot/namespace/${getFliptNamespaceKey()}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'x-flipt-accept-server-version': '1.47.0',
                'x-flipt-environment': getFliptEnvironmentKey(),
                ...getAuthHeaders(),
            },
            cache: 'no-store',
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to load Flipt snapshot (${response.status})`);
    }

    const payload = (await response.json()) as {
        flags?: Array<{ key?: string; type?: string }>;
    };

    return (payload.flags ?? []).filter(
        (flag): flag is FliptBooleanFlag =>
            typeof flag.key === 'string' && flag.type === 'BOOLEAN_FLAG_TYPE',
    );
}

async function evaluateBooleanFlag(
    flagKey: string,
    session: Session | null,
): Promise<[string, boolean]> {
    const response = await fetch(`${getFliptBaseUrl()}/evaluate/v1/boolean`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            flagKey,
            entityId: getEntityId(session),
            context: buildEvaluationContext(session),
            namespaceKey: getFliptNamespaceKey(),
            environmentKey: getFliptEnvironmentKey(),
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Failed to evaluate Flipt flag ${flagKey} (${response.status})`);
    }

    const payload = (await response.json()) as { enabled?: boolean };
    return [flagKey, payload.enabled === true];
}

function mapKnownFlags(
    allFlags: Record<string, boolean>,
    fallback: FeatureFlagValues,
): FeatureFlagValues {
    return {
        gestureNavigation:
            allFlags[getFeatureFlagName('gestureNavigation')] ?? fallback.gestureNavigation,
        helloWorldBanner:
            allFlags[getFeatureFlagName('helloWorldBanner')] ?? fallback.helloWorldBanner,
        aiRecipeConversion:
            allFlags[getFeatureFlagName('aiRecipeConversion')] ?? fallback.aiRecipeConversion,
        discordSignIn: allFlags[getFeatureFlagName('discordSignIn')] ?? fallback.discordSignIn,
        retroTheme: allFlags[getFeatureFlagName('retroTheme')] ?? fallback.retroTheme,
        twitchSignIn: allFlags[getFeatureFlagName('twitchSignIn')] ?? fallback.twitchSignIn,
    };
}

function getFallbackAllFlags(fallback: FeatureFlagValues): Record<string, boolean> {
    return Object.fromEntries(
        Object.entries(FEATURE_FLAGS).map(([name, key]) => [
            key,
            fallback[name as FeatureFlagName],
        ]),
    );
}

function getKnownFlagKeys(): string[] {
    return Object.values(FEATURE_FLAGS);
}

export async function getServerFeatureFlags(
    session: Session | null,
): Promise<ServerFeatureFlagsResult> {
    noStore();

    const fallback = getFeatureFlagDefaults();

    try {
        const discoveredFlags = await listBooleanFlags();
        const evaluatedEntries = await Promise.all(
            discoveredFlags.map((flag) => evaluateBooleanFlag(flag.key, session)),
        );
        const allFlags = Object.fromEntries(evaluatedEntries);

        return {
            flags: mapKnownFlags(allFlags, fallback),
            allFlags,
            ready: true,
            provider: 'flipt',
            error: null,
        };
    } catch (error) {
        try {
            const evaluatedEntries = await Promise.all(
                getKnownFlagKeys().map((flagKey) => evaluateBooleanFlag(flagKey, session)),
            );
            const allFlags = Object.fromEntries(evaluatedEntries);

            return {
                flags: mapKnownFlags(allFlags, fallback),
                allFlags,
                ready: true,
                provider: 'flipt',
                error:
                    error instanceof Error
                        ? error.message
                        : 'Feature-Flags konnten serverseitig nicht geladen werden.',
            };
        } catch {
            // Fall back to local defaults if Flipt is unavailable.
        }

        return {
            flags: fallback,
            allFlags: getFallbackAllFlags(fallback),
            ready: true,
            provider: 'local',
            error:
                error instanceof Error
                    ? error.message
                    : 'Feature-Flags konnten serverseitig nicht geladen werden.',
        };
    }
}
