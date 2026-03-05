import { NextResponse } from 'next/server';

import { prisma } from '@shared/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const nickname = searchParams.get('nickname');

        if (!nickname || nickname.trim().length === 0) {
            return NextResponse.json(
                { available: false, message: 'Nickname ist erforderlich' },
                { status: 400 },
            );
        }

        if (nickname.length > 40) {
            return NextResponse.json(
                { available: false, message: 'Nickname darf maximal 40 Zeichen lang sein' },
                { status: 400 },
            );
        }

        const existing = await prisma.profile.findFirst({
            where: { nickname: nickname.trim() },
        });

        return NextResponse.json({
            available: !existing,
            message: existing ? 'Dieser Nickname ist bereits vergeben' : 'Nickname ist verfügbar',
        });
    } catch {
        return NextResponse.json(
            { available: false, message: 'Fehler bei der Überprüfung' },
            { status: 500 },
        );
    }
}
