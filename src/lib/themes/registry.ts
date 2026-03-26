import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, SunMedium } from 'lucide-react';

import type { FeatureFlagName } from '@app/lib/flags/definitions';

/**
 * Central theme registry.
 *
 * To add a new theme (e.g. christmas, easter):
 * 1. Add an entry here with all properties
 * 2. Add a Panda CSS condition in panda.config.ts (e.g. christmas: '[data-theme="christmas"] &')
 * 3. Add _christmas overrides to semantic tokens in panda.config.ts
 * 4. Create src/app/{name}-overrides.css if the theme needs global CSS overrides
 * 5. Add the theme's inline colors to src/lib/themes/colors.ts
 */

export interface ThemeConfig {
    /** Unique key — used as data-theme attribute value and localStorage value */
    id: string;
    /** Display label (German) */
    label: string;
    /** Lucide icon component for the theme toggle */
    icon: LucideIcon;
    /** Logo path in /public */
    logo: string;
    /** Whether this theme is "dark" (affects useIsDark) */
    isDark: boolean;
    /** Whether to disable Framer Motion animations */
    disableMotion: boolean;
    /** Flipt feature flag that forces this theme when active. undefined = always available */
    featureFlag?: FeatureFlagName;
    /** Whether this theme is a base theme (shown in normal toggle) or a special/hidden theme */
    isBase: boolean;
}

export const THEME_REGISTRY: Record<string, ThemeConfig> = {
    light: {
        id: 'light',
        label: 'Heller Modus',
        icon: SunMedium,
        logo: '/kitchenpace.png',
        isDark: false,
        disableMotion: false,
        isBase: true,
    },
    dark: {
        id: 'dark',
        label: 'Dunkler Modus',
        icon: Moon,
        logo: '/kitchenpace.png',
        isDark: true,
        disableMotion: false,
        isBase: true,
    },
    retro: {
        id: 'retro',
        label: 'Retro 2010',
        icon: Monitor,
        logo: '/retro.jpg',
        isDark: false,
        disableMotion: true,
        featureFlag: 'retroTheme',
        isBase: false,
    },
};

export type ThemeId = keyof typeof THEME_REGISTRY;

/** All valid theme IDs */
export const VALID_THEME_IDS = new Set(Object.keys(THEME_REGISTRY));

/** Special themes activated via long-press or feature flag */
export const SPECIAL_THEMES = Object.values(THEME_REGISTRY).filter((t) => !t.isBase);

/** Get theme config, falling back to light */
export function getThemeConfig(id: string): ThemeConfig {
    return THEME_REGISTRY[id] ?? THEME_REGISTRY.light;
}
