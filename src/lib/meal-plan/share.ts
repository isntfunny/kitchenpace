// Read-only share link of one week (KUC-110). Owner functions check userId;
// the public read returns only recipes, slots, times and servings.
import { randomBytes } from 'node:crypto';

import { z } from 'zod';

import { formatIsoDate } from '@shared/dates';

import type { CopySource } from './copy';
import { type Db, inTransaction, notFound } from './db';
import { executeCopy, previewFor } from './edit';
import { conflictModeSchema, isoDateSchema, shareTokenSchema, userIdSchema } from './schemas';
import {
    DEFAULT_SLOTS,
    isFixedSlot,
    resolveSlots,
    slotKeyOf,
    slotLabel,
    type SlotConfig,
    type SlotKey,
} from './slots';
import { toDbDate, weekDays, weekRange } from './week';

/** Moderation queue content type of a shared week (KUC-110) */
export const SHARE_CONTENT_TYPE = 'meal_plan_share';

/** What was moderated; only these exact texts are shown on the shared page */
export interface ShareModerationSnapshot {
    includeNotes: boolean;
    notes: string[];
    slotNames: string[];
}

const snapshotSchema = z.object({
    includeNotes: z.boolean().catch(false),
    notes: z.array(z.string()).catch([]),
    slotNames: z.array(z.string()).catch([]),
});

const APPROVED = new Set(['APPROVED', 'AUTO_APPROVED']);

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
    moderationStatus: ShareModerationStatus | null = null,
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
        select: { id: true, shareToken: true, shareCreatedAt: true },
    });
}

export type ShareModerationStatus = 'APPROVED' | 'AUTO_APPROVED' | 'PENDING' | 'REJECTED';

/** The active share of a week for its owner, or null. */
export async function getMealPlanShare(db: Db, userId: string, startDate: string) {
    const owner = userIdSchema.parse(userId);
    const start = toDbDate(isoDateSchema.parse(startDate));
    const week = await db.mealPlan.findUnique({
        where: { userId_startDate: { userId: owner, startDate: start } },
        select: {
            id: true,
            shareToken: true,
            shareCreatedAt: true,
            shareRevokedAt: true,
            shareModerationStatus: true,
        },
    });
    if (!week?.shareToken || week.shareRevokedAt) return null;
    const snapshot = await moderatedTexts(db, week.id);
    return {
        id: week.id,
        token: week.shareToken,
        createdAt: week.shareCreatedAt,
        moderationStatus: week.shareModerationStatus,
        includeNotes: snapshot?.includeNotes ?? false,
    };
}

/** Records the moderation outcome of the week's notes and slot names. */
export async function setShareModeration(
    db: Db,
    userId: string,
    startDate: string,
    status: ShareModerationStatus,
) {
    const owner = userIdSchema.parse(userId);
    const start = toDbDate(isoDateSchema.parse(startDate));
    const result = await db.mealPlan.updateMany({
        where: { userId: owner, startDate: start, shareToken: { not: null } },
        data: { shareModerationStatus: status },
    });
    if (result.count === 0) throw notFound('Freigabe');
}

/**
 * Texts of a week that need moderation before sharing: custom slot names of slots in
 * use and, if the owner wants them shown, the entry notes. Unique, trimmed, sorted.
 */
export async function shareTextsOf(
    db: Db,
    userId: string,
    startDate: string,
    includeNotes: boolean,
): Promise<ShareModerationSnapshot> {
    const owner = userIdSchema.parse(userId);
    const start = isoDateSchema.parse(startDate);
    const [profile, week] = await Promise.all([
        db.profile.findUnique({ where: { userId: owner }, select: { mealPlanSlots: true } }),
        db.mealPlan.findUnique({
            where: { userId_startDate: { userId: owner, startDate: toDbDate(start) } },
            select: { slotOverride: true },
        }),
    ]);
    const { from, to } = weekRange(start);
    const entries = await db.mealPlanRecipe.findMany({
        where: {
            userId: owner,
            date: { gte: toDbDate(from), lte: toDbDate(to) },
            recipe: { status: 'PUBLISHED', moderationStatus: { not: 'REJECTED' } },
        },
        select: { mealType: true, customMealType: true, notes: true },
    });
    const slots = resolveSlots(profile?.mealPlanSlots, week?.slotOverride);
    const used = new Set(entries.map((entry) => slotKeyOf(entry)));
    const unique = (values: Array<string | null | undefined>) =>
        [...new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v))].sort();
    return {
        includeNotes,
        notes: includeNotes ? unique(entries.map((entry) => entry.notes)) : [],
        slotNames: unique(
            slots
                .filter((slot) => !isFixedSlot(slot.key) && (slot.enabled || used.has(slot.key)))
                .map((slot) => slot.name),
        ),
    };
}

/** The texts the last moderation of this share covered (from the moderation queue). */
async function moderatedTexts(db: Db, mealPlanId: string) {
    const row = await db.moderationQueue.findFirst({
        where: { contentType: SHARE_CONTENT_TYPE, contentId: mealPlanId },
        select: { contentSnapshot: true },
    });
    const parsed = snapshotSchema.safeParse(row?.contentSnapshot);
    return parsed.success ? parsed.data : null;
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
 * no pantry, list, timezone or push data (KUC-110). Custom slot names and notes only
 * appear after moderation approved them, and only in the exact wording moderated.
 */
export async function getSharedMealPlanWeek(db: Db, token: string) {
    const week = await findSharedWeek(db, token);
    if (!week) return null;
    const start = formatIsoDate(week.startDate);
    const moderated = APPROVED.has(week.shareModerationStatus ?? '')
        ? await moderatedTexts(db, week.id)
        : null;
    const names = new Set(moderated?.slotNames ?? []);
    const notes = new Set(moderated?.includeNotes ? moderated.notes : []);
    const slots = sharedSlots(week).map((slot) => ({
        key: slot.key,
        time: slot.time,
        enabled: slot.enabled,
        label:
            isFixedSlot(slot.key) || (slot.name && names.has(slot.name.trim()))
                ? slotLabel(slot)
                : 'Weitere Mahlzeit',
    }));
    const entries = await sharedEntries(db, week.userId, start);
    return {
        startDate: start,
        days: weekDays(start),
        slots,
        entries: entries.map((entry) => {
            const note = entry.notes?.trim();
            return {
                date: formatIsoDate(entry.date),
                slot: slotKeyOf(entry),
                position: entry.position,
                time: entry.time,
                servings: entry.servings,
                recipe: entry.recipe,
                ...(note && notes.has(note) && { notes: note }),
            };
        }),
    };
}

export type SharedMealPlanWeek = NonNullable<Awaited<ReturnType<typeof getSharedMealPlanWeek>>>;

async function findSharedWeek(db: Db, token: string) {
    const parsed = shareTokenSchema.safeParse(token);
    if (!parsed.success) return null;
    const week = await db.mealPlan.findUnique({
        where: { shareToken: parsed.data },
        select: {
            id: true,
            userId: true,
            startDate: true,
            slotOverride: true,
            shareRevokedAt: true,
            shareModerationStatus: true,
            user: { select: { profile: { select: { mealPlanSlots: true } } } },
        },
    });
    return !week || week.shareRevokedAt ? null : week;
}

const sharedSlots = (week: {
    slotOverride: unknown;
    user: { profile: { mealPlanSlots: unknown } | null };
}) => resolveSlots(week.user.profile?.mealPlanSlots, week.slotOverride);

/** Entries of published recipes only; drafts and archived recipes of the owner stay private. */
function sharedEntries(db: Db, ownerId: string, start: string) {
    const { from, to } = weekRange(start);
    return db.mealPlanRecipe.findMany({
        where: {
            userId: ownerId,
            date: { gte: toDbDate(from), lte: toDbDate(to) },
            recipe: { status: 'PUBLISHED', moderationStatus: { not: 'REJECTED' } },
        },
        select: {
            id: true,
            date: true,
            mealType: true,
            customMealType: true,
            position: true,
            time: true,
            servings: true,
            notes: true,
            leftoverOfId: true,
            recipeId: true,
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageKey: true,
                    imagePlaceholder: true,
                    totalTime: true,
                },
            },
        },
        orderBy: [{ date: 'asc' }, { position: 'asc' }],
    });
}

// ---------------------------------------------------------------- "In meinen Plan übernehmen"

/**
 * Slot of the viewer for a slot of the shared week: the same key if the viewer has it,
 * otherwise the viewer's fixed meal closest in time (custom slots are personal).
 */
export function mapSharedSlot(
    slot: { key: string; time: string },
    viewerSlots: readonly SlotConfig[],
): SlotKey {
    if (viewerSlots.some((own) => own.key === slot.key)) return slot.key as SlotKey;
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const fixed = viewerSlots.filter((own) => isFixedSlot(own.key));
    const candidates = fixed.some((own) => own.enabled)
        ? fixed.filter((own) => own.enabled)
        : fixed;
    const pool = candidates.length ? candidates : DEFAULT_SLOTS.filter((own) => own.enabled);
    return pool.reduce((best, own) =>
        Math.abs(minutes(own.time) - minutes(slot.time)) <
        Math.abs(minutes(best.time) - minutes(slot.time))
            ? own
            : best,
    ).key as SlotKey;
}

const importSchema = z
    .object({
        token: shareTokenSchema,
        startDate: isoDateSchema,
        mode: conflictModeSchema.default('add'),
    })
    .strict();

async function importSources(db: Db, viewerId: string, token: string) {
    const week = await findSharedWeek(db, token);
    if (!week) throw notFound('Geteilte Woche');
    const start = formatIsoDate(week.startDate);
    const ownSlots = new Map(sharedSlots(week).map((slot) => [slot.key, slot]));
    const profile = await db.profile.findUnique({
        where: { userId: viewerId },
        select: { mealPlanSlots: true },
    });
    const viewerSlots = resolveSlots(profile?.mealPlanSlots);
    const entries = await sharedEntries(db, week.userId, start);
    const sources: CopySource[] = entries.map((entry) => {
        const key = slotKeyOf(entry);
        const time = ownSlots.get(key)?.time ?? entry.time ?? '12:00';
        return {
            id: entry.id,
            recipeId: entry.recipeId,
            dayOffset: Math.round((entry.date.getTime() - week.startDate.getTime()) / 86_400_000),
            slot: mapSharedSlot({ key, time }, viewerSlots),
            position: entry.position,
            time: entry.time,
            servings: entry.servings,
            // Notes are the owner's; they are not copied
            notes: null,
            leftoverOfId: entry.leftoverOfId,
        };
    });
    return { sources, start };
}

/** Conflicts before taking a shared week over into the viewer's week from `startDate`. */
export async function previewSharedWeekImport(db: Db, userId: string, input: unknown) {
    const viewer = userIdSchema.parse(userId);
    const { token, startDate } = importSchema.parse(input);
    const { sources } = await importSources(db, viewer, token);
    return previewFor(db, viewer, sources, startDate, 7);
}

/** "In meinen Plan übernehmen": copies the shared week like "Letzte Woche übernehmen". */
export async function importSharedWeek(db: Db, userId: string, input: unknown) {
    const viewer = userIdSchema.parse(userId);
    const { token, startDate, mode } = importSchema.parse(input);
    return inTransaction(db, async (tx) => {
        const { sources } = await importSources(tx, viewer, token);
        return executeCopy(tx, viewer, sources, startDate, 7, mode);
    });
}
