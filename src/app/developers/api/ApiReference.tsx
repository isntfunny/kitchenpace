'use client';
import type { AnyApiReferenceConfiguration } from '@scalar/api-reference-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { useTheme } from '@app/components/providers/ThemeProvider';
import { getThemeConfig } from '@app/lib/themes/registry';
import './api-reference.css';

const Scalar = dynamic(
    () => import('@scalar/api-reference-react').then((m) => m.ApiReferenceReact),
    { ssr: false, loading: () => <p>API-Referenz wird geladen …</p> },
);
export function ApiReference() {
    const { theme, ready } = useTheme();
    const dark = ready && getThemeConfig(theme).isDark;
    const configuration = useMemo<AnyApiReferenceConfiguration>(
        () => ({
            url: '/api/v1/openapi.json',
            theme: 'none',
            layout: 'classic',
            showSidebar: false,
            hideClientButton: true,
            hideModels: true,
            documentDownloadType: 'none',
            withDefaultFonts: false,
            darkMode: dark,
            forceDarkModeState: dark ? 'dark' : 'light',
            hideDarkModeToggle: true,
            persistAuth: false,
            telemetry: false,
            proxyUrl: '',
            showDeveloperTools: 'never',
        }),
        [dark],
    );
    return (
        <div className={`kuechentakt-api-reference ${dark ? 'dark-mode' : 'light-mode'}`}>
            <Scalar configuration={configuration} />
        </div>
    );
}
