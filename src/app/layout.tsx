import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';

import { AnalyticsScripts } from '@app/components/analytics/AnalyticsScripts';
import { ChatwootWidgetComponent } from '@app/components/ChatwootWidget';
import { AchievementListener } from '@app/components/features/AchievementListener';
import { AuthProvider } from '@app/components/providers/AuthProvider';
import { ConsentProvider } from '@app/components/providers/ConsentProvider';
import { FeatureFlagsProvider } from '@app/components/providers/FeatureFlagsProvider';
import { PageProgress } from '@app/components/providers/PageProgress';
import { PeriodAttribute } from '@app/components/providers/PeriodAttribute';
import { ProfileProvider } from '@app/components/providers/ProfileProvider';
import { RecipeTabsProvider } from '@app/components/providers/RecipeTabsProvider';
import { ThemeProvider } from '@app/components/providers/ThemeProvider';
import { ToastProvider } from '@app/components/providers/ToastProvider';
import { getServerFeatureFlags } from '@app/lib/flags/server';
import { APP_URL } from '@app/lib/url';

const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebSite',
            '@id': `${APP_URL}/#website`,
            url: APP_URL,
            name: 'KochTakt',
            description:
                'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen.',
            inLanguage: 'de-DE',
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${APP_URL}/recipes?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@type': 'Organization',
            '@id': `${APP_URL}/#organization`,
            name: 'KochTakt',
            url: APP_URL,
            logo: {
                '@type': 'ImageObject',
                url: `${APP_URL}/kitchenpace_icon.png`,
            },
        },
    ],
};

import './globals.css';

const playfair = Playfair_Display({
    variable: '--font-playfair',
    subsets: ['latin'],
    display: 'swap',
});

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
});

const themeInitScript = `
(function () {
    var storageKey = 'kitchenpace-theme';
    try {
        var stored = localStorage.getItem(storageKey);
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
})();
`;

export const metadata: Metadata = {
    title: {
        default: 'KochTakt - Deine Rezepte im Takt',
        template: '%s | KochTakt',
    },
    description:
        'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen. Koche effizient mit parallelen Aufgaben und Zeitangaben.',
    keywords: ['Rezepte', 'Kochen', 'Backen', 'Küche', 'Essen', 'Rezept teilen', 'Koch-Tipps'],
    authors: [{ name: 'KochTakt' }],
    creator: 'KochTakt',
    publisher: 'KochTakt',
    metadataBase: new URL(APP_URL),
    openGraph: {
        type: 'website',
        locale: 'de_DE',
        url: APP_URL,
        siteName: 'KochTakt',
        title: 'KochTakt - Deine Rezepte im Takt',
        description:
            'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen. Koche effizient mit parallelen Aufgaben und Zeitangaben.',
        images: [
            {
                url: '/opengraph-image',
                width: 1200,
                height: 630,
                alt: 'KochTakt - Rezepte im Takt',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'KochTakt - Deine Rezepte im Takt',
        description:
            'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen.',
        creator: '@kochtakt',
        images: ['/opengraph-image'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    icons: {
        icon: '/kitchenpace_icon.png',
        apple: '/kitchenpace_icon.png',
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#f97316',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const featureFlags = await getServerFeatureFlags(null);

    const openPanelClientId = process.env.OPENPANEL_CLIENT_ID ?? process.env.OPENPANEL_ID ?? '';
    const openPanelApiUrl = process.env.OPENPANEL_API_URL;
    const hasOpenPanel = Boolean(openPanelClientId && openPanelApiUrl);
    const openPanelGlobalProperties = {
        environment: process.env.NODE_ENV ?? 'development',
        appVersion:
            process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.npm_package_version ?? '0.1.0',
        appId: 'kitchenpace',
    };
    return (
        <html lang="de" suppressHydrationWarning>
            <head>
                <script
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Required to prevent theme flash
                    dangerouslySetInnerHTML={{ __html: themeInitScript }}
                />
                <PeriodAttribute />
            </head>
            <body className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
                <script
                    type="application/ld+json"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
                />
                <PageProgress />
                <FeatureFlagsProvider initialState={featureFlags}>
                    <ThemeProvider>
                        <AuthProvider>
                            <ToastProvider>
                                <ConsentProvider>
                                    <AnalyticsScripts
                                        clientId={hasOpenPanel ? openPanelClientId : ''}
                                        globalProperties={openPanelGlobalProperties}
                                        identify={null}
                                    />
                                    <ChatwootWidgetComponent user={null} />
                                    <AchievementListener />
                                    <ProfileProvider profile={null}>
                                        <RecipeTabsProvider>{children}</RecipeTabsProvider>
                                    </ProfileProvider>
                                </ConsentProvider>
                            </ToastProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </FeatureFlagsProvider>
            </body>
        </html>
    );
}
