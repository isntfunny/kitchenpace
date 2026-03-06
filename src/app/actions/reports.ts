'use server';

import { getServerAuthSession } from '@app/lib/auth';
import { checkReportEscalation } from '@app/lib/moderation/moderationService';
import { prisma } from '@shared/prisma';

export async function submitReport(
    contentType: string,
    contentId: string,
    reason: string,
    description?: string,
) {
    const session = await getServerAuthSession('submit-report');
    if (!session?.user?.id) throw new Error('Nicht angemeldet');

    // Prevent duplicate reports
    const existing = await prisma.report.findUnique({
        where: {
            reporterId_contentType_contentId: {
                reporterId: session.user.id,
                contentType,
                contentId,
            },
        },
    });

    if (existing) {
        return { success: true, message: 'Du hast diesen Inhalt bereits gemeldet.' };
    }

    await prisma.report.create({
        data: {
            reporterId: session.user.id,
            contentType,
            contentId,
            reason,
            description: description || null,
        },
    });

    // Check if we should auto-escalate (3+ reports)
    await checkReportEscalation(contentType, contentId);

    return { success: true, message: 'Danke für deine Meldung. Wir prüfen den Inhalt.' };
}
