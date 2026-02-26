import { IdentifyComponent, OpenPanelComponent } from '@openpanel/nextjs';
import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { RecipeTabsProvider } from '@/components/providers/RecipeTabsProvider';
import { getServerAuthSession } from '@/lib/auth';

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
                    <RecipeTabsProvider>{children}</RecipeTabsProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
