/**
 * Shared color palette for runtime usage (inline styles, dynamic backgrounds).
 *
 * These values MUST stay in sync with the palette tokens in panda.config.ts.
 * Use Panda CSS semantic tokens (e.g. `color: 'palette.orange'`) in css() calls
 * wherever possible. Only use these constants for dynamic/runtime values that
 * Panda's static extractor can't handle (e.g. `style={{ background: PALETTE.orange }}`).
 */
export const PALETTE = {
    orange: '#e07b53',
    gold: '#f8b500',
    emerald: '#00b894',
    purple: '#6c5ce7',
    blue: '#0984e3',
    pink: '#fd79a8',
} as const;

export type PaletteColor = keyof typeof PALETTE;
