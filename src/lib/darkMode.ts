/**
 * Theme-aware helpers for components that need to check the current theme.
 */

import { useTheme } from '@app/components/providers/ThemeProvider';
import { getThemeConfig } from '@app/lib/themes/registry';

export function useIsDark(): boolean {
    const { theme } = useTheme();
    return getThemeConfig(theme).isDark;
}

export function useIsRetro(): boolean {
    const { theme } = useTheme();
    return theme === 'retro';
}
