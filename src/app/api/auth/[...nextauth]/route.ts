import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import NextAuth, { type LoggerInstance, type NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';

import { authDebugEnabled, logAuth } from '@app/lib/auth-logger';
import { prisma } from '@shared/prisma';

const sanitizeEmail = (email: string) => email.trim().toLowerCase();

const safeUserMeta = (user?: { id?: string | null; email?: string | null }) => ({
    userId: user?.id ?? null,
    email: user?.email ?? null,
});

type KitchenPaceToken = JWT & {
    userId?: string;
    role?: Role;
    userValidatedAt?: number;
};

const hasDiscord = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

const oauthProviders = [
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
    providers: [
        ...oauthProviders,
        CredentialsProvider({
            name: 'Email & Password',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    logAuth('warn', 'authorize: missing credentials', {
                        hasEmail: Boolean(credentials?.email),
                    });
                    return null;
                }

                const email = sanitizeEmail(credentials.email);

                try {
                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user?.hashedPassword) {
                        logAuth('warn', 'authorize: user missing or no password hash', { email });
                        return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);

                    if (!isValid) {
                        logAuth('warn', 'authorize: invalid password', { userId: user.id });
                        return null;
                    }

                    if (!user.isActive) {
                        logAuth('warn', 'authorize: account not activated', { userId: user.id });
                        return null;
                    }

                    logAuth('info', 'authorize: success', { userId: user.id });

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: user.role,
                    };
                } catch (error) {
                    logAuth('error', 'authorize: unexpected error', {
                        email,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    throw error;
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60, // 1 hour
    },
    jwt: {
        maxAge: 60 * 60 * 24 * 7,
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
    },
    callbacks: {
        signIn: async ({ user, account }) => {
            // Credentials: authorize() already handled validation
            if (account?.provider === 'credentials') {
                return true;
            }

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
        jwt: async ({ token, user, trigger, session }) => {
            const nextToken = token as KitchenPaceToken;
            if (user?.id) {
                nextToken.userId = user.id;
                nextToken.userValidatedAt = Date.now();
            }

            if (user?.role) {
                nextToken.role = user.role;
            }

            if (trigger === 'update' && session?.user?.name) {
                nextToken.name = session.user.name;
            }

            // Periodically validate user still exists in DB (every 5 minutes)
            const VALIDATION_INTERVAL_MS = 5 * 60 * 1000;
            const userId = nextToken.userId ?? nextToken.sub;
            if (
                userId &&
                (!nextToken.userValidatedAt ||
                    Date.now() - nextToken.userValidatedAt > VALIDATION_INTERVAL_MS)
            ) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { id: true, isActive: true, role: true },
                    });
                    if (!dbUser || !dbUser.isActive) {
                        logAuth('warn', 'callbacks.jwt: user no longer valid', { userId });
                        delete nextToken.userId;
                        delete nextToken.sub;
                        delete nextToken.role;
                        delete nextToken.name;
                        delete nextToken.email;
                        nextToken.userValidatedAt = undefined;
                    } else {
                        nextToken.userValidatedAt = Date.now();
                        nextToken.role = dbUser.role;
                    }
                } catch (error) {
                    logAuth('error', 'callbacks.jwt: DB validation failed', {
                        userId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }

            if (authDebugEnabled) {
                logAuth('debug', 'callbacks.jwt', {
                    trigger,
                    tokenUserId: nextToken.userId ?? nextToken.sub ?? null,
                });
            }

            return nextToken;
        },
        session: ({ session, token }) => {
            const nextToken = token as KitchenPaceToken;

            if (session.user && nextToken.sub) {
                session.user.id = nextToken.sub;
            }

            if (session.user && nextToken.userId) {
                session.user.id = nextToken.userId;
            }

            if (session.user && nextToken.role) {
                session.user.role = nextToken.role;
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
        },
        async signOut(message) {
            logAuth('info', 'events.signOut', {
                tokenUserId:
                    message.token?.sub ?? (message.token as { userId?: string })?.userId ?? null,
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
