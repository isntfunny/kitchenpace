import { randomBytes } from 'crypto';

import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

import { fireEvent } from '@app/lib/events/fire';
import { sendNotifuseActivationEmail, syncContactToNotifuse } from '@app/lib/notifuse/email';
import { generateUniqueSlug } from '@app/lib/slug';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('auth-register');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            email,
            password,
            nickname,
            turnstileToken,
            referrer,
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent,
            landingPage,
        } = body;

        // Validate Turnstile token
        if (!turnstileToken) {
            return NextResponse.json(
                { message: 'Sicherheitsüberprüfung erforderlich' },
                { status: 400 },
            );
        }

        const turnstileSecretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
        if (!turnstileSecretKey) {
            log.error('CLOUDFLARE_TURNSTILE_SECRET_KEY not configured');
            return NextResponse.json(
                { message: 'Ein Fehler ist aufgetreten' },
                { status: 500 },
            );
        }

        try {
            const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: turnstileSecretKey,
                    response: turnstileToken,
                }),
            });

            const turnstileData = await turnstileResponse.json() as { success: boolean; error_codes?: string[] };

            if (!turnstileData.success) {
                log.warn('Turnstile verification failed', { errors: turnstileData.error_codes });
                return NextResponse.json(
                    { message: 'Sicherheitsüberprüfung fehlgeschlagen — bitte versuche es erneut' },
                    { status: 400 },
                );
            }
        } catch (error) {
            log.error('Turnstile verification error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return NextResponse.json(
                { message: 'Sicherheitsüberprüfung fehlgeschlagen' },
                { status: 400 },
            );
        }

        if (!email || !password) {
            return NextResponse.json(
                { message: 'E-Mail und Passwort sind erforderlich' },
                { status: 400 },
            );
        }

        if (!nickname || nickname.trim().length === 0) {
            return NextResponse.json({ message: 'Bitte gib einen Nickname ein' }, { status: 400 });
        }

        if (nickname.trim().length > 40) {
            return NextResponse.json(
                { message: 'Nickname darf maximal 40 Zeichen lang sein' },
                { status: 400 },
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { message: 'Passwort muss mindestens 8 Zeichen lang sein' },
                { status: 400 },
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            if (existingUser.isActive) {
                return NextResponse.json(
                    { message: 'Ein Konto mit dieser E-Mail existiert bereits' },
                    { status: 400 },
                );
            }

            const activationToken = randomBytes(32).toString('hex');

            const hashedPassword = await bcrypt.hash(password, 12);

            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    hashedPassword,
                    activationToken,
                },
            });

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const activationLink = `${appUrl}/auth/activate?token=${activationToken}`;

            await sendNotifuseActivationEmail({ email: normalizedEmail, activationLink });

            log.info('Resent activation email', { email: normalizedEmail });

            return NextResponse.json({
                success: true,
                message: 'Aktivierungsmail erneut gesendet',
            });
        }

        const existingNickname = await prisma.profile.findFirst({
            where: { nickname: nickname.trim() },
        });

        if (existingNickname) {
            return NextResponse.json(
                { message: 'Dieser Nickname ist bereits vergeben' },
                { status: 400 },
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const activationToken = randomBytes(32).toString('hex');

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name: nickname.trim(),
                hashedPassword,
                isActive: false,
                activationToken,
            },
        });

        const profileSlug = await generateUniqueSlug(
            nickname.trim(),
            async (slug) => !!(await prisma.profile.findUnique({ where: { slug } })),
        );

        await prisma.profile.create({
            data: {
                userId: user.id,
                email: normalizedEmail,
                nickname: nickname.trim(),
                slug: profileSlug,
            },
        });

        await syncContactToNotifuse({
            email: normalizedEmail,
            externalId: user.id,
            nickname: nickname.trim(),
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const activationLink = `${appUrl}/auth/activate?token=${activationToken}`;

        await sendNotifuseActivationEmail({ email: normalizedEmail, activationLink });

        await fireEvent({
            event: 'userRegistered',
            actorId: user.id,
            recipientId: user.id,
            data: {
                email: normalizedEmail,
                name: nickname.trim(),
                referrer,
                utmSource,
                utmMedium,
                utmCampaign,
                utmTerm,
                utmContent,
                landingPage,
            },
        });

        log.info('New user registered', { userId: user.id, email: normalizedEmail });

        return NextResponse.json({
            success: true,
            message: 'Bitte aktiviere dein Konto über den Link in der E-Mail',
        });
    } catch (error) {
        log.error('Registration failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ message: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
