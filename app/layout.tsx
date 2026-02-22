import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { getServerSession } from 'next-auth/next';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { RecipeTabsProvider } from '@/components/providers/RecipeTabsProvider';

import { authOptions } from './api/auth/[...nextauth]/route';
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
    title: 'KüchenTakt - Deine Rezepte im Takt',
    description: 'Entdecke, erstelle und teile köstliche Rezepte',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession(authOptions);

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
                <AuthProvider session={session}>
                    <RecipeTabsProvider isAuthenticated={!!session}>{children}</RecipeTabsProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
