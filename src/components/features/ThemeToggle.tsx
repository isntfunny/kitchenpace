'use client';

import { useCallback, useRef, useState } from 'react';

import { useTheme } from '@app/components/providers/ThemeProvider';
import { SPECIAL_THEMES, getThemeConfig } from '@app/lib/themes/registry';

import { css } from 'styled-system/css';

const toggleStyles = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    width: '12',
    height: '12',
    minWidth: '44px',
    minHeight: '44px',
    border: '1px solid',
    borderColor: 'border.milk',
    background: 'surface.elevated',
    color: 'foreground',
    boxShadow: 'shadow.medium',
    transition: 'all 150ms ease',
    cursor: 'pointer',
    _hover: {
        borderColor: 'accent',
        boxShadow: {
            base: '0 4px 24px rgba(224,123,83,0.15)',
            _dark: '0 4px 24px rgba(224,123,83,0.12)',
        },
    },
    _focusVisible: {
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.35)',
            _dark: '0 0 0 3px rgba(224,123,83,0.3)',
        },
    },
    _active: {
        transform: 'scale(0.97)',
    },
    '&[data-state="on"]': {
        background: 'accent',
        borderColor: 'accent',
        color: 'surface',
    },
});

const LONG_PRESS_MS = 1500;
const MORPH_DELAY_MS = 500;

/** The special theme activated by long-press (first non-base theme in registry) */
const LONG_PRESS_THEME = SPECIAL_THEMES[0];
const LONG_PRESS_CONFIG = LONG_PRESS_THEME ? getThemeConfig(LONG_PRESS_THEME.id) : undefined;

export function ThemeToggle() {
    const { theme, setTheme, ready } = useTheme();
    const [isLongPressing, setIsLongPressing] = useState(false);
    const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const morphTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    /** Timestamp when the press started, or 0 if no long-press tracking. */
    const pressStart = useRef(0);

    const currentConfig = getThemeConfig(theme);
    const isSpecialTheme = !currentConfig.isBase;

    const clearTimers = useCallback(() => {
        clearTimeout(pressTimer.current);
        clearTimeout(morphTimer.current);
        setIsLongPressing(false);
    }, []);

    const toggleTheme = useCallback(() => {
        if (isSpecialTheme) {
            setTheme('light');
        } else {
            setTheme(theme === 'dark' ? 'light' : 'dark');
        }
    }, [isSpecialTheme, theme, setTheme]);

    const onPointerDown = useCallback(() => {
        pressStart.current = 0;
        if (isSpecialTheme || !LONG_PRESS_THEME) return;
        pressStart.current = Date.now();
        morphTimer.current = setTimeout(() => setIsLongPressing(true), MORPH_DELAY_MS);
        pressTimer.current = setTimeout(() => {
            setIsLongPressing(false);
            setTheme(LONG_PRESS_THEME.id);
        }, LONG_PRESS_MS);
    }, [isSpecialTheme, setTheme]);

    const onPointerUp = useCallback(() => {
        clearTimers();
        const elapsed = pressStart.current > 0 ? Date.now() - pressStart.current : 0;
        pressStart.current = 0;

        // Held long enough → long-press gesture. Set retro theme
        // (idempotent if the timer already did it) and don't toggle.
        if (elapsed >= LONG_PRESS_MS && LONG_PRESS_THEME) {
            setTheme(LONG_PRESS_THEME.id);
            return;
        }

        toggleTheme();
    }, [clearTimers, toggleTheme, setTheme]);

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        },
        [toggleTheme],
    );

    // Pick icon: long-press preview shows the special theme icon, otherwise current theme icon
    const displayConfig = isLongPressing && LONG_PRESS_CONFIG ? LONG_PRESS_CONFIG : currentConfig;
    const Icon = displayConfig.icon;

    const nextLabel = isSpecialTheme
        ? 'Heller Modus'
        : theme === 'dark'
          ? 'Heller Modus'
          : 'Dunkler Modus';

    return (
        <button
            type="button"
            data-state={theme !== 'light' ? 'on' : 'off'}
            className={toggleStyles}
            aria-label={`Aktiviere ${nextLabel}`}
            aria-pressed={theme !== 'light'}
            disabled={!ready}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={clearTimers}
            onKeyDown={onKeyDown}
        >
            <Icon size={16} />
        </button>
    );
}
