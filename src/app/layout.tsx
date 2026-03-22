import { createHmac } from 'crypto';

import { IdentifyComponent, OpenPanelComponent } from '@openpanel/nextjs';
import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';

import { fetchPinnedEntries } from '@app/app/api/recipe-tabs/helpers';
import { ChatwootWidgetComponent } from '@app/components/ChatwootWidget';
import { AchievementListener } from '@app/components/features/AchievementListener';
import { AuthProvider } from '@app/components/providers/AuthProvider';
import { FeatureFlagsProvider } from '@app/components/providers/FeatureFlagsProvider';
import { PageProgress } from '@app/components/providers/PageProgress';
import { PeriodAttribute } from '@app/components/providers/PeriodAttribute';
import { ProfileProvider } from '@app/components/providers/ProfileProvider';
import { RecipeTabsProvider } from '@app/components/providers/RecipeTabsProvider';
import { ThemeProvider } from '@app/components/providers/ThemeProvider';
import { ToastProvider } from '@app/components/providers/ToastProvider';
import { getServerAuthSession } from '@app/lib/auth';
import { getServerFeatureFlags } from '@app/lib/flags/server';
import { getOrCreateProfile } from '@app/lib/profile';
import { APP_URL } from '@app/lib/url';
import { TRPCReactProvider } from '@app/trpc/client';
import { prisma } from '@shared/prisma';

const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebSite',
            '@id': `${APP_URL}/#website`,
            url: APP_URL,
            name: 'KüchenTakt',
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
            name: 'KüchenTakt',
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
        default: 'KüchenTakt - Deine Rezepte im Takt',
        template: '%s | KüchenTakt',
    },
    description:
        'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen. Koche effizient mit parallelen Aufgaben und Zeitangaben.',
    keywords: ['Rezepte', 'Kochen', 'Backen', 'Küche', 'Essen', 'Rezept teilen', 'Koch-Tipps'],
    authors: [{ name: 'KüchenTakt' }],
    creator: 'KüchenTakt',
    publisher: 'KüchenTakt',
    metadataBase: new URL(APP_URL),
    openGraph: {
        type: 'website',
        locale: 'de_DE',
        url: APP_URL,
        siteName: 'KüchenTakt',
        title: 'KüchenTakt - Deine Rezepte im Takt',
        description:
            'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen. Koche effizient mit parallelen Aufgaben und Zeitangaben.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'KüchenTakt - Rezepte im Takt',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'KüchenTakt - Deine Rezepte im Takt',
        description:
            'Entdecke, erstelle und teile köstliche Rezepte mit interaktiven Flow-Diagrammen.',
        creator: '@kuechentakt',
        images: ['/og-image.png'],
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
    const session = await getServerAuthSession('openpanel-root-layout');
    const featureFlags = await getServerFeatureFlags(session);

    let profile: { photoKey: string | null; nickname: string | null } | null = null;
    let pinnedRecipes: Array<{
        id: string;
        title: string;
        slug?: string;
        imageKey?: string | null;
        prepTime?: number;
        cookTime?: number;
        difficulty?: string;
        position: number;
    }> = [];
    let recentRecipes: Array<{
        id: string;
        title: string;
        slug?: string;
        imageKey?: string | null;
        prepTime?: number;
        cookTime?: number;
        difficulty?: string;
        viewedAt?: string;
        pinned?: boolean;
    }> = [];

    if (session?.user?.id) {
        const userProfile = await getOrCreateProfile(session.user.id);
        if (userProfile) {
            profile = {
                photoKey: userProfile.photoKey,
                nickname: userProfile.nickname,
            };
        }

        const { entries: pinned } = await fetchPinnedEntries(session.user.id);
        pinnedRecipes = pinned.map((e) => ({
            id: e.id,
            title: e.title,
            slug: e.slug,
            imageKey: e.imageKey,
            prepTime: e.prepTime,
            cookTime: e.cookTime,
            difficulty: e.difficulty,
            position: e.position,
        }));

        const recentViews = await prisma.userViewHistory.findMany({
            where: { userId: session.user.id },
            include: {
                recipe: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        imageKey: true,
                        prepTime: true,
                        cookTime: true,
                        difficulty: true,
                    },
                },
            },
            orderBy: { viewedAt: 'desc' },
            take: 5,
        });
        recentRecipes = recentViews.map(
            (view: {
                recipeId: string;
                viewedAt: Date;
                recipe: {
                    id: string;
                    title: string;
                    slug: string | null;
                    imageKey: string | null;
                    prepTime: number | null;
                    cookTime: number | null;
                    difficulty: string | null;
                };
            }) => ({
                id: view.recipe.id,
                title: view.recipe.title,
                slug: view.recipe.slug ?? undefined,
                imageKey: view.recipe.imageKey ?? null,
                prepTime: view.recipe.prepTime ?? undefined,
                cookTime: view.recipe.cookTime ?? undefined,
                difficulty: view.recipe.difficulty ?? undefined,
                viewedAt: view.viewedAt.toISOString(),
                pinned: pinnedRecipes.some((p) => p.id === view.recipeId),
            }),
        );
    }

    let chatwootUser = null;
    if (session?.user?.id) {
        const chatwootHmacToken = process.env.CHATWOOT_IDENTITY_TOKEN;
        const identifier = session.user.id;
        const identifierHash = chatwootHmacToken
            ? createHmac('sha256', chatwootHmacToken).update(identifier).digest('hex')
            : undefined;
        chatwootUser = {
            id: identifier,
            name: profile?.nickname ?? session.user.name ?? undefined,
            email: session.user.email ?? undefined,
            identifierHash,
        };
    }

    const openPanelClientId = process.env.OPENPANEL_CLIENT_ID ?? process.env.OPENPANEL_ID ?? '';
    const openPanelApiUrl = process.env.OPENPANEL_API_URL;
    const hasOpenPanel = Boolean(openPanelClientId && openPanelApiUrl);
    const userName = session?.user?.name?.trim() ?? '';
    const nameParts = userName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;
    const openPanelGlobalProperties = {
        environment: process.env.NODE_ENV ?? 'development',
        appVersion:
            process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.npm_package_version ?? '0.1.0',
        appId: 'kitchenpace',
    };
    const identifyProps = session?.user?.id
        ? {
              profileId: session.user.id,
              email: session.user.email ?? undefined,
              firstName,
              lastName,
              properties: {
                  name: userName || undefined,
              },
          }
        : null;
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
                <ChatwootWidgetComponent user={chatwootUser} />
                {hasOpenPanel && (
                    <>
                        <OpenPanelComponent
                            clientId={openPanelClientId}
                            apiUrl="/api/op"
                            cdnUrl="/api/op/op1.js"
                            trackScreenViews={true}
                            trackAttributes={true}
                            waitForProfile={Boolean(identifyProps)}
                            globalProperties={openPanelGlobalProperties}
                        />
                        {identifyProps && <IdentifyComponent {...identifyProps} />}
                    </>
                )}
                <PageProgress />
                <TRPCReactProvider>
                    <FeatureFlagsProvider initialState={featureFlags}>
                        <ThemeProvider>
                            <AuthProvider>
                                <ToastProvider>
                                    <AchievementListener />
                                    <ProfileProvider profile={profile}>
                                        <RecipeTabsProvider
                                            initialPinned={pinnedRecipes}
                                            initialRecent={recentRecipes}
                                            serverDataFetched={!!session?.user?.id}
                                        >
                                            {children}
                                        </RecipeTabsProvider>
                                    </ProfileProvider>
                                </ToastProvider>
                            </AuthProvider>
                        </ThemeProvider>
                    </FeatureFlagsProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
