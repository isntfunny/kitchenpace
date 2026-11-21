'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import { createContext, useContext, useEffect, useMemo } from 'react';

import type { FeatureFlagName } from '@app/lib/flags/definitions';
import type { ServerFeatureFlagsResult } from '@app/lib/flags/server';
import { buildFeatureFlagTelemetryPayload } from '@app/lib/flags/telemetry';
import { setClientTelemetryContext } from '@app/lib/telemetry/client';

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

        setClientTelemetryContext({
            featureFlagProvider: telemetry.provider,
            featureFlagsReady: telemetry.ready,
        });
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
