// Meal plan data access (KUC-98). Every function checks ownership via userId and
// validates its input with Zod; pass `prisma` from '@shared/prisma' as `db`.
import { Prisma, type MealPlanRecipe } from '@prisma/client';

import { DataAccessError, type Db, notFound } from './db';
import {
    addEntrySchema,
    entrySnapshotSchema,
    idSchema,
    isoDateSchema,
    listEntriesSchema,
    markCookedSchema,
    mealPlanSettingsSchema,
    updateEntrySchema,
    userIdSchema,
    type EntrySnapshot,
} from './schemas';
import {
    defaultServings,
    resolveSlots,
    slotColumns,
    slotKeyOf,
    slotListSchema,
    type SlotConfig,
    type SlotKey,
} from './slots';
import { formatIsoDate, toDbDate, weekDays, weekRange } from './week';

const recipeSummary = {
    select: {
        id: true,
        title: true,
        slug: true,
        imageKey: true,
        blurhash: true,
        servings: true,
        totalTime: true,
        prepTime: true,
        cookTime: true,
        caloriesPerServing: true,
        nutritionCompleteness: true,
        status: true,
        moderationStatus: true,
        authorId: true,
    },
} satisfies Prisma.RecipeDefaultArgs;

export type MealPlanEntry = Prisma.MealPlanRecipeGetPayload<{
    include: { recipe: typeof recipeSummary };
}> & {
    slot: string;
    /** false for archived/rejected recipes or drafts of others (KUC-99 marks them) */
    recipeAvailable: boolean;
};

export interface MealPlanSettings {
    householdSize: number | null;
    weekStartDay: number;
    shoppingDay: number | null;
    timezone: string;
    mealPlanShowTime: boolean;
    mealPlanShowServings: boolean;
    mealPlanShowCalories: boolean;
    notifyOnCookStart: boolean;
    notifyOnWeeklyPlanReminder: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    /** Effective user-default slots (defaults filled in) */
    slots: SlotConfig[];
}

const settingsSelect = {
    householdSize: true,
    weekStartDay: true,
    shoppingDay: true,
    timezone: true,
    mealPlanShowTime: true,
    mealPlanShowServings: true,
    mealPlanShowCalories: true,
    mealPlanSlots: true,
    notifyOnCookStart: true,
    notifyOnWeeklyPlanReminder: true,
    quietHoursStart: true,
    quietHoursEnd: true,
} satisfies Prisma.ProfileSelect;

const SETTINGS_DEFAULTS: Omit<MealPlanSettings, 'slots'> = {
    householdSize: null,
    weekStartDay: 1,
    shoppingDay: null,
    timezone: 'Europe/Berlin',
    mealPlanShowTime: true,
    mealPlanShowServings: false,
    mealPlanShowCalories: true,
    notifyOnCookStart: true,
    notifyOnWeeklyPlanReminder: true,
    quietHoursStart: null,
    quietHoursEnd: null,
};

function isRecipeAvailable(
    recipe: { status: string; moderationStatus: string; authorId: string },
    userId: string,
): boolean {
    if (recipe.moderationStatus === 'REJECTED') return false;
    if (recipe.authorId === userId) return recipe.status !== 'ARCHIVED';
    return recipe.status === 'PUBLISHED';
}

function withSlot<
    T extends MealPlanRecipe & {
        recipe: { status: string; moderationStatus: string; authorId: string };
    },
>(entry: T, userId: string) {
    return {
        ...entry,
        slot: slotKeyOf(entry),
        recipeAvailable: isRecipeAvailable(entry.recipe, userId),
    };
}

// ---------------------------------------------------------------- settings

export async function getMealPlanSettings(db: Db, userId: string): Promise<MealPlanSettings> {
    const owner = userIdSchema.parse(userId);
    const profile = await db.profile.findUnique({
        where: { userId: owner },
        select: settingsSelect,
    });
    const { mealPlanSlots, ...rest } = profile ?? { ...SETTINGS_DEFAULTS, mealPlanSlots: null };
    return { ...rest, slots: resolveSlots(mealPlanSlots) };
}

export async function updateMealPlanSettings(
    db: Db,
    userId: string,
    input: unknown,
): Promise<MealPlanSettings> {
    const owner = userIdSchema.parse(userId);
    const data = mealPlanSettingsSchema.parse(input);
    const { mealPlanSlots, ...scalar } = data;
    const result = await db.profile.updateMany({
        where: { userId: owner },
        data: {
            ...scalar,
            ...(mealPlanSlots !== undefined && {
                mealPlanSlots: mealPlanSlots === null ? Prisma.DbNull : mealPlanSlots,
            }),
        },
    });
    if (result.count === 0) throw notFound('Profil');
    return getMealPlanSettings(db, owner);
}

// ---------------------------------------------------------------- entries

async function assertRecipePlannable(db: Db, userId: string, recipeId: string) {
    const recipe = await db.recipe.findUnique({
        where: { id: recipeId },
        select: { status: true, moderationStatus: true, authorId: true },
    });
    if (!recipe || !isRecipeAvailable(recipe, userId)) throw notFound('Rezept');
}

async function findOwnedEntry(db: Db, userId: string, entryId: string) {
    const entry = await db.mealPlanRecipe.findFirst({
        where: { id: idSchema.parse(entryId), userId },
    });
    if (!entry) throw notFound('Eintrag');
    return entry;
}

async function nextPosition(db: Db, userId: string, date: string, slot: SlotKey) {
    const last = await db.mealPlanRecipe.findFirst({
        where: { userId, date: toDbDate(date), ...slotColumns(slot) },
        orderBy: { position: 'desc' },
        select: { position: true },
    });
    return last ? last.position + 1 : 0;
}

export async function listMealPlanEntries(db: Db, userId: string, range: unknown) {
    const owner = userIdSchema.parse(userId);
    const { from, to } = listEntriesSchema.parse(range);
    const entries = await db.mealPlanRecipe.findMany({
        where: { userId: owner, date: { gte: toDbDate(from), lte: toDbDate(to) } },
        include: { recipe: recipeSummary },
        orderBy: [{ date: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    });
    return entries.map((entry) => withSlot(entry, owner));
}

/** One week from `startDate` (any date; the UI passes the user's week start). */
export async function getMealPlanWeek(db: Db, userId: string, startDate: string) {
    const owner = userIdSchema.parse(userId);
    const start = isoDateSchema.parse(startDate);
    const [settings, week, entries] = await Promise.all([
        getMealPlanSettings(db, owner),
        db.mealPlan.findUnique({
            where: { userId_startDate: { userId: owner, startDate: toDbDate(start) } },
            select: {
                id: true,
                name: true,
                slotOverride: true,
                shareToken: true,
                shareRevokedAt: true,
            },
        }),
        listMealPlanEntries(db, owner, weekRange(start)),
    ]);
    const slots = week?.slotOverride != null ? resolveSlots(week.slotOverride) : settings.slots;
    return {
        startDate: start,
        days: weekDays(start),
        settings,
        slots,
        hasWeekOverride: week?.slotOverride != null,
        shared: !!week?.shareToken && !week.shareRevokedAt,
        entries,
    };
}

export async function addMealPlanEntry(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const data = addEntrySchema.parse(input);
    await assertRecipePlannable(db, owner, data.recipeId);
    if (data.leftoverOfId) await findOwnedEntry(db, owner, data.leftoverOfId);
    const settings =
        data.servings === undefined || data.time === undefined
            ? await getMealPlanSettings(db, owner)
            : null;
    const entry = await db.mealPlanRecipe.create({
        data: {
            userId: owner,
            recipeId: data.recipeId,
            date: toDbDate(data.date),
            ...slotColumns(data.slot),
            position: data.position ?? (await nextPosition(db, owner, data.date, data.slot)),
            // null = slot default; resolved at display/reminder time so slot changes apply
            time: data.time ?? null,
            servings: data.servings ?? defaultServings(settings?.householdSize),
            notes: data.notes ?? null,
            pinned: data.pinned ?? false,
            leftoverOfId: data.leftoverOfId ?? null,
        },
        include: { recipe: recipeSummary },
    });
    return withSlot(entry, owner);
}

export async function updateMealPlanEntry(db: Db, userId: string, entryId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const data = updateEntrySchema.parse(input);
    const current = await findOwnedEntry(db, owner, entryId);
    const { slot, date, ...rest } = data;
    const moving = slot !== undefined || date !== undefined;
    const target = {
        date: date ?? formatIsoDate(current.date),
        slot: slot ?? slotKeyOf(current),
    };
    const entry = await db.mealPlanRecipe.update({
        where: { id: current.id },
        data: {
            ...rest,
            ...(date !== undefined && { date: toDbDate(date) }),
            ...(slot !== undefined && slotColumns(slot)),
            ...(moving &&
                rest.position === undefined && {
                    position: await nextPosition(db, owner, target.date, target.slot),
                }),
        },
        include: { recipe: recipeSummary },
    });
    return withSlot(entry, owner);
}

/** Marks an entry as cooked; KUC-103 links the UserCookHistory row it created. */
export async function markMealPlanEntryCooked(
    db: Db,
    userId: string,
    entryId: string,
    input: unknown = {},
) {
    const owner = userIdSchema.parse(userId);
    const data = markCookedSchema.parse(input);
    const current = await findOwnedEntry(db, owner, entryId);
    if (data.cookHistoryId) {
        const history = await db.userCookHistory.findFirst({
            where: { id: data.cookHistoryId, userId: owner, recipeId: current.recipeId },
            select: { id: true },
        });
        if (!history) throw notFound('Kochverlauf');
    }
    return db.mealPlanRecipe.update({
        where: { id: current.id },
        data: {
            status: 'COMPLETED',
            cookedAt: data.cookedAt ?? current.cookedAt ?? new Date(),
            ...(data.cookHistoryId && { cookHistoryId: data.cookHistoryId }),
        },
    });
}

function snapshotOf(entry: MealPlanRecipe): EntrySnapshot {
    return {
        id: entry.id,
        recipeId: entry.recipeId,
        date: formatIsoDate(entry.date),
        slot: slotKeyOf(entry),
        position: entry.position,
        time: entry.time,
        servings: entry.servings,
        status: entry.status,
        pinned: entry.pinned,
        notes: entry.notes,
        cookedAt: entry.cookedAt,
        leftoverOfId: entry.leftoverOfId,
    };
}

/** Deletes an entry and returns a snapshot for "Rückgängig" (KUC-101). */
export async function deleteMealPlanEntry(db: Db, userId: string, entryId: string) {
    const owner = userIdSchema.parse(userId);
    const current = await findOwnedEntry(db, owner, entryId);
    await db.mealPlanRecipe.delete({ where: { id: current.id } });
    return snapshotOf(current);
}

/** Undo for deleteMealPlanEntry: recreates the entry with its old id. */
export async function restoreMealPlanEntry(db: Db, userId: string, snapshot: unknown) {
    const owner = userIdSchema.parse(userId);
    const data = entrySnapshotSchema.parse(snapshot);
    await assertRecipePlannable(db, owner, data.recipeId);
    const exists = await db.mealPlanRecipe.findUnique({
        where: { id: data.id },
        select: { id: true },
    });
    if (exists) throw new DataAccessError('CONFLICT', 'Eintrag existiert bereits');
    const leftoverOf = data.leftoverOfId
        ? await db.mealPlanRecipe.findFirst({
              where: { id: data.leftoverOfId, userId: owner },
              select: { id: true },
          })
        : null;
    const entry = await db.mealPlanRecipe.create({
        data: {
            id: data.id,
            userId: owner,
            recipeId: data.recipeId,
            date: toDbDate(data.date),
            ...slotColumns(data.slot),
            position: data.position,
            time: data.time,
            servings: data.servings,
            status: data.status,
            pinned: data.pinned,
            notes: data.notes,
            cookedAt: data.cookedAt,
            leftoverOfId: leftoverOf?.id ?? null,
        },
        include: { recipe: recipeSummary },
    });
    return withSlot(entry, owner);
}

// ---------------------------------------------------------------- week record

/** Week-only slot configuration (KUC-102 "nur für diese Woche"); null resets it. */
export async function setWeekSlotOverride(
    db: Db,
    userId: string,
    startDate: string,
    slots: unknown,
) {
    const owner = userIdSchema.parse(userId);
    const start = toDbDate(isoDateSchema.parse(startDate));
    const value = slots === null ? Prisma.DbNull : slotListSchema.parse(slots);
    return db.mealPlan.upsert({
        where: { userId_startDate: { userId: owner, startDate: start } },
        create: { userId: owner, startDate: start, slotOverride: value },
        update: { slotOverride: value },
        select: { id: true, slotOverride: true },
    });
}
