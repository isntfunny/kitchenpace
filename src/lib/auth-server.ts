import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';

import { prisma } from '@shared/prisma';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL,
    trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS?.split(',').filter(Boolean) ?? [],
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
    },
    socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                  google: {
                      clientId: process.env.GOOGLE_CLIENT_ID,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  },
              }
            : {}),
        ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
            ? {
                  discord: {
                      clientId: process.env.DISCORD_CLIENT_ID,
                      clientSecret: process.env.DISCORD_CLIENT_SECRET,
                  },
              }
            : {}),
        ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
            ? {
                  twitch: {
                      clientId: process.env.TWITCH_CLIENT_ID,
                      clientSecret: process.env.TWITCH_CLIENT_SECRET,
                  },
              }
            : {}),
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60, // Refresh after 1 hour
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5-minute cache to reduce DB hits
        },
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: 'user',
            },
        },
    },
    plugins: [
        passkey({
            rpID: process.env.AUTH_WEBAUTHN_RP_ID ?? 'localhost',
            rpName: 'KitchenPace',
            origin:
                process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
        }),
        admin(),
    ],
    pages: {
        signIn: '/auth/signin',
        signUp: '/auth/register',
        error: '/auth/error',
    },
});

export type Session = typeof auth.$Infer.Session;
