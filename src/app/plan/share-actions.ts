'use server';

// Share a week by link (KUC-110): create, renew and revoke the link, and take a
// shared week over into the own plan.
import { z } from 'zod';

import { isoDateSchema } from '@app/lib/meal-plan/schemas';
import {
    getMealPlanShare,
    importSharedWeek,
    previewSharedWeekImport,
    revokeMealPlanShare,
    setShareModeration,
    SHARE_CONTENT_TYPE,
    shareMealPlanWeek,
    shareTextsOf,
    type ShareModerationStatus,
} from '@app/lib/meal-plan/share';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { prisma } from '@shared/prisma';

import { run, runWrite } from './run';

export interface PlanShareState {
    token: string;
    createdAt: Date | null;
    moderationStatus: string | null;
    includeNotes: boolean;
}

export async function getPlanShare(startDate: string) {
    return run(async (userId): Promise<PlanShareState | null> => {
        const share = await getMealPlanShare(prisma, userId, isoDateSchema.parse(startDate));
        return (
            share && {
                token: share.token,
                createdAt: share.createdAt,
                moderationStatus: share.moderationStatus,
                includeNotes: share.includeNotes,
            }
        );
    });
}

const shareSchema = z
    .object({
        startDate: isoDateSchema,
        includeNotes: z.boolean().default(false),
        /** New token: the old link stops working */
        renew: z.boolean().default(false),
    })
    .strict();

/**
 * Creates the link (or keeps the active one) and moderates the custom slot names and,
 * if wanted, the notes of the week. Those texts appear on the shared page only after
 * approval and only in the wording moderated now.
 */
export async function sharePlanWeek(input: unknown) {
    return run(async (userId): Promise<PlanShareState> => {
        const { startDate, includeNotes, renew } = shareSchema.parse(input);
        const existing = renew ? null : await getMealPlanShare(prisma, userId, startDate);
        const share = existing ?? (await shareMealPlanWeek(prisma, userId, startDate));

        const texts = await shareTextsOf(prisma, userId, startDate, includeNotes);
        const text = [...texts.slotNames, ...texts.notes].join('\n');
        const result = text
            ? await moderateContent({ text })
            : {
                  decision: 'AUTO_APPROVED' as const,
                  score: 0,
                  flags: {},
                  flagged: false,
                  raw: null,
              };
        const status: ShareModerationStatus = result.decision;
        // Always recorded: the snapshot says which texts were checked
        await persistModerationResult(SHARE_CONTENT_TYPE, share.id, userId, result, {
            contentType: SHARE_CONTENT_TYPE,
            contentId: share.id,
            authorId: userId,
            title: 'Geteilter Wochenplan',
            text,
            ...texts,
        });
        await setShareModeration(prisma, userId, startDate, status);

        const state = await getMealPlanShare(prisma, userId, startDate);
        if (!state) throw new Error('share vanished');
        return {
            token: state.token,
            createdAt: state.createdAt,
            moderationStatus: state.moderationStatus,
            includeNotes: state.includeNotes,
        };
    });
}

export async function revokePlanShare(startDate: string) {
    return run((userId) => revokeMealPlanShare(prisma, userId, isoDateSchema.parse(startDate)));
}

export async function previewSharedPlanImport(input: unknown) {
    return run((userId) => previewSharedWeekImport(prisma, userId, input));
}

export async function importSharedPlan(input: unknown) {
    return runWrite((userId) => importSharedWeek(prisma, userId, input));
}
