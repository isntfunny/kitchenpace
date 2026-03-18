'use client';

import { MotionConfig } from 'motion/react';
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';
import { VALID_THEME_IDS, getThemeConfig, type ThemeId } from '@app/lib/themes/registry';

export type Theme = ThemeId;

const THEME_STORAGE_KEY = 'kitchenpace-theme';

type ThemeContextValue = {
    theme: Theme;
    setTheme: (value: Theme) => void;
    toggleTheme: () => void;
    ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

/** Returns the ID of a flag-forced special theme, or undefined. */
function useForcedTheme(): ThemeId | undefined {
    const retroFlag = useFeatureFlag('retroTheme');
    return retroFlag ? 'retro' : undefined;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const forcedTheme = useForcedTheme();

    const computeInitialTheme = () => {
        if (typeof window === 'undefined') {
            return 'light' as Theme;
        }

        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme && VALID_THEME_IDS.has(storedTheme)) {
            return storedTheme as Theme;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const [userTheme, setUserTheme] = useState<Theme>(computeInitialTheme);
    const [ready, setReady] = useState(false);

    // Feature flag overrides user preference
    const theme: Theme = forcedTheme ?? userTheme;
    const config = getThemeConfig(theme);

    useEffect(() => {
        const readyTimeout = window.setTimeout(() => setReady(true), 0);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event: MediaQueryListEvent) => {
            const hasOverride = Boolean(window.localStorage.getItem(THEME_STORAGE_KEY));
            if (!hasOverride) {
                setUserTheme(event.matches ? 'dark' : 'light');
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            mediaQuery.addListener(handleChange);
        }

        return () => {
            window.clearTimeout(readyTimeout);
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    useEffect(() => {
        if (!ready) return;
        document.documentElement.setAttribute('data-theme', theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [ready, theme]);

    const setTheme = useCallback((value: Theme) => {
        setUserTheme(value);
    }, []);

    const toggleTheme = useCallback(() => {
        setUserTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            setTheme,
            toggleTheme,
            ready,
        }),
        [ready, setTheme, theme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>
            <MotionConfig reducedMotion={config.disableMotion ? 'always' : 'user'}>
                {children}
            </MotionConfig>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }
    return context;
}
