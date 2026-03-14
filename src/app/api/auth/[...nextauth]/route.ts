import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type LoggerInstance, type NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import GoogleProvider from 'next-auth/providers/google';

import { getRequestMetadata } from '@app/lib/auth/device';
import { SESSION_MAX_AGE } from '@app/lib/auth/session-cookie';
import { authDebugEnabled, logAuth } from '@app/lib/auth-logger';
import { prisma } from '@shared/prisma';

const safeUserMeta = (user?: { id?: string | null; email?: string | null }) => ({
    userId: user?.id ?? null,
    email: user?.email ?? null,
});

const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDiscord = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

const oauthProviders = [
    ...(hasGoogle
        ? [
              GoogleProvider({
                  clientId: process.env.GOOGLE_CLIENT_ID!,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
              }),
          ]
        : []),
    ...(hasDiscord
        ? [
              DiscordProvider({
                  clientId: process.env.DISCORD_CLIENT_ID!,
                  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
              }),
          ]
        : []),
];

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [...oauthProviders],
    session: {
        strategy: 'database',
        maxAge: SESSION_MAX_AGE,
        updateAge: 60 * 60, // 1 hour
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
    },
    callbacks: {
        signIn: async ({ user, account }) => {
            // OAuth: auto-activate user (email is verified by the provider)
            if (account && user?.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { id: true, isActive: true },
                });

                if (dbUser && !dbUser.isActive) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { isActive: true },
                    });
                    logAuth('info', 'signIn: auto-activated OAuth user', { userId: user.id });
                }
            }

            return true;
        },
        session: ({ session, user }) => {
            if (session.user) {
                session.user.id = user.id;
                session.user.role = (user as { role?: string }).role as typeof session.user.role;
            }

            if (authDebugEnabled) {
                logAuth('debug', 'callbacks.session', safeUserMeta(session.user));
            }

            return session;
        },
        redirect: async ({ url, baseUrl }) => {
            if (url.startsWith('/')) {
                return `${baseUrl}${url}`;
            }

            const urlObj = new URL(url);
            if (urlObj.origin === baseUrl) {
                return url;
            }

            logAuth('warn', 'callbacks.redirect: blocking cross-origin redirect', {
                target: urlObj.origin,
            });
            return baseUrl;
        },
    },
    events: {
        async signIn(message) {
            logAuth('info', 'events.signIn', safeUserMeta(message.user));

            // Enrich OAuth sessions with device metadata
            if (message.account?.provider && message.account.provider !== 'credentials') {
                try {
                    const latestSession = await prisma.session.findFirst({
                        where: { userId: message.user.id },
                        orderBy: { expires: 'desc' },
                    });

                    if (latestSession && !latestSession.userAgent) {
                        const metadata = await getRequestMetadata();
                        await prisma.session.update({
                            where: { id: latestSession.id },
                            data: metadata,
                        });
                    }
                } catch (error) {
                    logAuth('error', 'events.signIn: failed to enrich session metadata', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        },
        async signOut(message) {
            logAuth('info', 'events.signOut', {
                sessionToken: message.session
                    ? (message.session as { sessionToken?: string }).sessionToken?.slice(0, 8) +
                      '...'
                    : null,
            });
        },
        async session(message) {
            if (authDebugEnabled) {
                logAuth('debug', 'events.session', safeUserMeta(message.session?.user));
            }
        },
    },
    logger: {
        error(code) {
            logAuth('error', `logger.${code}`);
        },
        warn(code) {
            logAuth('warn', `logger.${code}`);
        },
        debug(code) {
            logAuth('debug', `logger.${code}`);
        },
    } satisfies Partial<LoggerInstance>,
    debug: authDebugEnabled,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
