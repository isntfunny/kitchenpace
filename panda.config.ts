import { defineConfig } from '@pandacss/dev';

import {
    BODY_BG,
    BRAND,
    PALETTE_COLORS,
    RETRO,
    SHADOWS,
    SOCIAL,
    STATUS,
} from './src/lib/themes/palette';

export const themeTokens = {
    colors: {
        brand: {
            primary: { value: BRAND.primary },
            'primary-dark': { value: BRAND.primaryDark },
            secondary: { value: BRAND.secondary },
            accent: { value: BRAND.accent },
            light: { value: BRAND.light },
            dark: { value: BRAND.dark },
            text: { value: BRAND.text },
            'text-muted': { value: BRAND.textMuted },
            'text-dark': { value: BRAND.textDark },
            'text-muted-dark': { value: BRAND.textMutedDark },
            'card-light': { value: BRAND.cardLight },
            'card-dark': { value: BRAND.cardDark },
            'admin-header': { value: BRAND.adminHeader },
            'header-bg': { value: BRAND.headerBg },
        },
        palette: {
            orange: { value: PALETTE_COLORS.orange },
            gold: { value: PALETTE_COLORS.gold },
            emerald: { value: PALETTE_COLORS.emerald },
            purple: { value: PALETTE_COLORS.purple },
            'orange-dark': { value: PALETTE_COLORS.orangeDark },
            'gold-dark': { value: PALETTE_COLORS.goldDark },
            'emerald-dark': { value: PALETTE_COLORS.emeraldDark },
            'purple-dark': { value: PALETTE_COLORS.purpleDark },
        },
        status: {
            success: { value: STATUS.success },
            error: { value: STATUS.error },
            danger: { value: STATUS.danger },
            warning: { value: STATUS.warning },
        },
        social: {
            twitch: { value: SOCIAL.twitch },
            'twitch-dark': { value: SOCIAL.twitchDark },
            discord: { value: SOCIAL.discord },
            google: { value: SOCIAL.google },
        },
    },
    fonts: {
        heading: { value: 'var(--font-playfair), Georgia, serif' },
        body: { value: 'var(--font-inter), system-ui, sans-serif' },
    },
};

export default defineConfig({
    preflight: true,
    include: ['./src/app/**/*.{js,jsx,ts,tsx}', './src/components/**/*.{js,jsx,ts,tsx}'],
    exclude: [],

    conditions: {
        extend: {
            dark: '[data-theme="dark"] &',
            retro: '[data-theme="retro"] &',
            // Food-cultural period conditions (set via data-period on <html>)
            // Multiple periods can be active simultaneously — each is a separate attribute value check
            osterzeit: '[data-period~="osterzeit"] &',
            weihnachtszeit: '[data-period~="weihnachtszeit"] &',
            adventszeit: '[data-period~="adventszeit"] &',
        },
    },

    globalCss: {
        'html, :host': {
            backgroundColor: 'background',
            color: 'foreground',
            minHeight: '100vh',
        },
        body: {
            backgroundColor: 'background',
            color: 'foreground',
            minHeight: '100vh',
            backgroundImage: BODY_BG.light,
            backgroundAttachment: 'fixed',
            _dark: {
                backgroundImage: BODY_BG.dark,
                backgroundAttachment: 'fixed',
            },
            _retro: {
                backgroundImage: 'none',
                backgroundColor: RETRO.bg,
            },
        },
    },

    theme: {
        extend: {
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                slideDown: {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                slideUpCollapse: {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                scaleUp: {
                    from: { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
                    to: { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                scaleDown: {
                    from: { opacity: '1', transform: 'scale(1) translateY(0)' },
                    to: { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
                },
                skeletonPulse: {
                    '0%, 100%': { opacity: '0.45' },
                    '50%': { opacity: '1' },
                },
                shimmerDown: {
                    '0%': { transform: 'translateY(-12px)', opacity: '0' },
                    '15%': { opacity: '0.8' },
                    '85%': { opacity: '0.8' },
                    '100%': { transform: 'translateY(36px)', opacity: '0' },
                },
                livePulse: {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.5', transform: 'scale(0.85)' },
                },
            },

            tokens: themeTokens,

            semanticTokens: {
                colors: {
                    background: {
                        value: {
                            base: '{colors.brand.light}',
                            _dark: '{colors.brand.dark}',
                            _retro: RETRO.bg,
                        },
                    },
                    surface: {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '{colors.brand.card-dark}',
                            _retro: RETRO.bg,
                        },
                    },
                    foreground: {
                        value: {
                            base: '{colors.brand.text}',
                            _dark: '{colors.brand.text-dark}',
                            _retro: RETRO.fg,
                        },
                    },
                    border: {
                        value: {
                            base: 'rgba(0,0,0,0.08)',
                            _dark: '#2d333b',
                            _retro: RETRO.border,
                        },
                    },
                    accent: {
                        value: {
                            base: '{colors.brand.accent}',
                            _retro: RETRO.primary,
                        },
                    },
                    'accent.hover': {
                        value: {
                            base: '{colors.brand.primary}',
                            _retro: RETRO.primaryHover,
                        },
                    },
                    'accent.soft': {
                        value: {
                            base: 'rgba(224,123,83,0.08)',
                            _dark: 'rgba(224,123,83,0.15)',
                            _retro: RETRO.accentSoft,
                        },
                    },
                    primary: {
                        value: {
                            base: '{colors.brand.primary}',
                            _dark: '{colors.brand.primary-dark}',
                            _retro: RETRO.primary,
                        },
                    },
                    'surface.elevated': {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '{colors.brand.card-dark}',
                            _retro: RETRO.bg,
                        },
                    },
                    'header.background': {
                        value: {
                            base: '{colors.brand.header-bg}',
                            _dark: '{colors.brand.card-dark}',
                            _retro: RETRO.headerBg,
                        },
                    },
                    'admin.surface': {
                        value: {
                            base: '{colors.brand.admin-header}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    'surface.card': {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '{colors.brand.card-dark}',
                        },
                    },
                    'border.muted': {
                        value: {
                            base: 'rgba(0,0,0,0.04)',
                            _dark: '#22262c',
                            _retro: RETRO.borderMuted,
                        },
                    },
                    'text.muted': {
                        value: {
                            base: '{colors.brand.text-muted}',
                            _dark: '{colors.brand.text-muted-dark}',
                            _retro: RETRO.textMuted,
                        },
                    },
                    'foreground.muted': {
                        value: {
                            base: '{colors.brand.text-muted}',
                            _dark: '{colors.brand.text-muted-dark}',
                            _retro: RETRO.textMuted,
                        },
                    },
                    text: {
                        value: {
                            base: '{colors.brand.text}',
                            _dark: '{colors.brand.text-dark}',
                            _retro: RETRO.fg,
                        },
                    },
                    'text.accent': {
                        value: {
                            base: '{colors.brand.accent}',
                            _dark: '{colors.brand.accent}',
                        },
                    },
                    'text.primary-hover': {
                        value: {
                            base: '{colors.brand.primary}',
                            _dark: '{colors.brand.primary-dark}',
                        },
                    },
                    'button.primary-hover': {
                        value: {
                            base: '{colors.brand.primary-dark}',
                            _dark: '{colors.brand.primary}',
                        },
                    },
                    'button.secondary-hover': {
                        value: {
                            base: 'rgba(0,0,0,0.08)',
                            _dark: 'rgba(255,255,255,0.08)',
                        },
                    },
                    'palette.orange': {
                        value: { base: PALETTE_COLORS.orange, _dark: PALETTE_COLORS.orangeDark },
                    },
                    'palette.gold': {
                        value: { base: PALETTE_COLORS.gold, _dark: PALETTE_COLORS.goldDark },
                    },
                    'palette.emerald': {
                        value: { base: PALETTE_COLORS.emerald, _dark: PALETTE_COLORS.emeraldDark },
                    },
                    'palette.purple': {
                        value: { base: PALETTE_COLORS.purple, _dark: PALETTE_COLORS.purpleDark },
                    },
                    // ── Period-aware accent (POC: Easter pastels) ──
                    // Components can use `period.accent` to get a seasonal tint.
                    // Defaults to palette.orange; overridden when a food period is active.
                    'period.accent': {
                        value: {
                            base: PALETTE_COLORS.orange,
                            _dark: PALETTE_COLORS.orangeDark,
                            _osterzeit: '#8fbc8f',
                            _weihnachtszeit: '#c0392b',
                        },
                    },
                    'period.accent.soft': {
                        value: {
                            base: 'rgba(224,123,83,0.08)',
                            _dark: 'rgba(224,123,83,0.15)',
                            _osterzeit: 'rgba(143,188,143,0.12)',
                            _weihnachtszeit: 'rgba(192,57,43,0.10)',
                        },
                    },
                    'status.success': {
                        value: { base: STATUS.success, _dark: STATUS.successDark },
                    },
                    'status.error': {
                        value: { base: STATUS.error, _dark: STATUS.errorDark },
                    },
                    'status.danger': {
                        value: { base: STATUS.danger, _dark: STATUS.dangerDark },
                    },
                    'status.warning': {
                        value: { base: STATUS.warning, _dark: STATUS.warningDark },
                    },
                    'surface.muted': {
                        value: {
                            base: 'rgba(0,0,0,0.04)',
                            _dark: 'rgba(255,255,255,0.06)',
                        },
                    },
                    'surface.overlay': {
                        value: {
                            base: 'rgba(0,0,0,0.45)',
                            _dark: 'rgba(0,0,0,0.65)',
                        },
                    },
                    'error.bg': {
                        value: {
                            base: '#fee2e2',
                            _dark: 'rgba(239,68,68,0.15)',
                        },
                    },
                    'error.text': {
                        value: {
                            base: STATUS.danger,
                            _dark: STATUS.errorDark,
                        },
                    },
                    'shadow.small': {
                        value: {
                            base: SHADOWS.small,
                            _dark: SHADOWS.smallDark,
                            _retro: 'none',
                        },
                    },
                    'shadow.medium': {
                        value: {
                            base: SHADOWS.medium,
                            _dark: SHADOWS.mediumDark,
                            _retro: 'none',
                        },
                    },
                    'shadow.large': {
                        value: {
                            base: SHADOWS.large,
                            _dark: SHADOWS.largeDark,
                            _retro: 'none',
                        },
                    },
                    'shadow.dialog': {
                        value: {
                            base: '0 24px 64px rgba(0,0,0,0.22)',
                            _dark: '0 24px 64px rgba(0,0,0,0.4)',
                            _retro: 'none',
                        },
                    },
                    'shadow.dialogLg': {
                        value: {
                            base: '0 24px 80px rgba(0,0,0,0.18)',
                            _dark: '0 24px 80px rgba(0,0,0,0.4)',
                            _retro: 'none',
                        },
                    },
                    'text.subtle': {
                        value: {
                            base: '#888',
                            _dark: '#808080',
                            _retro: '#888888',
                        },
                    },
                    'text.light': {
                        value: {
                            base: '#b2bec3',
                            _dark: '#707070',
                            _retro: '#999999',
                        },
                    },
                    'text.heading': {
                        value: {
                            base: '#1a1a1a',
                            _dark: '#e0e0e0',
                            _retro: RETRO.fg,
                        },
                    },
                    'text.mid': {
                        value: {
                            base: '#555',
                            _dark: '#c0c0c0',
                            _retro: '#555555',
                        },
                    },
                    'text.body': {
                        value: {
                            base: '#666',
                            _dark: '#b0b0b0',
                            _retro: '#333333',
                        },
                    },
                    'text.label': {
                        value: {
                            base: '#c0623e',
                            _dark: '#d09070',
                            _retro: RETRO.primary,
                        },
                    },
                    'text.ingredient': {
                        value: {
                            base: '#333',
                            _dark: '#d0d0d0',
                            _retro: RETRO.fg,
                        },
                    },
                    'surface.mutedLight': {
                        value: {
                            base: 'rgba(0,0,0,0.04)',
                            _dark: 'rgba(255,255,255,0.04)',
                            _retro: '#f5f5f5',
                        },
                    },
                    'surface.mutedXLight': {
                        value: {
                            base: 'rgba(0,0,0,0.02)',
                            _dark: 'rgba(255,255,255,0.02)',
                            _retro: '#fafafa',
                        },
                    },
                    'surface.successLight': {
                        value: {
                            base: 'rgba(0,184,148,0.06)',
                            _dark: 'rgba(0,184,148,0.12)',
                            _retro: '#e8f5e9',
                        },
                    },
                    'badge.bg': {
                        value: {
                            base: 'rgba(255,255,255,0.65)',
                            _dark: 'rgba(255,255,255,0.12)',
                            _retro: '#e0e0e0',
                        },
                    },
                    'badge.text': {
                        value: {
                            base: '#555',
                            _dark: '#c0c0c0',
                            _retro: '#333333',
                        },
                    },
                    'border.medium': {
                        value: {
                            base: 'rgba(0,0,0,0.12)',
                            _dark: 'rgba(255,255,255,0.12)',
                            _retro: '#bbbbbb',
                        },
                    },
                    'border.input': {
                        value: {
                            base: 'rgba(0,0,0,0.1)',
                            _dark: 'rgba(255,255,255,0.15)',
                            _retro: '#999999',
                        },
                    },
                    'bg.progress': {
                        value: {
                            base: 'rgba(0,0,0,0.06)',
                            _dark: 'rgba(255,255,255,0.08)',
                            _retro: '#e0e0e0',
                        },
                    },
                    'bg.close': {
                        value: {
                            base: 'rgba(0,0,0,0.06)',
                            _dark: 'rgba(255,255,255,0.1)',
                            _retro: '#e0e0e0',
                        },
                    },
                    'bg.closePhoto': {
                        value: {
                            base: 'rgba(0,0,0,0.35)',
                            _dark: 'rgba(0,0,0,0.5)',
                            _retro: 'rgba(0,0,0,0.35)',
                        },
                    },
                    'completion.bg': {
                        value: {
                            base: '#e8faf4',
                            _dark: 'rgba(0,184,148,0.12)',
                            _retro: '#e8f5e9',
                        },
                    },
                    'completion.text': {
                        value: {
                            base: '#55b89a',
                            _dark: '#2ed8a3',
                            _retro: '#2e7d32',
                        },
                    },
                    'completion.border': {
                        value: {
                            base: 'rgba(0,184,148,0.25)',
                            _dark: 'rgba(0,184,148,0.3)',
                            _retro: '#a5d6a7',
                        },
                    },
                    'disabled.bg': {
                        value: {
                            base: 'rgba(0,0,0,0.1)',
                            _dark: 'rgba(255,255,255,0.08)',
                            _retro: '#e0e0e0',
                        },
                    },
                    'disabled.text': {
                        value: {
                            base: '#b2bec3',
                            _dark: '#555',
                            _retro: '#999999',
                        },
                    },
                    'step.inactiveBg': {
                        value: {
                            base: 'rgba(0,0,0,0.08)',
                            _dark: 'rgba(255,255,255,0.06)',
                            _retro: '#e0e0e0',
                        },
                    },
                    'checkbox.bg': {
                        value: {
                            base: '{colors.brand.card-light}',
                            _dark: '#2d333b',
                            _retro: RETRO.bg,
                        },
                    },
                    'checkbox.border': {
                        value: {
                            base: 'rgba(0,0,0,0.2)',
                            _dark: 'rgba(255,255,255,0.2)',
                            _retro: '#999999',
                        },
                    },
                    'mention.bg': {
                        value: {
                            base: 'rgba(224,123,83,0.15)',
                            _dark: 'rgba(224,123,83,0.2)',
                            _retro: 'rgba(0,75,145,0.15)',
                        },
                    },
                    'mention.text': {
                        value: {
                            base: '#c45e30',
                            _dark: '#f09070',
                            _retro: RETRO.primary,
                        },
                    },
                },
                spacing: {
                    'page.x': {
                        value: { base: '{spacing.4}', _retro: '{spacing.2}' },
                    },
                    'page.x.md': {
                        value: { base: '{spacing.6}', _retro: '{spacing.4}' },
                    },
                    'page.y': {
                        value: { base: '{spacing.4}', _retro: '{spacing.2}' },
                    },
                    'page.y.md': {
                        value: { base: '{spacing.5}', _retro: '{spacing.3}' },
                    },
                    section: {
                        value: { base: '{spacing.4}', _retro: '{spacing.2}' },
                    },
                    card: {
                        value: { base: '{spacing.4}', _retro: '{spacing.2}' },
                    },
                    'card.md': {
                        value: { base: '{spacing.5}', _retro: '{spacing.3}' },
                    },
                    'card.compact': {
                        value: { base: '{spacing.3}', _retro: '{spacing.2}' },
                    },
                    grid: {
                        value: { base: '{spacing.4}', _retro: '{spacing.2}' },
                    },
                    modal: {
                        value: { base: '{spacing.4}', _retro: '{spacing.2}' },
                    },
                },
                radii: {
                    surface: {
                        value: { base: '{radii.2xl}', _retro: '0' },
                    },
                    'surface.sm': {
                        value: { base: '{radii.xl}', _retro: '0' },
                    },
                    control: {
                        value: { base: '{radii.full}', _retro: '{radii.sm}' },
                    },
                },
            },

            breakpoints: {
                xs: '540px',
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1536px',
            },
        },
    },
});
