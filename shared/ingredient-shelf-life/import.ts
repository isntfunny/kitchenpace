// Writes AI shelf-life results (KUC-94, KUC-114) into the database. Used by the
// CLI (scripts/import-ingredient-shelf-life.ts) and the batch worker job.
// Dry run is the default; only `write: true` changes data.

import type { Prisma, PrismaClient } from '@prisma/client';

import { planShelfLifeUpdate, type IngredientShelfLifeState, type ShelfLifePlan } from './plan';
import { ShelfLifeItemSchema, type ShelfLifeItem } from './schema';

export interface ShelfLifeImportReport {
    write: boolean;
    total: number;
    invalid: Array<{ index: number; id: string | null; errors: string[] }>;
    duplicateIds: string[];
    notFound: string[];
    unchanged: number;
    updated: number;
    /** shelfLifeSource MANUAL: shelf-life fields left alone */
    manualKept: string[];
    notApplicable: number;
    lowConfidence: string[];
    failed: Array<{ id: string; error: string }>;
    changes: Array<{ id: string; name: string; fields: string[] }>;
    /** Not yet assessed ingredients that got no valid entry in this file */
    withoutResult: {
        usedInRecipes: Array<{ id: string; name: string; recipes: number }>;
        unusedCount: number;
    };
}

export interface ValidatedItems {
    items: ShelfLifeItem[];
    invalid: ShelfLifeImportReport['invalid'];
    duplicateIds: string[];
}

/** Accepts the result file format: a plain array of items or `{ items: [...] }`. */
export function extractRawItems(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
        return (data as { items: unknown[] }).items;
    }
    throw new Error('Unbekanntes Format: erwartet ein Array oder { items: [...] }');
}

/** Validates every entry; invalid entries and repeated ids are reported and skipped. */
export function validateShelfLifeItems(rawItems: unknown[]): ValidatedItems {
    const items: ShelfLifeItem[] = [];
    const invalid: ShelfLifeImportReport['invalid'] = [];
    const duplicateIds: string[] = [];
    const seen = new Set<string>();

    rawItems.forEach((raw, index) => {
        const parsed = ShelfLifeItemSchema.safeParse(raw);
        if (!parsed.success) {
            const id =
                raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string'
                    ? (raw as { id: string }).id
                    : null;
            invalid.push({
                index,
                id,
                errors: parsed.error.issues.map(
                    (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
                ),
            });
            return;
        }
        if (seen.has(parsed.data.id)) {
            duplicateIds.push(parsed.data.id);
            return;
        }
        seen.add(parsed.data.id);
        items.push(parsed.data);
    });

    return { items, invalid, duplicateIds };
}

const STATE_SELECT = {
    id: true,
    name: true,
    pluralName: true,
    normalizedName: true,
    normalizedNameManual: true,
    needsReview: true,
    defaultStorage: true,
    openedShelfLifeDays: true,
    openSensitive: true,
    packSize: true,
    packUnit: true,
    shelfLifeSource: true,
    shelfLifeConfidence: true,
    storageLives: { select: { storage: true, days: true } },
} satisfies Prisma.IngredientSelect;

type Db = PrismaClient | Prisma.TransactionClient;

async function loadStates(db: Db, ids: string[]): Promise<Map<string, IngredientShelfLifeState>> {
    const rows = await db.ingredient.findMany({ where: { id: { in: ids } }, select: STATE_SELECT });
    return new Map(rows.map((row) => [row.id, row]));
}

async function applyPlan(tx: Prisma.TransactionClient, plan: ShelfLifePlan) {
    if (Object.keys(plan.changes).length > 0) {
        await tx.ingredient.update({ where: { id: plan.ingredientId }, data: plan.changes });
    }
    if (plan.storageLives) {
        await tx.ingredientStorageLife.deleteMany({
            where: {
                ingredientId: plan.ingredientId,
                storage: { notIn: plan.storageLives.map((life) => life.storage) },
            },
        });
        for (const life of plan.storageLives) {
            await tx.ingredientStorageLife.upsert({
                where: {
                    ingredientId_storage: {
                        ingredientId: plan.ingredientId,
                        storage: life.storage,
                    },
                },
                create: { ingredientId: plan.ingredientId, storage: life.storage, days: life.days },
                update: { days: life.days },
            });
        }
    }
}

const describeFields = (plan: ShelfLifePlan) => [
    ...Object.keys(plan.changes),
    ...(plan.storageLives ? ['storageLives'] : []),
];

/**
 * Plans (and with `write: true` applies) the given raw result entries.
 * Each ingredient is written in its own transaction; the plan is recomputed
 * inside it, so a re-run or a concurrent manual edit is respected.
 */
export async function importShelfLifeResults(
    prisma: PrismaClient,
    rawItems: unknown[],
    options: { write?: boolean; chunkSize?: number } = {},
): Promise<ShelfLifeImportReport> {
    const write = options.write === true;
    const chunkSize = options.chunkSize ?? 200;
    const { items, invalid, duplicateIds } = validateShelfLifeItems(rawItems);

    const report: ShelfLifeImportReport = {
        write,
        total: rawItems.length,
        invalid,
        duplicateIds,
        notFound: [],
        unchanged: 0,
        updated: 0,
        manualKept: [],
        notApplicable: 0,
        lowConfidence: [],
        failed: [],
        changes: [],
        withoutResult: { usedInRecipes: [], unusedCount: 0 },
    };

    for (let offset = 0; offset < items.length; offset += chunkSize) {
        const chunk = items.slice(offset, offset + chunkSize);
        const states = await loadStates(
            prisma,
            chunk.map((item) => item.id),
        );

        for (const item of chunk) {
            const state = states.get(item.id);
            if (!state) {
                report.notFound.push(item.id);
                continue;
            }

            let plan = planShelfLifeUpdate(state, item);
            if (write && plan.changed) {
                try {
                    plan = await prisma.$transaction(async (tx) => {
                        const fresh = (await loadStates(tx, [item.id])).get(item.id);
                        if (!fresh) throw new Error('Zutat während des Imports gelöscht');
                        const freshPlan = planShelfLifeUpdate(fresh, item);
                        await applyPlan(tx, freshPlan);
                        return freshPlan;
                    });
                } catch (error) {
                    report.failed.push({
                        id: item.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    continue;
                }
            }

            if (plan.manualShelfLifeKept) report.manualKept.push(item.id);
            if (!plan.manualShelfLifeKept && !item.applicable) report.notApplicable += 1;
            if (!plan.manualShelfLifeKept && item.confidence === 'LOW') {
                report.lowConfidence.push(item.id);
            }
            if (plan.changed) {
                report.updated += 1;
                report.changes.push({
                    id: item.id,
                    name: state.name,
                    fields: describeFields(plan),
                });
            } else {
                report.unchanged += 1;
            }
        }
    }

    report.withoutResult = await findWithoutResult(
        prisma,
        items.map((item) => item.id),
    );
    return report;
}

/** Ingredients without shelfLifeSource that this file does not cover (e.g. a mangled id). */
async function findWithoutResult(
    prisma: PrismaClient,
    coveredIds: string[],
): Promise<ShelfLifeImportReport['withoutResult']> {
    const rows = await prisma.ingredient.findMany({
        where: { shelfLifeSource: null, id: { notIn: coveredIds } },
        select: { id: true, name: true, _count: { select: { recipes: true } } },
        orderBy: { name: 'asc' },
    });
    const used = rows.filter((row) => row._count.recipes > 0);
    return {
        usedInRecipes: used.map((row) => ({
            id: row.id,
            name: row.name,
            recipes: row._count.recipes,
        })),
        unusedCount: rows.length - used.length,
    };
}

export function formatShelfLifeReport(report: ShelfLifeImportReport): string {
    const verb = report.write ? 'geändert' : 'würden geändert';
    const lines = [
        report.write ? 'Import (schreibend)' : 'Trockenlauf (nichts geschrieben)',
        `Einträge: ${report.total}`,
        `${verb}: ${report.updated}, unverändert: ${report.unchanged}`,
        `ungültig: ${report.invalid.length}, doppelt: ${report.duplicateIds.length}, Zutat fehlt: ${report.notFound.length}`,
        `manuell gepflegt (Haltbarkeit behalten): ${report.manualKept.length}`,
        `nicht zutreffend: ${report.notApplicable}, unsicher (needsReview): ${report.lowConfidence.length}`,
        `Fehler beim Schreiben: ${report.failed.length}`,
        `ohne Ergebnis: ${report.withoutResult.usedInRecipes.length} in Rezepten genutzt, ${report.withoutResult.unusedCount} ungenutzt`,
    ];
    if (report.notFound.length > 0) {
        lines.push(`  unbekannte IDs (übersprungen): ${report.notFound.join(', ')}`);
    }
    for (const entry of report.withoutResult.usedInRecipes.slice(0, 50)) {
        lines.push(`  ohne Ergebnis: ${entry.name} (${entry.id}, ${entry.recipes} Rezepte)`);
    }
    for (const entry of report.invalid.slice(0, 20)) {
        lines.push(`  ungültig #${entry.index} ${entry.id ?? '?'}: ${entry.errors.join('; ')}`);
    }
    for (const entry of report.failed.slice(0, 20)) {
        lines.push(`  Fehler ${entry.id}: ${entry.error}`);
    }
    return lines.join('\n');
}
