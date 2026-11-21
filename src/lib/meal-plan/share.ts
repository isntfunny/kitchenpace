// Read-only share link of one week (KUC-110). Owner functions check userId;
// the public read returns only recipes, slots, times and servings.
import { randomBytes } from 'node:crypto';

import { type Db } from './db';
import { isoDateSchema, shareTokenSchema, userIdSchema } from './schemas';
import { resolveSlots, slotKeyOf, slotLabel } from './slots';
import { formatIsoDate, toDbDate, weekDays, weekRange } from './week';

export function generateShareToken(): string {
    return randomBytes(32).toString('base64url');
}

/**
 * Creates (or renews) the read-only share link of a week (KUC-110). A new token
 * invalidates the old one. Moderation of notes / custom slot names happens in the
 * calling action; it records the outcome in shareModerationStatus.
 */
export async function shareMealPlanWeek(
    db: Db,
    userId: string,
    startDate: string,
    moderationStatus: 'APPROVED' | 'AUTO_APPROVED' | 'PENDING' | null = null,
) {
    const owner = userIdSchema.parse(userId);
    const start = toDbDate(isoDateSchema.parse(startDate));
    const data = {
        shareToken: generateShareToken(),
        shareCreatedAt: new Date(),
        shareRevokedAt: null,
        shareModerationStatus: moderationStatus,
    };
    return db.mealPlan.upsert({
        where: { userId_startDate: { userId: owner, startDate: start } },
        create: { userId: owner, startDate: start, ...data },
        update: data,
        select: { shareToken: true, shareCreatedAt: true },
    });
}

export async function revokeMealPlanShare(db: Db, userId: string, startDate: string) {
    const owner = userIdSchema.parse(userId);
    const start = toDbDate(isoDateSchema.parse(startDate));
    const result = await db.mealPlan.updateMany({
        where: { userId: owner, startDate: start, shareToken: { not: null } },
        data: { shareToken: null, shareRevokedAt: new Date() },
    });
    return { revoked: result.count > 0 };
}

/**
 * Public read of a shared week. Returns only recipes, slots, times and servings —
 * no notes, pantry, list, timezone or push data (KUC-110). Custom slot names are
 * only shown after moderation approved them.
 */
export async function getSharedMealPlanWeek(db: Db, token: string) {
    const parsed = shareTokenSchema.safeParse(token);
    if (!parsed.success) return null;
    const week = await db.mealPlan.findUnique({
        where: { shareToken: parsed.data },
        select: {
            userId: true,
            startDate: true,
            slotOverride: true,
            shareRevokedAt: true,
            shareModerationStatus: true,
            user: { select: { profile: { select: { mealPlanSlots: true } } } },
        },
    });
    if (!week || week.shareRevokedAt) return null;
    const start = formatIsoDate(week.startDate);
    const namesApproved =
        week.shareModerationStatus === 'APPROVED' || week.shareModerationStatus === 'AUTO_APPROVED';
    const slots = resolveSlots(week.user.profile?.mealPlanSlots, week.slotOverride).map((slot) => ({
        key: slot.key,
        time: slot.time,
        enabled: slot.enabled,
        label: namesApproved || slot.name === null ? slotLabel(slot) : 'Weitere Mahlzeit',
    }));
    const { from, to } = weekRange(start);
    const entries = await db.mealPlanRecipe.findMany({
        where: {
            userId: week.userId,
            date: { gte: toDbDate(from), lte: toDbDate(to) },
            recipe: { status: 'PUBLISHED', moderationStatus: { not: 'REJECTED' } },
        },
        select: {
            date: true,
            mealType: true,
            customMealType: true,
            position: true,
            time: true,
            servings: true,
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageKey: true,
                    blurhash: true,
                    totalTime: true,
                },
            },
        },
        orderBy: [{ date: 'asc' }, { position: 'asc' }],
    });
    return {
        startDate: start,
        days: weekDays(start),
        slots,
        entries: entries.map(({ mealType, customMealType, date, ...entry }) => ({
            ...entry,
            date: formatIsoDate(date),
            slot: slotKeyOf({ mealType, customMealType }),
        })),
    };
}
