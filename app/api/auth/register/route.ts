import { randomBytes } from 'crypto';

import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { trigger } from '@/lib/trigger';

const log = createLogger('auth-register');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: 'E-Mail und Passwort sind erforderlich' },
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

            await trigger.sendTemplatedEmail({
                to: normalizedEmail,
                templateType: 'welcome',
                variables: {
                    name: name || 'Kochenthusiast',
                    link: `${process.env.NEXT_PUBLIC_APP_URL}/auth/activate?token=${activationToken}`,
                    linkText: 'Konto aktivieren',
                },
            });

            log.info('Resent activation email', { email: normalizedEmail });

            return NextResponse.json({
                success: true,
                message: 'Aktivierungsmail erneut gesendet',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const activationToken = randomBytes(32).toString('hex');

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name: name || null,
                hashedPassword,
                isActive: false,
                activationToken,
            },
        });

        await prisma.profile.create({
            data: {
                userId: user.id,
                email: normalizedEmail,
                nickname: name || null,
            },
        });

        await trigger.sendTemplatedEmail({
            to: normalizedEmail,
            templateType: 'welcome',
            variables: {
                name: name || 'Kochenthusiast',
                link: `${process.env.NEXT_PUBLIC_APP_URL}/auth/activate?token=${activationToken}`,
                linkText: 'Konto aktivieren',
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
