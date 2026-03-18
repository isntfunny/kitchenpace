/**
 * Shared color constants — the single source of truth.
 *
 * Both panda.config.ts (CSS tokens) and colors.ts (inline style palettes)
 * import from here. When you change a color, it updates everywhere.
 *
 * Panda CSS cannot resolve JS references at build time for semantic tokens,
 * so panda.config.ts still uses these as raw hex strings in its own format.
 * colors.ts references them directly.
 */

// ── Brand primitives ─────────────────────────────────────────────
export const BRAND = {
    primary: '#e07b53',
    primaryDark: '#f76b15',
    secondary: '#2d3436',
    accent: '#f8b500',
    light: '#faf9f7',
    dark: '#0f1114',
    text: '#2d3436',
    textMuted: '#636e72',
    textDark: '#f5f5f5',
    textMutedDark: '#a0a0a0',
    cardLight: '#ffffff',
    cardDark: '#1a1d21',
    adminHeader: '#ffe8d6',
    headerBg: '#fceadd',
} as const;

// ── Palette accents ──────────────────────────────────────────────
export const PALETTE_COLORS = {
    orange: '#e07b53',
    gold: '#f8b500',
    emerald: '#00b894',
    purple: '#6c5ce7',
    orangeDark: '#f09070',
    goldDark: '#ffc94d',
    emeraldDark: '#2ed8a3',
    purpleDark: '#9b8ff5',
} as const;

// ── Social brand colors ─────────────────────────────────────────
export const SOCIAL = {
    twitch: '#9146FF',
    twitchDark: '#a970ff',
    discord: '#5865F2',
    google: '#4285F4',
} as const;

// ── Status colors ────────────────────────────────────────────────
export const STATUS = {
    success: '#22c55e',
    successDark: '#4ade80',
    error: '#ef4444',
    errorDark: '#f87171',
    danger: '#dc2626',
    dangerDark: '#f87171',
    warning: '#f59e0b',
    warningDark: '#fbbf24',
} as const;

// ── Body background gradients ────────────────────────────────────
export const BODY_BG = {
    light: 'linear-gradient(180deg, #fff8f4 0%, #fef0e8 40%, #fceadd 100%)',
    dark: 'linear-gradient(180deg, #1a1715 0%, #231e1a 40%, #1c1815 100%)',
} as const;

// ── Retro theme constants ────────────────────────────────────────
export const RETRO = {
    bg: '#ffffff',
    fg: '#000000',
    border: '#cccccc',
    borderMuted: '#dddddd',
    primary: '#004b91',
    primaryHover: '#003366',
    accentSoft: 'rgba(0,75,145,0.08)',
    textMuted: '#666666',
    headerBg: '#f1f1f1',
} as const;

// ── Shadows ──────────────────────────────────────────────────────
export const SHADOWS = {
    small: '0 2px 8px rgba(0,0,0,0.06)',
    smallDark: '0 2px 8px rgba(0,0,0,0.3)',
    medium: '0 4px 24px rgba(0,0,0,0.08)',
    mediumDark: '0 4px 24px rgba(0,0,0,0.3)',
    large: '0 40px 120px rgba(0,0,0,0.15)',
    largeDark: '0 40px 120px rgba(0,0,0,0.4)',
} as const;
