import { createHash } from 'node:crypto';

import { z } from 'zod';

import { repairIngredientMentions } from './recipe-mentions';

const nodeSchema = z
    .object({
        id: z.string(),
        description: z.string().optional(),
        ingredientIds: z.array(z.string()).optional(),
    })
    .passthrough();
export const migrationIngredientSchema = z.object({
    id: z.string().min(1),
    sourceId: z.string().nullable().default(null),
    ingredientId: z.string().min(1),
    unitId: z.string().min(1),
    name: z.string().min(1),
    aliases: z.array(z.string()).default([]),
    amount: z.string(),
    unit: z.string(),
    notes: z.string().nullable(),
    position: z.number().int().nonnegative(),
    isOptional: z.boolean(),
});
export const snapshotSchema = z.object({
    id: z.string(),
    slug: z.string(),
    updatedAt: z.string().datetime(),
    flowNodes: z.array(nodeSchema),
    ingredients: z.array(migrationIngredientSchema),
});
export type RecipeMentionSnapshot = z.infer<typeof snapshotSchema>;
export type RecipeMentionSnapshotInput = z.input<typeof snapshotSchema>;
export const decisionsSchema = z.object({
    sourceIds: z.record(z.string(), z.string()).default({}),
    restoreRows: z.array(migrationIngredientSchema).default([]),
});
export type RepairDecisions = z.input<typeof decisionsSchema>;

export function planRecipeRepair(input: RecipeMentionSnapshotInput, decisions?: RepairDecisions) {
    const snapshot = snapshotSchema.parse(input);
    const { sourceIds, restoreRows } = decisionsSchema.parse(decisions ?? {});
    const ingredients = [...snapshot.ingredients, ...restoreRows];
    if (new Set(ingredients.map((row) => row.id)).size !== ingredients.length)
        throw new Error('Duplicate recipe ingredient row ID');
    for (const target of Object.values(sourceIds)) {
        if (!ingredients.some((row) => row.id === target))
            throw new Error(`Decision targets missing ingredient ${target}`);
    }
    const repair = repairIngredientMentions(
        snapshot.flowNodes,
        ingredients,
        new Map(Object.entries(sourceIds)),
    );
    const after = { ...snapshot, flowNodes: repair.nodes, ingredients };
    return {
        before: snapshot,
        after,
        issues: repair.issues,
        changed: snapshotFingerprint(snapshot) !== snapshotFingerprint(after),
    };
}

function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, val]) => [key, canonical(val)]),
        );
    return value;
}

export function snapshotFingerprint(input: RecipeMentionSnapshotInput): string {
    const snapshot = snapshotSchema.parse(input);
    return createHash('sha256')
        .update(
            JSON.stringify(
                canonical({
                    ...snapshot,
                    ingredients: [...snapshot.ingredients].sort((a, b) => a.id.localeCompare(b.id)),
                }),
            ),
        )
        .digest('hex');
}

export function assertSnapshotMatches(
    expected: RecipeMentionSnapshotInput,
    actual: RecipeMentionSnapshotInput,
) {
    if (snapshotFingerprint(expected) !== snapshotFingerprint(actual))
        throw new Error(
            `Recipe ${expected.id} changed since the snapshot; refusing to overwrite it`,
        );
}

/** Historical completion data is review evidence only: indexes are not current row positions. */
export function extractImportEvidence(response: unknown) {
    const completion = z
        .object({
            choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })),
        })
        .safeParse(response);
    const content = completion.success ? completion.data.choices[0]?.message.content : undefined;
    if (!content) return undefined;
    try {
        const parsed = z
            .object({
                ingredients: z.array(
                    z.object({
                        name: z.string(),
                        amount: z.union([z.string(), z.number()]).nullable().optional(),
                        unit: z.string().nullable().optional(),
                        notes: z.string().nullable().optional(),
                    }),
                ),
            })
            .safeParse(JSON.parse(content));
        if (!parsed.success) return undefined;
        return parsed.data.ingredients.map((ing, i) => ({
            sourceId: `imported_${i}`,
            name: ing.name,
            amount: ing.amount == null ? '' : String(ing.amount),
            unit: ing.unit ?? '',
            notes: ing.notes ?? null,
        }));
    } catch {
        return undefined;
    }
}
