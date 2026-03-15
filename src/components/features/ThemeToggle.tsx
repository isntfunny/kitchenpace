'use client';

import * as Toggle from '@radix-ui/react-toggle';
import { Moon, SunMedium } from 'lucide-react';

import { useTheme } from '@app/components/providers/ThemeProvider';

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
    _pressed: {
        transform: 'scale(0.97)',
    },
    '&[data-state="on"]': {
        background: 'accent',
        borderColor: 'accent',
        color: 'surface',
    },
});

export function ThemeToggle() {
    const { theme, setTheme, ready } = useTheme();
    const nextLabel = theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus';

    return (
        <Toggle.Root
            pressed={theme === 'dark'}
            onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
            className={toggleStyles}
            aria-label={`Aktiviere ${nextLabel}`}
            disabled={!ready}
        >
            {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
        </Toggle.Root>
    );
}
