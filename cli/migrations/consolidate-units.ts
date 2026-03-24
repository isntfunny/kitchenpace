/**
 * Consolidate units: merge plural→singular, synonyms, and garbage units.
 *
 * Usage:
 *   npx infisical run -- npx tsx cli/migrations/consolidate-units.ts          # dry-run
 *   npx infisical run -- npx tsx cli/migrations/consolidate-units.ts --apply  # apply changes
 */

import { prisma } from '../../worker/queues/prisma';

// ── Mapping: source shortName → target shortName ────────────────────────────
// All RecipeIngredient + IngredientUnit rows using the source will be
// relinked to the target, then the source Unit row is deleted.

const UNIT_MERGE_MAP: Record<string, string> = {
    // Plural → Singular
    Zehen: 'Zehe',
    Scheiben: 'Scheibe',
    Gläser: 'Glas',
    Flaschen: 'Flasche',
    Stangen: 'Stange',
    Blätter: 'Blatt',
    Portionen: 'Portion',

    // Synonyme / Duplikate
    'Pck.': 'Päckchen',
    'Pkt.': 'Päckchen',
    'Kleine Flasche': 'Flasche',

    // Garbage → nächstbeste sinnvolle Einheit
    // Cm bleibt — wird vom Chefkoch-Import verwendet (z.B. "3 Cm Ingwer")
    'Halbe Dose': 'Dose',
    Zitrone: 'Stk',
    Kästchen: 'Stk',
    Topf: 'Stk',
};

const dryRun = !process.argv.includes('--apply');

async function main() {
    if (dryRun) {
        console.log('🔍 DRY RUN — keine Änderungen werden geschrieben.\n');
    } else {
        console.log('⚡ APPLY MODE — Änderungen werden in die Datenbank geschrieben!\n');
    }

    // Load all units
    const allUnits = await prisma.unit.findMany({ select: { id: true, shortName: true } });
    const unitByShortName = new Map(allUnits.map((u) => [u.shortName, u.id]));

    let totalRecipeIngredients = 0;
    let totalIngredientUnits = 0;
    let unitsDeleted = 0;

    for (const [sourceShort, targetShort] of Object.entries(UNIT_MERGE_MAP)) {
        const sourceId = unitByShortName.get(sourceShort);
        const targetId = unitByShortName.get(targetShort);

        if (!sourceId) {
            console.log(`  SKIP: "${sourceShort}" existiert nicht in der DB`);
            continue;
        }
        if (!targetId) {
            console.log(`  SKIP: Ziel "${targetShort}" existiert nicht in der DB`);
            continue;
        }

        // Count affected rows
        const riCount = await prisma.recipeIngredient.count({
            where: { unitId: sourceId },
        });
        const iuCount = await prisma.ingredientUnit.count({
            where: { unitId: sourceId },
        });

        console.log(
            `  ${sourceShort} → ${targetShort}: ${riCount} RecipeIngredients, ${iuCount} IngredientUnits`,
        );

        if (!dryRun && (riCount > 0 || iuCount > 0)) {
            await prisma.$transaction(async (tx) => {
                // 1. RecipeIngredient: relink to target
                if (riCount > 0) {
                    await tx.recipeIngredient.updateMany({
                        where: { unitId: sourceId },
                        data: { unitId: targetId },
                    });
                }

                // 2. IngredientUnit: delete source rows (target may already exist → skip duplicates)
                if (iuCount > 0) {
                    // Find which ingredients already have the target unit linked
                    const sourceLinks = await tx.ingredientUnit.findMany({
                        where: { unitId: sourceId },
                        select: { ingredientId: true, grams: true },
                    });
                    const existingTargetLinks = new Set(
                        (
                            await tx.ingredientUnit.findMany({
                                where: {
                                    unitId: targetId,
                                    ingredientId: { in: sourceLinks.map((l) => l.ingredientId) },
                                },
                                select: { ingredientId: true },
                            })
                        ).map((l) => l.ingredientId),
                    );

                    // Delete all source links first
                    await tx.ingredientUnit.deleteMany({ where: { unitId: sourceId } });

                    // Create target links for ingredients that didn't already have it
                    const newLinks = sourceLinks
                        .filter((l) => !existingTargetLinks.has(l.ingredientId))
                        .map((l) => ({
                            ingredientId: l.ingredientId,
                            unitId: targetId,
                            grams: l.grams,
                        }));

                    if (newLinks.length > 0) {
                        await tx.ingredientUnit.createMany({
                            data: newLinks,
                            skipDuplicates: true,
                        });
                    }
                }

                // 3. Delete the source unit
                await tx.unit.delete({ where: { id: sourceId } });
            });
        }

        totalRecipeIngredients += riCount;
        totalIngredientUnits += iuCount;
        unitsDeleted++;
    }

    console.log(`\n--- Zusammenfassung ---`);
    console.log(`Units zusammengeführt: ${unitsDeleted}`);
    console.log(`RecipeIngredients umgelinkt: ${totalRecipeIngredients}`);
    console.log(`IngredientUnits umgelinkt: ${totalIngredientUnits}`);

    if (dryRun) {
        console.log('\n→ Führe mit --apply aus um die Änderungen zu schreiben.');
    }

    // Show remaining units that have 0 usage and could be deleted
    console.log('\n--- Units ohne Verwendung (Kandidaten zum Löschen) ---');
    const unusedUnits = await prisma.unit.findMany({
        where: {
            recipeIngredients: { none: {} },
            ingredients: { none: {} },
        },
        select: { shortName: true, longName: true },
        orderBy: { shortName: 'asc' },
    });

    if (unusedUnits.length === 0) {
        console.log('  Keine.');
    } else {
        for (const u of unusedUnits) {
            console.log(`  - ${u.shortName} (${u.longName})`);
        }
    }

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
