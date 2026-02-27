import { IdentifyComponent, OpenPanelComponent } from '@openpanel/nextjs';
import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';

import { fetchPinnedEntries } from '@/app/api/recipe-tabs/helpers';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ProfileProvider } from '@/components/providers/ProfileProvider';
import { RecipeTabsProvider } from '@/components/providers/RecipeTabsProvider';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitchenpace.app'),
    openGraph: {
        type: 'website',
        locale: 'de_DE',
        url: 'https://kitchenpace.app',
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
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerAuthSession('openpanel-root-layout');

    let profile: { photoUrl: string | null; nickname: string | null } | null = null;
    let pinnedRecipes: Array<{
        id: string;
        title: string;
        slug?: string;
        imageUrl?: string;
        prepTime?: number;
        cookTime?: number;
        difficulty?: string;
        position: number;
    }> = [];
    let recentRecipes: Array<{
        id: string;
        title: string;
        slug?: string;
        imageUrl?: string;
        prepTime?: number;
        cookTime?: number;
        difficulty?: string;
        viewedAt?: string;
        pinned?: boolean;
    }> = [];

    if (session?.user?.id) {
        const userProfile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
        });
        if (userProfile) {
            profile = {
                photoUrl: userProfile.photoUrl,
                nickname: userProfile.nickname,
            };
        }

        const { entries: pinned } = await fetchPinnedEntries(session.user.id);
        pinnedRecipes = pinned.map((e) => ({
            id: e.id,
            title: e.title,
            slug: e.slug,
            imageUrl: e.imageUrl,
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
                        imageUrl: true,
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
                    imageUrl: string | null;
                    prepTime: number | null;
                    cookTime: number | null;
                    difficulty: string | null;
                };
            }) => ({
                id: view.recipe.id,
                title: view.recipe.title,
                slug: view.recipe.slug ?? undefined,
                imageUrl: view.recipe.imageUrl ?? undefined,
                prepTime: view.recipe.prepTime ?? undefined,
                cookTime: view.recipe.cookTime ?? undefined,
                difficulty: view.recipe.difficulty ?? undefined,
                viewedAt: view.viewedAt.toISOString(),
                pinned: pinnedRecipes.some((p) => p.id === view.recipeId),
            }),
        );
    }

    const openPanelClientId = process.env.OPENPANEL_ID ?? '';
    const hasOpenPanelId = Boolean(openPanelClientId);
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
        <html lang="de">
            <body
                className={`${playfair.variable} ${inter.variable}`}
                style={{
                    background: `
          radial-gradient(ellipse 100% 80% at 0% 100%, rgba(224,123,83,0.2) 0%, transparent 50%),
          radial-gradient(ellipse 80% 100% at 100% 0%, rgba(108,92,231,0.15) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 50% 80%, rgba(248,181,0,0.12) 0%, transparent 50%),
          linear-gradient(180deg, #f8f5f0 0%, #f0ebe3 50%, #e8e2d9 100%)
        `,
                    backgroundAttachment: 'fixed',
                    margin: 0,
                    minHeight: '100vh',
                }}
            >
                <OpenPanelComponent
                    clientId={openPanelClientId}
                    apiUrl="/api/op"
                    cdnUrl="/api/op/op1.js"
                    trackScreenViews={true}
                    trackAttributes={true}
                    waitForProfile={Boolean(identifyProps)}
                    disabled={!hasOpenPanelId}
                    globalProperties={openPanelGlobalProperties}
                />
                {identifyProps && <IdentifyComponent {...identifyProps} />}
                <AuthProvider session={session}>
                    <ProfileProvider profile={profile}>
                        <RecipeTabsProvider
                            initialPinned={pinnedRecipes}
                            initialRecent={recentRecipes}
                        >
                            {children}
                        </RecipeTabsProvider>
                    </ProfileProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
