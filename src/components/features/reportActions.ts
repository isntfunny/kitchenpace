'use server';

import { publishAdminInboxCreated, serializeReportItem } from '@app/lib/admin-inbox';
import { getServerAuthSession } from '@app/lib/auth';
import { checkReportEscalation } from '@app/lib/moderation/moderationService';
import { prisma } from '@shared/prisma';

const REPORTABLE_CONTENT_TYPES = ['recipe', 'comment', 'user', 'cook_image'] as const;

export async function submitReport(
    contentType: (typeof REPORTABLE_CONTENT_TYPES)[number],
    contentId: string,
    reason: string,
    description?: string,
) {
    const session = await getServerAuthSession('submit-report');
    if (!session?.user?.id) throw new Error('Nicht angemeldet');
    if (!REPORTABLE_CONTENT_TYPES.includes(contentType)) {
        throw new Error('Unbekannter Inhaltstyp');
    }

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

    const report = await prisma.report.create({
        data: {
            reporterId: session.user.id,
            contentType,
            contentId,
            reason,
            description: description || null,
        },
    });

    await publishAdminInboxCreated(await serializeReportItem(report));

    // Check if we should auto-escalate (3+ reports)
    await checkReportEscalation(contentType, contentId);

    return { success: true, message: 'Danke für deine Meldung. Wir prüfen den Inhalt.' };
}
