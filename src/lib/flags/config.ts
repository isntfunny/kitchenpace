import 'server-only';

import {
    DEFAULT_FEATURE_FLAG_VALUES,
    FEATURE_FLAGS,
    type FeatureFlagName,
    type FeatureFlagValues,
} from './definitions';

const DEFAULT_FLIPT_URL = 'https://feature.isntfunny.de';
const DEFAULT_FLIPT_ENVIRONMENT = 'KitchenPace';
const DEFAULT_FLIPT_NAMESPACE = 'default';

function isEnabled(value: string | undefined): boolean {
    if (!value) return false;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function getFeatureFlagDefaults(): FeatureFlagValues {
    return {
        ...DEFAULT_FEATURE_FLAG_VALUES,
        gestureNavigation: isEnabled(process.env.FEATURE_GESTURE_NAVIGATION),
        helloWorldBanner: isEnabled(process.env.FEATURE_HELLO_WORLD_BANNER),
        simulateTwitchLive: isEnabled(process.env.FEATURE_SIMULATE_TWITCH_LIVE),
    };
}

export function getFliptBaseUrl(): string {
    return (process.env.FLIPT_URL || DEFAULT_FLIPT_URL).trim().replace(/\/$/, '');
}

export function getFliptEnvironmentKey(): string {
    return DEFAULT_FLIPT_ENVIRONMENT;
}

export function getFliptNamespaceKey(): string {
    return DEFAULT_FLIPT_NAMESPACE;
}

export function getFliptAuthToken(): string | null {
    return process.env.FLIPT_AUTH_TOKEN?.trim() || null;
}

export function getFeatureFlagName(flag: FeatureFlagName): string {
    return FEATURE_FLAGS[flag];
}
