// One schema for the shelf-life data of raw ingredients (KUC-94) and their
// normalized display name (KUC-114). It produces the strict JSON schema for the
// OpenAI batch and validates the import and the admin form with the same enums.

import { z } from 'zod';

export const STORAGE_TYPES = ['FRIDGE', 'PANTRY', 'FREEZER'] as const;
export const SHELF_LIFE_SOURCES = ['AI', 'MANUAL', 'DEFAULT'] as const;
export const SHELF_LIFE_CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export const PACK_UNITS = ['G', 'ML', 'PIECE', 'BUNCH'] as const;

export type StorageTypeValue = (typeof STORAGE_TYPES)[number];
export type ShelfLifeSourceValue = (typeof SHELF_LIFE_SOURCES)[number];
export type ShelfLifeConfidenceValue = (typeof SHELF_LIFE_CONFIDENCES)[number];
export type PackUnitValue = (typeof PACK_UNITS)[number];

/** Upper bound the prompt allows for any shelf life (10 years). */
export const MAX_SHELF_LIFE_DAYS = 3650;

const StorageTypeSchema = z.enum(STORAGE_TYPES);

// ── Wire schema (what the model must return) ────────────────────────────
// Kept free of range checks so that the generated JSON schema stays exactly
// the one the prompt was tested with; the ranges are checked in
// ShelfLifeItemSchema below.

const StorageLifeWireSchema = z.strictObject({
    storage: StorageTypeSchema,
    days: z.number().int(),
});

export const ShelfLifeWireItemSchema = z.strictObject({
    id: z.string(),
    applicable: z.boolean(),
    normalizedName: z.string(),
    defaultStorage: StorageTypeSchema.nullable(),
    storageLives: z.array(StorageLifeWireSchema),
    packSize: z.number().nullable(),
    packUnit: z.enum(PACK_UNITS).nullable(),
    shelfLifeOpenedDays: z.number().int().nullable(),
    openSensitive: z.boolean(),
    confidence: z.enum(SHELF_LIFE_CONFIDENCES),
    note: z.string(),
    pluralName: z.string().nullable(),
});

export const ShelfLifeWireResponseSchema = z.strictObject({
    items: z.array(ShelfLifeWireItemSchema),
});

// ── Validated item (import rules) ───────────────────────────────────────

const daysInRange = (days: number) => days >= 1 && days <= MAX_SHELF_LIFE_DAYS;

export const ShelfLifeItemSchema = ShelfLifeWireItemSchema.superRefine((item, ctx) => {
    if (item.id.trim() === '') ctx.addIssue({ code: 'custom', message: 'id fehlt' });
    if (item.normalizedName.trim() === '') {
        ctx.addIssue({ code: 'custom', path: ['normalizedName'], message: 'leer' });
    }
    if (!item.applicable) return;

    if (item.defaultStorage == null) {
        ctx.addIssue({ code: 'custom', path: ['defaultStorage'], message: 'fehlt' });
    }
    const seen = new Set<StorageTypeValue>();
    item.storageLives.forEach((life, index) => {
        if (seen.has(life.storage)) {
            ctx.addIssue({
                code: 'custom',
                path: ['storageLives', index, 'storage'],
                message: `${life.storage} doppelt`,
            });
        }
        seen.add(life.storage);
        if (!daysInRange(life.days)) {
            ctx.addIssue({
                code: 'custom',
                path: ['storageLives', index, 'days'],
                message: `muss zwischen 1 und ${MAX_SHELF_LIFE_DAYS} liegen`,
            });
        }
    });
    if (item.defaultStorage != null && !seen.has(item.defaultStorage)) {
        ctx.addIssue({
            code: 'custom',
            path: ['storageLives'],
            message: `kein Eintrag für defaultStorage ${item.defaultStorage}`,
        });
    }
    if (item.packSize != null && !(item.packSize > 0)) {
        ctx.addIssue({ code: 'custom', path: ['packSize'], message: 'muss größer 0 sein' });
    }
    if ((item.packSize == null) !== (item.packUnit == null)) {
        ctx.addIssue({
            code: 'custom',
            path: ['packUnit'],
            message: 'packSize und packUnit nur gemeinsam',
        });
    }
    const opened = item.shelfLifeOpenedDays;
    if (opened != null && (opened < 0 || opened > MAX_SHELF_LIFE_DAYS)) {
        ctx.addIssue({
            code: 'custom',
            path: ['shelfLifeOpenedDays'],
            message: `muss zwischen 0 und ${MAX_SHELF_LIFE_DAYS} liegen`,
        });
    }
});

export type ShelfLifeItem = z.infer<typeof ShelfLifeWireItemSchema>;

// ── Admin form (manual values) ──────────────────────────────────────────

const optionalDays = (min: number) => z.number().int().min(min).max(MAX_SHELF_LIFE_DAYS).nullable();

export const IngredientShelfLifeInputSchema = z
    .strictObject({
        // Days per storage type; null = this storage type is not possible
        storageDays: z.strictObject({
            FRIDGE: optionalDays(1),
            PANTRY: optionalDays(1),
            FREEZER: optionalDays(1),
        }),
        defaultStorage: StorageTypeSchema.nullable(),
        openedShelfLifeDays: optionalDays(0),
        openSensitive: z.boolean(),
        packSize: z.number().positive().nullable(),
        packUnit: z.enum(PACK_UNITS).nullable(),
    })
    .superRefine((input, ctx) => {
        if (input.defaultStorage && input.storageDays[input.defaultStorage] == null) {
            ctx.addIssue({
                code: 'custom',
                path: ['defaultStorage'],
                message: 'Die übliche Lagerart braucht eine Haltbarkeit',
            });
        }
        if ((input.packSize == null) !== (input.packUnit == null)) {
            ctx.addIssue({
                code: 'custom',
                path: ['packUnit'],
                message: 'Packungsgröße und Einheit nur gemeinsam',
            });
        }
    });

export type IngredientShelfLifeInput = z.infer<typeof IngredientShelfLifeInputSchema>;

// ── Strict JSON schema for the OpenAI batch ─────────────────────────────

type JsonSchema = Record<string, unknown>;

const SAFE_INT_BOUND = Number.MAX_SAFE_INTEGER;

/**
 * Turns Zod's draft-7 output into the form OpenAI strict mode expects and the
 * prompt was tested with: `anyOf [T, null]` becomes `type: [T, "null"]` (with
 * `null` in the enum), Zod's implicit safe-integer bounds are dropped.
 */
function toStrictForm(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(toStrictForm);
    if (!node || typeof node !== 'object') return node;

    const source = { ...(node as JsonSchema) };
    delete source.$schema;
    if (source.minimum === -SAFE_INT_BOUND) delete source.minimum;
    if (source.maximum === SAFE_INT_BOUND) delete source.maximum;

    const anyOf = source.anyOf as JsonSchema[] | undefined;
    if (anyOf?.length === 2 && anyOf.some((option) => option.type === 'null')) {
        const inner = toStrictForm(anyOf.find((option) => option.type !== 'null')) as JsonSchema;
        const merged: JsonSchema = { ...inner, type: [inner.type, 'null'] };
        if (Array.isArray(inner.enum)) merged.enum = [...inner.enum, null];
        return merged;
    }

    return Object.fromEntries(
        Object.entries(source).map(([key, value]) => [key, toStrictForm(value)]),
    );
}

export function getShelfLifeJsonSchema(): JsonSchema {
    return toStrictForm(
        z.toJSONSchema(ShelfLifeWireResponseSchema, { target: 'draft-7' }),
    ) as JsonSchema;
}

/** `text.format` for the Responses API (also used inside batch request bodies). */
export function getShelfLifeResponseFormat() {
    return {
        type: 'json_schema' as const,
        name: 'shelf_life',
        strict: true,
        schema: getShelfLifeJsonSchema(),
    };
}

/** Input text for one request: the ingredients as compact JSON (as in the probe runs). */
export function buildShelfLifeInput(ingredients: Array<{ id: string; name: string }>): string {
    return `Zutaten (JSON):\n${JSON.stringify(ingredients.map(({ id, name }) => ({ id, name })))}`;
}
