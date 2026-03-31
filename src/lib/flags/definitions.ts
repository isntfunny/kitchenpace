export const FEATURE_FLAGS = {
    gestureNavigation: 'gesture-navigation',
    helloWorldBanner: 'hello-world-banner',
    aiRecipeConversion: 'ai-recipe-conversion',
    discordSignIn: 'discord-sign-in',
    retroTheme: 'retro-theme',
    twitchSignIn: 'twitch-sign-in',
    simulateTwitchLive: 'simulate-twitch-live',
    collections: 'collections',
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export type FeatureFlagValues = Record<FeatureFlagName, boolean>;

export const DEFAULT_FEATURE_FLAG_VALUES: FeatureFlagValues = {
    gestureNavigation: false,
    helloWorldBanner: false,
    aiRecipeConversion: false,
    discordSignIn: false,
    retroTheme: false,
    twitchSignIn: false,
    simulateTwitchLive: false,
    collections: false,
};
