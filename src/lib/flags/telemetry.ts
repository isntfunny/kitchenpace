export function getActiveFeatureFlags(flags: Record<string, boolean>): string[] {
    return Object.entries(flags)
        .filter(([, enabled]) => enabled)
        .map(([flag]) => flag)
        .sort();
}

export function buildFeatureFlagTelemetryPayload(input: {
    flags: Record<string, boolean>;
    provider: 'local' | 'flipt';
    ready: boolean;
    error: string | null;
}) {
    return {
        provider: input.provider,
        ready: input.ready,
        error: input.error,
        active: getActiveFeatureFlags(input.flags),
        all: input.flags,
    };
}
