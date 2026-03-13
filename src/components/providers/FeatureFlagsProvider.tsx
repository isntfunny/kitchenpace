'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import * as Sentry from '@sentry/nextjs';
import { createContext, useContext, useEffect, useMemo } from 'react';

import type { FeatureFlagName } from '@app/lib/flags/definitions';
import type { ServerFeatureFlagsResult } from '@app/lib/flags/server';
import { buildFeatureFlagTelemetryPayload } from '@app/lib/flags/telemetry';

type FeatureFlagsContextValue = ServerFeatureFlagsResult;

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

interface FeatureFlagsProviderProps {
    children: React.ReactNode;
    initialState: ServerFeatureFlagsResult;
}

export function FeatureFlagsProvider({ children, initialState }: FeatureFlagsProviderProps) {
    const op = useOpenPanel();
    const telemetry = useMemo(
        () =>
            buildFeatureFlagTelemetryPayload({
                flags: initialState.allFlags,
                provider: initialState.provider,
                ready: initialState.ready,
                error: initialState.error,
            }),
        [initialState.allFlags, initialState.error, initialState.provider, initialState.ready],
    );

    useEffect(() => {
        op.setGlobalProperties({
            featureFlags: telemetry.all,
            activeFeatureFlags: telemetry.active,
            featureFlagProvider: telemetry.provider,
            featureFlagsReady: telemetry.ready,
        });

        Sentry.setContext('feature_flags', {
            provider: telemetry.provider,
            ready: telemetry.ready,
            active: telemetry.active,
            all: telemetry.all,
            error: telemetry.error,
        });
        Sentry.setTag('feature_flags.provider', telemetry.provider);
        Sentry.setTag('feature_flags.ready', telemetry.ready ? 'true' : 'false');
    }, [op, telemetry.active, telemetry.all, telemetry.error, telemetry.provider, telemetry.ready]);

    return (
        <FeatureFlagsContext.Provider value={initialState}>{children}</FeatureFlagsContext.Provider>
    );
}

export function useFeatureFlag(flag: FeatureFlagName): boolean {
    const context = useContext(FeatureFlagsContext);
    if (!context) {
        throw new Error('useFeatureFlag must be used within FeatureFlagsProvider');
    }

    return context.flags[flag];
}

export function useFeatureFlagsStatus(): Omit<FeatureFlagsContextValue, 'flags' | 'allFlags'> {
    const context = useContext(FeatureFlagsContext);
    if (!context) {
        throw new Error('useFeatureFlagsStatus must be used within FeatureFlagsProvider');
    }

    return {
        ready: context.ready,
        provider: context.provider,
        error: context.error,
    };
}
