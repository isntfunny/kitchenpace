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
    })
    .strict();
export type EntrySnapshot = z.infer<typeof entrySnapshotSchema>;

export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);
