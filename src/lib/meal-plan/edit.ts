// Editing the plan (KUC-101): move, copy and swap entries, copy days and weeks,
// week templates and "Für 2 Mahlzeiten kochen". Same conventions as repository.ts:
// `fn(db, userId, input)`, Zod-validated input, foreign rows answer NOT_FOUND.
import type { Prisma } from '@prisma/client';

import { planCopy, type ConflictMode, type CopySource, type CopyTarget } from './copy';
import { DataAccessError, type Db, inTransaction, notFound } from './db';
import {
    findOwnedEntry,
    isRecipeAvailable,
    nextPosition,
    recipeSummary,
    updateMealPlanEntry,
    withSlot,
} from './repository';
import {
    applyTemplateSchema,
    copyDaysSchema,
    idSchema,
    leftoverTargetSchema,
    moveEntrySchema,
    saveTemplateSchema,
    servingsSchema,
    swapCellsSchema,
    userIdSchema,
} from './schemas';
import { slotColumns, slotKeyOf, type SlotKey } from './slots';
import { cellKey } from './view';
import { addDays, formatIsoDate, toDbDate } from './week';

/** Upper bound of saved templates per user */
export const MAX_TEMPLATES = 30;

const dayDiff = (from: string, to: string) =>
    Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

// ---------------------------------------------------------------- single entries

/** "Verschieben nach …" or, with `copy`, "Kopieren nach …"; appended to the target slot. */
export async function moveMealPlanEntry(db: Db, userId: string, entryId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { copy, date, slot } = moveEntrySchema.parse(input);
    if (!copy) return updateMealPlanEntry(db, owner, entryId, { date, slot });

    const source = await findOwnedEntry(db, owner, entryId);
    const entry = await db.mealPlanRecipe.create({
        data: {
            userId: owner,
            recipeId: source.recipeId,
            date: toDbDate(date),
            ...slotColumns(slot),
            position: await nextPosition(db, owner, date, slot),
            time: source.time,
            servings: source.servings,
            notes: source.notes,
            // A copy is planned anew: not cooked, not booked, not a leftover
        },
        include: { recipe: recipeSummary },
    });
    return withSlot(entry, owner);
}

/** Swaps the dishes of two cells (drag & drop onto a taken slot, "Tauschen"). */
export async function swapMealPlanCells(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { a, b } = swapCellsSchema.parse(input);
    if (a.date === b.date && a.slot === b.slot) return { moved: 0 };
    return inTransaction(db, async (tx) => {
        const inCell = (cell: { date: string; slot: SlotKey }) =>
            tx.mealPlanRecipe.findMany({
                where: { userId: owner, date: toDbDate(cell.date), ...slotColumns(cell.slot) },
                select: { id: true },
            });
        const [fromA, fromB] = await Promise.all([inCell(a), inCell(b)]);
        const moveTo = (ids: string[], cell: { date: string; slot: SlotKey }) =>
            ids.length
                ? tx.mealPlanRecipe.updateMany({
                      where: { id: { in: ids }, userId: owner },
                      data: { date: toDbDate(cell.date), ...slotColumns(cell.slot) },
                  })
                : null;
        await moveTo(
            fromA.map((e) => e.id),
            b,
        );
        await moveTo(
            fromB.map((e) => e.id),
            a,
        );
        return { moved: fromA.length + fromB.length };
    });
}

/**
 * "Für 2 Mahlzeiten kochen": doubles the servings of `entryId` and plans the second
 * half as its leftover in `target`. The leftover is neither bought nor booked again.
 */
export async function cookForTwoMeals(db: Db, userId: string, entryId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const target = leftoverTargetSchema.parse(input);
    return inTransaction(db, async (tx) => {
        const origin = await findOwnedEntry(tx, owner, entryId);
        if (origin.leftoverOfId)
            throw new DataAccessError('INVALID', 'Ein Rest kann keinen weiteren Rest haben');
        if (target.date < formatIsoDate(origin.date))
            throw new DataAccessError('INVALID', 'Der Rest kann nicht vor dem Kochen liegen');
        if (target.date === formatIsoDate(origin.date) && target.slot === slotKeyOf(origin))
            throw new DataAccessError('INVALID', 'Wähle eine andere Mahlzeit für den Rest');
        const portion = origin.servings;
        await tx.mealPlanRecipe.update({
            where: { id: origin.id },
            data: { servings: Math.min(100, portion * 2) },
        });
        const leftover = await tx.mealPlanRecipe.create({
            data: {
                userId: owner,
                recipeId: origin.recipeId,
                date: toDbDate(target.date),
                ...slotColumns(target.slot),
                position: await nextPosition(tx, owner, target.date, target.slot),
                servings: portion,
                leftoverOfId: origin.id,
            },
            select: { id: true },
        });
        return { originId: origin.id, leftoverId: leftover.id, originServings: portion };
    });
}

/** Undo of cookForTwoMeals: removes the leftover and restores the origin's servings. */
export async function removeLeftover(
    db: Db,
    userId: string,
    leftoverId: string,
    originServings: unknown,
) {
    const owner = userIdSchema.parse(userId);
    const servings = servingsSchema.parse(originServings);
    return inTransaction(db, async (tx) => {
        const leftover = await findOwnedEntry(tx, owner, leftoverId);
        if (!leftover.leftoverOfId) throw notFound('Rest');
        await tx.mealPlanRecipe.delete({ where: { id: leftover.id } });
        await tx.mealPlanRecipe.updateMany({
            where: { id: leftover.leftoverOfId, userId: owner },
            data: { servings },
        });
        return { originId: leftover.leftoverOfId };
    });
}

// ---------------------------------------------------------------- copy days and weeks

type SourceRow = Prisma.MealPlanRecipeGetPayload<{
    include: { recipe: { select: { status: true; moderationStatus: true; authorId: true } } };
}>;

const availability = { select: { status: true, moderationStatus: true, authorId: true } } as const;

async function loadRange(db: Db, userId: string, from: string, days: number) {
    return db.mealPlanRecipe.findMany({
        where: {
            userId,
            date: { gte: toDbDate(from), lte: toDbDate(addDays(from, days - 1)) },
        },
        include: { recipe: availability },
        orderBy: [{ date: 'asc' }, { position: 'asc' }],
    }) as Promise<SourceRow[]>;
}

const toTargets = (rows: SourceRow[]): CopyTarget[] =>
    rows.map((row) => ({
        id: row.id,
        date: formatIsoDate(row.date),
        slot: slotKeyOf(row),
        position: row.position,
    }));

/** Unavailable recipes (archived, rejected, foreign drafts) are never copied. */
function toSources(rows: SourceRow[], from: string, userId: string) {
    const usable = rows.filter(
        (row) => row.status !== 'CANCELLED' && isRecipeAvailable(row.recipe, userId),
    );
    const sources: CopySource[] = usable.map((row) => ({
        id: row.id,
        recipeId: row.recipeId,
        dayOffset: dayDiff(from, formatIsoDate(row.date)),
        slot: slotKeyOf(row),
        position: row.position,
        time: row.time,
        servings: row.servings,
        notes: row.notes,
        leftoverOfId: row.leftoverOfId,
    }));
    return { sources, unavailable: rows.length - usable.length };
}

export interface CopyPreview {
    /** Dishes that would be copied */
    count: number;
    /** Taken target cells with the titles already there */
    conflicts: Array<{ date: string; slot: string; titles: string[] }>;
}

export async function previewFor(
    db: Db,
    userId: string,
    sources: CopySource[],
    targetStart: string,
    days: number,
): Promise<CopyPreview> {
    const targets = await db.mealPlanRecipe.findMany({
        where: {
            userId,
            date: { gte: toDbDate(targetStart), lte: toDbDate(addDays(targetStart, days - 1)) },
        },
        include: { recipe: { select: { title: true } } },
        orderBy: [{ date: 'asc' }, { position: 'asc' }],
    });
    const plan = planCopy(
        sources,
        targetStart,
        targets.map((t) => ({
            id: t.id,
            date: formatIsoDate(t.date),
            slot: slotKeyOf(t),
            position: t.position,
        })),
        'add',
    );
    return {
        count: plan.creates.length,
        conflicts: plan.conflicts.map((key) => {
            const [date, slot] = key.split('|');
            return {
                date,
                slot,
                titles: targets
                    .filter((t) => cellKey(formatIsoDate(t.date), slotKeyOf(t)) === key)
                    .map((t) => t.recipe.title),
            };
        }),
    };
}

export async function executeCopy(
    tx: Db,
    userId: string,
    sources: CopySource[],
    targetStart: string,
    days: number,
    mode: ConflictMode,
) {
    const targets = toTargets(await loadRange(tx, userId, targetStart, days));
    const plan = planCopy(sources, targetStart, targets, mode);
    if (plan.deleteIds.length)
        await tx.mealPlanRecipe.deleteMany({ where: { id: { in: plan.deleteIds }, userId } });
    const newIds = new Map<string, string>();
    for (const item of plan.creates) {
        const created = await tx.mealPlanRecipe.create({
            data: {
                userId,
                recipeId: item.recipeId,
                date: toDbDate(item.date),
                ...slotColumns(item.slot as SlotKey),
                position: item.position,
                time: item.time,
                servings: item.servings,
                notes: item.notes,
                leftoverOfId: item.leftoverOfSourceId
                    ? (newIds.get(item.leftoverOfSourceId) ?? null)
                    : null,
            },
            select: { id: true },
        });
        newIds.set(item.sourceId, created.id);
    }
    return {
        created: plan.creates.length,
        replaced: plan.deleteIds.length,
        skipped: plan.skipped,
        conflicts: plan.conflicts.length,
    };
}

/** Conflicts before "Letzte Woche übernehmen" or "Tag kopieren". */
export async function previewCopyDays(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { from, to, days } = copyDaysSchema.parse(input);
    const { sources } = toSources(await loadRange(db, owner, from, days), from, owner);
    return previewFor(db, owner, sources, to, days);
}

/** Copies one day or a whole week; copies are planned anew (not cooked). */
export async function copyMealPlanDays(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { from, to, days, mode } = copyDaysSchema.parse(input);
    return inTransaction(db, async (tx) => {
        const { sources, unavailable } = toSources(
            await loadRange(tx, owner, from, days),
            from,
            owner,
        );
        const result = await executeCopy(tx, owner, sources, to, days, mode);
        return { ...result, skipped: result.skipped + unavailable };
    });
}

// ---------------------------------------------------------------- templates

export async function listMealPlanTemplates(db: Db, userId: string) {
    const owner = userIdSchema.parse(userId);
    const templates = await db.mealPlanTemplate.findMany({
        where: { userId: owner },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            name: true,
            updatedAt: true,
            entries: {
                select: { recipe: { select: { title: true } } },
                orderBy: { dayOffset: 'asc' },
            },
        },
    });
    return templates.map((template) => ({
        id: template.id,
        name: template.name,
        updatedAt: template.updatedAt,
        count: template.entries.length,
        titles: template.entries.slice(0, 4).map((entry) => entry.recipe.title),
    }));
}

/**
 * Saves the week from `startDate` as a named template. Leftover entries are left out:
 * applying the template plans their origin with the doubled servings already.
 */
export async function saveMealPlanTemplate(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { startDate, name } = saveTemplateSchema.parse(input);
    return inTransaction(db, async (tx) => {
        const count = await tx.mealPlanTemplate.count({ where: { userId: owner } });
        if (count >= MAX_TEMPLATES)
            throw new DataAccessError('CONFLICT', `Höchstens ${MAX_TEMPLATES} Vorlagen`);
        const { sources } = toSources(await loadRange(tx, owner, startDate, 7), startDate, owner);
        const kept = sources.filter((source) => !source.leftoverOfId);
        if (!kept.length) throw new DataAccessError('INVALID', 'Die Woche ist noch leer');
        const template = await tx.mealPlanTemplate.create({
            data: {
                userId: owner,
                name,
                entries: {
                    create: kept.map((source) => ({
                        recipeId: source.recipeId,
                        dayOffset: source.dayOffset,
                        ...slotColumns(source.slot as SlotKey),
                        position: source.position,
                        time: source.time,
                        servings: source.servings,
                        notes: source.notes,
                    })),
                },
            },
            select: { id: true, name: true },
        });
        return { ...template, count: kept.length };
    });
}

async function templateSources(db: Db, userId: string, templateId: string) {
    const template = await db.mealPlanTemplate.findFirst({
        where: { id: idSchema.parse(templateId), userId },
        select: { entries: { include: { recipe: availability } } },
    });
    if (!template) throw notFound('Vorlage');
    const usable = template.entries.filter((entry) => isRecipeAvailable(entry.recipe, userId));
    const sources: CopySource[] = usable.map((entry) => ({
        id: entry.id,
        recipeId: entry.recipeId,
        dayOffset: entry.dayOffset,
        slot: slotKeyOf(entry),
        position: entry.position,
        time: entry.time,
        servings: entry.servings,
        notes: entry.notes,
        leftoverOfId: null,
    }));
    return { sources, unavailable: template.entries.length - usable.length };
}

export async function previewMealPlanTemplate(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { templateId, startDate } = applyTemplateSchema.parse(input);
    const { sources } = await templateSources(db, owner, templateId);
    return previewFor(db, owner, sources, startDate, 7);
}

export async function applyMealPlanTemplate(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { templateId, startDate, mode } = applyTemplateSchema.parse(input);
    return inTransaction(db, async (tx) => {
        const { sources, unavailable } = await templateSources(tx, owner, templateId);
        const result = await executeCopy(tx, owner, sources, startDate, 7, mode);
        return { ...result, skipped: result.skipped + unavailable };
    });
}

export async function deleteMealPlanTemplate(db: Db, userId: string, templateId: string) {
    const owner = userIdSchema.parse(userId);
    const result = await db.mealPlanTemplate.deleteMany({
        where: { id: idSchema.parse(templateId), userId: owner },
    });
    if (result.count === 0) throw notFound('Vorlage');
    return { id: templateId };
}
