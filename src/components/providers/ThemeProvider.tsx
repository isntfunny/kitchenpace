'use client';

import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

type Theme = 'light' | 'dark';

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

export function ThemeProvider({ children }: ThemeProviderProps) {
    const computeInitialTheme = () => {
        if (typeof window === 'undefined') {
            return 'light' as Theme;
        }

        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        if (storedTheme) {
            return storedTheme;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const [theme, setThemeState] = useState<Theme>(computeInitialTheme);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const readyTimeout = window.setTimeout(() => setReady(true), 0);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event: MediaQueryListEvent) => {
            const hasOverride = Boolean(window.localStorage.getItem(THEME_STORAGE_KEY));
            if (!hasOverride) {
                setThemeState(event.matches ? 'dark' : 'light');
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
        document.documentElement.dataset.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [ready, theme]);

    const setTheme = useCallback((value: Theme) => {
        setThemeState(value);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
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

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }
    return context;
}
