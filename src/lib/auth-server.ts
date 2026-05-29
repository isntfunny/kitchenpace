import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
import { admin, captcha } from 'better-auth/plugins';

import { fireEvent } from '@app/lib/events/fire';
import {
    sendNotifuseActivationEmail,
    sendNotifuseWelcomeEmail,
    syncContactToNotifuse,
} from '@app/lib/notifuse/email';
import { generateUniqueSlug } from '@app/lib/slug';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('auth-server');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    baseURL,
    trustedOrigins: [
        baseURL,
        ...(process.env.AUTH_TRUSTED_ORIGINS?.split(',').filter(Boolean) ?? []),
    ],
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            // better-auth provides `url` pointing at /api/auth/verify-email?token=...&callbackURL=...
            // The Notifuse template renders it as the activation link the user clicks.
            await sendNotifuseActivationEmail({ email: user.email, activationLink: url });
        },
        afterEmailVerification: async (user) => {
            // Welcome email + activity/notification event, mirroring the old activation route.
            try {
                await sendNotifuseWelcomeEmail({ email: user.email, dashboardLink: APP_URL });
            } catch (error) {
                log.error('Welcome email failed after verification', {
                    userId: user.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }

            try {
                await fireEvent({
                    event: 'userActivated',
                    actorId: user.id,
                    data: { email: user.email, name: user.name || undefined },
                });
            } catch (error) {
                log.error('userActivated event failed', {
                    userId: user.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        },
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
                      scope: ['channel:manage:schedule'],
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
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    // `user.name` carries the nickname chosen at registration.
                    const nickname = (user.name ?? '').trim();
                    if (nickname) {
                        const existing = await prisma.profile.findFirst({
                            where: { nickname },
                            select: { id: true },
                        });
                        if (existing) {
                            throw new APIError('UNPROCESSABLE_ENTITY', {
                                message: 'Dieser Nickname ist bereits vergeben',
                            });
                        }
                    }
                    return { data: user };
                },
                after: async (user) => {
                    const nickname = (user.name ?? '').trim() || user.email.split('@')[0];

                    const slug = await generateUniqueSlug(
                        nickname,
                        async (candidate) =>
                            !!(await prisma.profile.findUnique({
                                where: { slug: candidate },
                                select: { id: true },
                            })),
                    );

                    await prisma.profile.create({
                        data: { userId: user.id, nickname, slug },
                    });

                    // External CRM sync must never block account creation.
                    try {
                        await syncContactToNotifuse({
                            email: user.email,
                            externalId: user.id,
                            nickname,
                        });
                    } catch (error) {
                        log.error('Notifuse contact sync failed during signup', {
                            userId: user.id,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                },
            },
        },
    },
    plugins: [
        captcha({
            provider: 'cloudflare-turnstile',
            secretKey: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ?? '',
            // Only guard registration — the sign-in form does not send a captcha token.
            endpoints: ['/sign-up/email'],
        }),
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
