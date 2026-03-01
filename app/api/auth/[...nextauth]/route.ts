import type { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import NextAuth, { type LoggerInstance, type NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';

import { authDebugEnabled, logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const sanitizeEmail = (email: string) => email.trim().toLowerCase();

const safeUserMeta = (user?: { id?: string | null; email?: string | null }) => ({
    userId: user?.id ?? null,
    email: user?.email ?? null,
});

type KitchenPaceToken = JWT & {
    userId?: string;
    role?: Role;
};

export const authOptions: NextAuthOptions = {
    providers: [
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
                        throw new Error('AccountNotActivated');
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
        jwt: async ({ token, user, trigger, session }) => {
            const nextToken = token as KitchenPaceToken;
            if (user?.id) {
                nextToken.userId = user.id;
            }

            if (user?.role) {
                nextToken.role = user.role;
            }

            if (trigger === 'update' && session?.user?.name) {
                nextToken.name = session.user.name;
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
