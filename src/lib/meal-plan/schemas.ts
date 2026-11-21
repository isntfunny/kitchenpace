// Zod schemas for meal plan input (KUC-98). Same ranges as the CHECK constraints
// in prisma/migrations/20261121210000_meal_plan_shopping_pantry.
import { z } from 'zod';

import { slotKeySchema, slotListSchema, timeSchema } from './slots';
import { isIsoDate, isValidTimezone } from './week';

export const idSchema = z.string().trim().min(1).max(64);
export const userIdSchema = idSchema;
export const isoDateSchema = z.string().refine(isIsoDate, 'Datum im Format JJJJ-MM-TT');
export const weekdaySchema = z.number().int().min(1).max(7);
export const servingsSchema = z.number().int().min(1).max(100);
export const notesSchema = z.string().trim().max(500);

export const mealPlanSettingsSchema = z
    .object({
        householdSize: z.number().int().min(1).max(20),
        weekStartDay: weekdaySchema,
        shoppingDay: weekdaySchema.nullable(),
        timezone: z.string().max(64).refine(isValidTimezone, 'Unbekannte Zeitzone'),
        mealPlanShowTime: z.boolean(),
        mealPlanShowServings: z.boolean(),
        mealPlanShowCalories: z.boolean(),
        mealPlanSlots: slotListSchema.nullable(),
        notifyOnCookStart: z.boolean(),
        notifyOnWeeklyPlanReminder: z.boolean(),
        quietHoursStart: timeSchema.nullable(),
        quietHoursEnd: timeSchema.nullable(),
    })
    .partial()
    .strict();
export type MealPlanSettingsInput = z.input<typeof mealPlanSettingsSchema>;

export const addEntrySchema = z
    .object({
        recipeId: idSchema,
        date: isoDateSchema,
        slot: slotKeySchema,
        /** null/undefined = slot default time */
        time: timeSchema.nullish(),
        /** undefined = household size */
        servings: servingsSchema.optional(),
        notes: notesSchema.nullish(),
        /** undefined = appended at the end of the slot */
        position: z.number().int().min(0).max(1000).optional(),
        pinned: z.boolean().optional(),
        leftoverOfId: idSchema.nullish(),
    })
    .strict();
export type AddEntryInput = z.input<typeof addEntrySchema>;

export const updateEntrySchema = z
    .object({
        date: isoDateSchema,
        slot: slotKeySchema,
        time: timeSchema.nullable(),
        servings: servingsSchema,
        notes: notesSchema.nullable(),
        position: z.number().int().min(0).max(1000),
        pinned: z.boolean(),
        status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    })
    .partial()
    .strict();
export type UpdateEntryInput = z.input<typeof updateEntrySchema>;

export const listEntriesSchema = z
    .object({ from: isoDateSchema, to: isoDateSchema })
    .refine((range) => range.from <= range.to, 'Zeitraum ist leer')
    .refine(
        (range) => (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 <= 62,
        'Zeitraum ist zu lang',
    );

export const markCookedSchema = z
    .object({ cookedAt: z.date().optional(), cookHistoryId: idSchema.nullish() })
    .strict();

/** Snapshot returned by deleteEntry; passing it back to restoreEntry undoes the delete. */
export const entrySnapshotSchema = z
    .object({
        id: idSchema,
        recipeId: idSchema,
        date: isoDateSchema,
        slot: slotKeySchema,
        position: z.number().int().min(0),
        time: timeSchema.nullable(),
        servings: servingsSchema,
        status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
        pinned: z.boolean(),
        notes: notesSchema.nullable(),
        cookedAt: z.coerce.date().nullable(),
        leftoverOfId: idSchema.nullable(),
        /** Leftover entries that pointed to this one; relinked on restore */
        leftoverIds: z.array(idSchema).max(20).optional(),
    })
    .strict();
export type EntrySnapshot = z.infer<typeof entrySnapshotSchema>;

// ---------------------------------------------------------------- editing (KUC-101)

const cellSchema = z.object({ date: isoDateSchema, slot: slotKeySchema }).strict();

/** "Verschieben nach …" / "Kopieren nach …" and drag & drop */
export const moveEntrySchema = cellSchema.extend({ copy: z.boolean().optional() }).strict();

export const swapCellsSchema = z.object({ a: cellSchema, b: cellSchema }).strict();

export const conflictModeSchema = z.enum(['add', 'skip', 'replace']);

/** Copies 1 (day) or 7 (week) days from `from` to `to` */
export const copyDaysSchema = z
    .object({
        from: isoDateSchema,
        to: isoDateSchema,
        days: z.union([z.literal(1), z.literal(7)]),
        mode: conflictModeSchema.default('add'),
    })
    .strict()
    .refine((input) => input.from !== input.to, 'Quelle und Ziel sind gleich');

export const templateNameSchema = z.string().trim().min(1).max(80);

export const saveTemplateSchema = z
    .object({ startDate: isoDateSchema, name: templateNameSchema })
    .strict();

export const applyTemplateSchema = z
    .object({
        templateId: idSchema,
        startDate: isoDateSchema,
        mode: conflictModeSchema.default('add'),
    })
    .strict();

/** "Für 2 Mahlzeiten kochen": where the leftover meal goes */
export const leftoverTargetSchema = cellSchema;

export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);
