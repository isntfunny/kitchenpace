/**
 * Dark mode color helpers for components that use inline styles.
 *
 * Components using Panda CSS `css()` should prefer semantic tokens with `_dark`
 * variants. This helper is for components that must use `style={{}}` props
 * (e.g. viewer components with dynamic inline styles).
 */

import { useTheme } from '@app/components/providers/ThemeProvider';

export function useIsDark(): boolean {
    const { theme } = useTheme();
    return theme === 'dark';
}

/** Standard dark-mode-aware colors for inline styles */
export function useDarkColors() {
    const dark = useIsDark();
    return {
        dark,
        // Text
        text: dark ? '#f5f5f5' : '#2d3436',
        textMuted: dark ? '#a0a0a0' : '#636e72',
        textSubtle: dark ? '#808080' : '#888',
        textLight: dark ? '#707070' : '#b2bec3',
        textDark: dark ? '#e0e0e0' : '#1a1a1a',
        textMid: dark ? '#c0c0c0' : '#555',
        textBody: dark ? '#b0b0b0' : '#666',
        textLabel: dark ? '#d09070' : '#c0623e',
        textIngredient: dark ? '#d0d0d0' : '#333',

        // Backgrounds
        surface: dark ? '#1a1d21' : 'white',
        surfaceElevated: dark ? '#22262c' : 'white',
        pageBg: dark ? '#121418' : '#fffcf9',
        overlay: dark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)',
        inputBg: dark ? '#1a1d21' : 'white',

        // Muted backgrounds
        mutedBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        mutedBgLight: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        mutedBgXLight: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        successBgLight: dark ? 'rgba(0,184,148,0.12)' : 'rgba(0,184,148,0.06)',

        // Badges / tags
        badgeBg: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.65)',
        badgeText: dark ? '#c0c0c0' : '#555',

        // Borders
        border: dark ? '#2d333b' : 'rgba(0,0,0,0.08)',
        borderLight: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderMedium: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        borderInput: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',

        // Progress bars
        progressTrack: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',

        // Close buttons
        closeBg: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        closeBgPhoto: dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
        closeIcon: dark ? '#a0a0a0' : '#636e72',

        // Shadows
        shadow: dark
            ? '0 24px 64px rgba(0,0,0,0.4)'
            : '0 24px 64px rgba(0,0,0,0.22)',
        shadowLg: dark
            ? '0 24px 80px rgba(0,0,0,0.4)'
            : '0 24px 80px rgba(0,0,0,0.18)',
        shadowSm: dark
            ? '0 2px 8px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.07)',

        // Mention highlights
        mentionBg: dark ? 'rgba(224,123,83,0.2)' : 'rgba(224,123,83,0.15)',
        mentionText: dark ? '#f09070' : '#c45e30',

        // Completion
        completionBg: dark ? 'rgba(0,184,148,0.12)' : '#e8faf4',
        completionText: dark ? '#2ed8a3' : '#55b89a',
        completionBorder: dark ? 'rgba(0,184,148,0.3)' : 'rgba(0,184,148,0.25)',

        // Header gradients
        headerGradient: dark
            ? 'linear-gradient(135deg, rgba(224,123,83,0.08), rgba(248,181,0,0.04))'
            : 'linear-gradient(135deg, rgba(224,123,83,0.05), rgba(248,181,0,0.02))',

        // Error/warning
        errorBg: dark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
        errorBorder: dark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)',
        warningBg: dark ? 'rgba(217,173,54,0.15)' : 'rgba(217,173,54,0.1)',
        warningText: dark ? '#ffc94d' : '#b8860b',
        warningBorder: dark ? 'rgba(217,173,54,0.35)' : 'rgba(217,173,54,0.25)',

        // Accent soft areas
        accentSoftBg: dark ? 'rgba(224,123,83,0.1)' : 'rgba(224,123,83,0.06)',
        accentSoftBorder: dark ? 'rgba(224,123,83,0.25)' : 'rgba(224,123,83,0.15)',

        // Toggle / unchecked
        uncheckedBorder: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
        uncheckedBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',

        // xyflow / canvas
        canvasBg: dark ? '#1a1d21' : '#fdfcfb',
        canvasDots: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
        edgeDefault: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',

        // Disabled button
        disabledBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
        disabledText: dark ? '#555' : '#b2bec3',

        // Processing step indicators
        stepInactiveBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',

        // Avatar fallback
        avatarBorder: dark ? '#2d333b' : '#fff7f1',
        avatarGradient: dark
            ? 'linear-gradient(135deg, #5a3d2d, #7a5038)'
            : 'linear-gradient(135deg, #ffe5d1, #ffc89e)',

        // Review checkbox
        checkboxBg: dark ? '#2d333b' : 'white',
        checkboxBorder: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',

        // PDF export bg (always white for print)
        pdfBg: '#ffffff',

        // Toggle knob
        toggleKnob: dark ? '#e0e0e0' : 'white',
    };
}
