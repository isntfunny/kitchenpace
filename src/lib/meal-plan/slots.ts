// Meal slots (KUC-98 / KUC-102). Fixed slots are the MealType values; custom
// slots have a key "c_<slug>". Configuration lives as JSON in
// Profile.mealPlanSlots (user default) and MealPlan.slotOverride (one week only).
import { z } from 'zod';

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;
export type MealTypeName = (typeof MEAL_TYPES)[number];

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const CUSTOM_SLOT_KEY = /^c_[a-z0-9-]{1,36}$/;

export const MEAL_TYPE_LABELS: Record<MealTypeName, string> = {
    BREAKFAST: 'Frühstück',
    LUNCH: 'Mittagessen',
    SNACK: 'Snack',
    DINNER: 'Abendessen',
};

export const timeSchema = z.string().regex(TIME_PATTERN, 'Uhrzeit im Format HH:MM');

export const slotKeySchema = z.union([z.enum(MEAL_TYPES), z.string().regex(CUSTOM_SLOT_KEY)]);
export type SlotKey = z.infer<typeof slotKeySchema>;

export const slotConfigSchema = z
    .object({
        key: slotKeySchema,
        /** Only custom slots carry a name; fixed slots use MEAL_TYPE_LABELS */
        name: z.string().trim().min(1).max(40).nullable().default(null),
        time: timeSchema,
        enabled: z.boolean(),
    })
    .refine((slot) => isFixedSlot(slot.key) || slot.name !== null, {
        message: 'Eigene Mahlzeiten brauchen einen Namen',
        path: ['name'],
    });
export type SlotConfig = z.infer<typeof slotConfigSchema>;

export const slotListSchema = z
    .array(slotConfigSchema)
    .max(12)
    .refine((slots) => new Set(slots.map((slot) => slot.key)).size === slots.length, {
        message: 'Jede Mahlzeit darf nur einmal vorkommen',
    });

/**
 * Defaults (assumption, KUC-102 mockups): breakfast, lunch and dinner on, snack off.
 */
export const DEFAULT_SLOTS: readonly SlotConfig[] = Object.freeze([
    { key: 'BREAKFAST', name: null, time: '07:30', enabled: true },
    { key: 'LUNCH', name: null, time: '12:30', enabled: true },
    { key: 'SNACK', name: null, time: '15:30', enabled: false },
    { key: 'DINNER', name: null, time: '19:00', enabled: true },
]);

/** Household size used for servings until the user sets one (assumption) */
export const DEFAULT_HOUSEHOLD_SIZE = 2;

export function isFixedSlot(key: string): key is MealTypeName {
    return (MEAL_TYPES as readonly string[]).includes(key);
}

/** Converts a slot key into the two DB columns of MealPlanRecipe (exactly one is set). */
export function slotColumns(key: SlotKey): {
    mealType: MealTypeName | null;
    customMealType: string | null;
} {
    return isFixedSlot(key)
        ? { mealType: key, customMealType: null }
        : { mealType: null, customMealType: key };
}

export function slotKeyOf(entry: {
    mealType: string | null;
    customMealType: string | null;
}): SlotKey {
    const key = entry.mealType ?? entry.customMealType;
    if (!key) throw new Error('Meal plan entry without slot');
    return key as SlotKey;
}

/** Sorts slots by time; equal times keep the fixed order, custom slots last. */
export function sortSlots<T extends { key: string; time: string }>(slots: T[]): T[] {
    const rank = (key: string) => (isFixedSlot(key) ? MEAL_TYPES.indexOf(key) : MEAL_TYPES.length);
    return [...slots].sort(
        (a, b) =>
            a.time.localeCompare(b.time) || rank(a.key) - rank(b.key) || a.key.localeCompare(b.key),
    );
}

/** Parses stored slot JSON; invalid or missing data falls back to the given defaults. */
export function parseSlots(value: unknown, fallback: readonly SlotConfig[] = DEFAULT_SLOTS) {
    const parsed = slotListSchema.safeParse(value);
    const slots = parsed.success ? parsed.data : fallback.map((slot) => ({ ...slot }));
    // Fixed slots are always present (possibly disabled) so their entries stay reachable
    for (const fixed of DEFAULT_SLOTS) {
        if (!slots.some((slot) => slot.key === fixed.key)) slots.push({ ...fixed, enabled: false });
    }
    return sortSlots(slots);
}

/** Effective slots of a week: week override, else user default, else defaults. */
export function resolveSlots(profileSlots: unknown, weekOverride?: unknown): SlotConfig[] {
    const base = parseSlots(profileSlots);
    return weekOverride == null ? base : parseSlots(weekOverride, base);
}

/**
 * Slots to render: enabled ones plus disabled ones that still hold entries —
 * disabling a slot only hides it and never loses data (KUC-102).
 */
export function visibleSlots(slots: SlotConfig[], usedKeys: Iterable<string>): SlotConfig[] {
    const used = new Set(usedKeys);
    return slots.filter((slot) => slot.enabled || used.has(slot.key));
}

export function slotLabel(slot: Pick<SlotConfig, 'key' | 'name'>): string {
    return isFixedSlot(slot.key) ? MEAL_TYPE_LABELS[slot.key] : (slot.name ?? 'Mahlzeit');
}

export function defaultTimeFor(slots: SlotConfig[], key: string): string | null {
    return slots.find((slot) => slot.key === key)?.time ?? null;
}

export function defaultServings(householdSize: number | null | undefined): number {
    return householdSize ?? DEFAULT_HOUSEHOLD_SIZE;
}

/** Builds a key for a new custom slot from its name, unique among `existing`. */
export function customSlotKey(name: string, existing: Iterable<string>): string {
    const base =
        name
            .toLowerCase()
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .normalize('NFKD')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 30) || 'mahlzeit';
    const taken = new Set(existing);
    let key = `c_${base}`;
    for (let n = 2; taken.has(key); n++) key = `c_${base}-${n}`;
    return key;
}
