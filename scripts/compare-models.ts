/**
 * Model comparison script: gpt-5.4 vs gpt-5.4-mini
 *
 * Scrapes 5 Chefkoch recipes, runs each through both models,
 * and compares quality, tokens, cost, and flow graph structure.
 *
 * Usage: npx tsx scripts/compare-models.ts
 */

import { importRecipeFromMarkdown } from '../src/lib/importer/openai-client';
import type { ImportedRecipe } from '../src/lib/importer/openai-recipe-schema';
import { scrapeRecipe } from '../src/lib/importer/scraper';
import type { RecipeParseResult } from '../src/lib/importer/types';

// ─── Config ──────────────────────────────────────────────────────────────────

const MODELS = ['gpt-5.4', 'gpt-5.4-mini'] as const;

// 3 recipes: einfach, mittel, komplex
const TEST_URLS = [
    'https://www.chefkoch.de/rezepte/1107291216818673/Schneller-Flammkuchen.html',
    'https://www.chefkoch.de/rezepte/1167071222777296/Chili-con-Carne.html',
    'https://www.chefkoch.de/rezepte/1226541227866510/Lammhack-Spiesse-mit-orientalischem-Kuerbisgemuese.html',
];

// ─── Pricing ─────────────────────────────────────────────────────────────────

// gpt-5.4 pricing (from openai-client.ts)
const PRICING: Record<string, { input: number; cached: number; output: number }> = {
    'gpt-5.4': { input: 2.5, cached: 0.25, output: 15.0 },
    'gpt-5.4-mini': { input: 0.75, cached: 0.075, output: 4.5 },
};

function computeCost(
    model: string,
    inputTokens: number,
    cachedTokens: number,
    outputTokens: number,
): number {
    const p = PRICING[model] ?? PRICING['gpt-5.4'];
    const uncached = inputTokens - cachedTokens;
    return (uncached * p.input + cachedTokens * p.cached + outputTokens * p.output) / 1_000_000;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RunResult {
    model: string;
    url: string;
    recipeName: string;
    success: boolean;
    error?: string;
    durationMs: number;
    inputTokens: number;
    cachedTokens: number;
    outputTokens: number;
    costUsd: number;
    ingredientCount: number;
    nodeCount: number;
    edgeCount: number;
    branchCount: number;
    laneIds: string[];
    stepTypes: Record<string, number>;
    difficulty: string;
    categories: string[];
    tagCount: number;
    tags: string[];
    raw?: ImportedRecipe;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countBranches(recipe: ImportedRecipe): number {
    const startNode = recipe.flowNodes.find((n) => n.type === 'start');
    if (!startNode) return 0;
    return recipe.flowEdges.filter((e) => e.source === startNode.id).length;
}

function countStepTypes(recipe: ImportedRecipe): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const node of recipe.flowNodes) {
        counts[node.type] = (counts[node.type] ?? 0) + 1;
    }
    return counts;
}

async function runModel(model: string, markdown: string, sourceUrl: string): Promise<RunResult> {
    const start = Date.now();

    let result: RecipeParseResult;
    try {
        result = await importRecipeFromMarkdown(markdown, sourceUrl, {
            model,
            temperature: 0.1,
        });
    } catch (err) {
        return {
            model,
            url: sourceUrl,
            recipeName: '(error)',
            success: false,
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - start,
            inputTokens: 0,
            cachedTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            ingredientCount: 0,
            nodeCount: 0,
            edgeCount: 0,
            branchCount: 0,
            laneIds: [],
            stepTypes: {},
            difficulty: '',
            categories: [],
            tagCount: 0,
            tags: [],
        };
    }

    const durationMs = Date.now() - start;

    if (!result.success) {
        const details = (result.error as any).details;
        const detailStr = details ? '\n' + JSON.stringify(details, null, 2) : '';
        return {
            model,
            url: sourceUrl,
            recipeName: '(failed)',
            success: false,
            error: `${result.error.type}: ${result.error.message}${detailStr}`,
            durationMs,
            inputTokens: 0,
            cachedTokens: 0,
            outputTokens: 0,
            costUsd: 0,
            ingredientCount: 0,
            nodeCount: 0,
            edgeCount: 0,
            branchCount: 0,
            laneIds: [],
            stepTypes: {},
            difficulty: '',
            categories: [],
            tagCount: 0,
            tags: [],
        };
    }

    const { data, metadata } = result;
    const inputTokens = metadata.inputTokens ?? 0;
    const cachedTokens = metadata.cachedInputTokens ?? 0;
    const outputTokens = metadata.outputTokens ?? 0;

    return {
        model,
        url: sourceUrl,
        recipeName: data.title,
        success: true,
        durationMs,
        inputTokens,
        cachedTokens,
        outputTokens,
        costUsd: computeCost(model, inputTokens, cachedTokens, outputTokens),
        ingredientCount: data.ingredients.length,
        nodeCount: data.flowNodes.length,
        edgeCount: data.flowEdges.length,
        branchCount: countBranches(data),
        laneIds: [...new Set(data.flowNodes.map((n) => n.laneId))],
        stepTypes: countStepTypes(data),
        difficulty: data.difficulty,
        categories: data.categories,
        tagCount: data.tags.length,
        tags: data.tags,
        raw: data,
    };
}

// ─── Display ─────────────────────────────────────────────────────────────────

function _pad(s: string, n: number): string {
    return s.padEnd(n);
}

function _rpad(s: string, n: number): string {
    return s.padStart(n);
}

function printSingleResult(r: RunResult): void {
    const sep = '─'.repeat(70);
    console.log(sep);
    console.log(`  Recipe: ${r.recipeName}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Model: ${r.model}`);
    console.log(sep);

    if (!r.success) {
        console.log(`  ERROR: ${r.error}\n`);
        return;
    }

    console.log(`  Status:       OK`);
    console.log(`  Duration:     ${r.durationMs}ms`);
    console.log(
        `  Tokens:       ${r.inputTokens} in (${r.cachedTokens} cached) → ${r.outputTokens} out`,
    );
    console.log(`  Cost:         $${r.costUsd.toFixed(4)}`);
    console.log(`  Ingredients:  ${r.ingredientCount}`);
    console.log(
        `  Flow:         ${r.nodeCount} nodes, ${r.edgeCount} edges, ${r.branchCount} branches`,
    );
    console.log(`  Difficulty:   ${r.difficulty}`);
    console.log(`  Categories:   ${r.categories.join(', ')}`);
    console.log(`  Tags (${r.tagCount}):`);
    // Group tags into lines of ~70 chars
    let line = '    ';
    for (const tag of r.tags) {
        if (line.length + tag.length + 2 > 72) {
            console.log(line);
            line = '    ';
        }
        line += (line.length > 4 ? ', ' : '') + tag;
    }
    if (line.length > 4) console.log(line);
    console.log('');
}

function printSummary(results: RunResult[]): void {
    console.log('\n' + '═'.repeat(70));
    console.log('  ZUSAMMENFASSUNG');
    console.log('═'.repeat(70));

    for (const model of MODELS) {
        const runs = results.filter((r) => r.model === model);
        const successes = runs.filter((r) => r.success);
        const totalCost = runs.reduce((sum, r) => sum + r.costUsd, 0);
        const avgDuration =
            runs.length > 0 ? runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length : 0;
        const avgNodes =
            successes.length > 0
                ? successes.reduce((sum, r) => sum + r.nodeCount, 0) / successes.length
                : 0;
        const avgBranches =
            successes.length > 0
                ? successes.reduce((sum, r) => sum + r.branchCount, 0) / successes.length
                : 0;
        const totalOutput = runs.reduce((sum, r) => sum + r.outputTokens, 0);

        console.log(`\n  ${model}:`);
        console.log(`    Erfolgsrate:     ${successes.length}/${runs.length}`);
        console.log(`    Gesamtkosten:    $${totalCost.toFixed(4)}`);
        console.log(`    Avg Duration:    ${Math.round(avgDuration)}ms`);
        console.log(`    Avg Nodes:       ${avgNodes.toFixed(1)}`);
        console.log(`    Avg Branches:    ${avgBranches.toFixed(1)}`);
        console.log(`    Total Output:    ${totalOutput} tokens`);
    }

    // Cost savings
    const costFull = results
        .filter((r) => r.model === 'gpt-5.4')
        .reduce((s, r) => s + r.costUsd, 0);
    const costMini = results
        .filter((r) => r.model === 'gpt-5.4-mini')
        .reduce((s, r) => s + r.costUsd, 0);
    if (costFull > 0) {
        console.log(
            `\n  Kostenersparnis mit mini: ${((1 - costMini / costFull) * 100).toFixed(1)}%`,
        );
        console.log(
            `  (${MODELS[0]}: $${costFull.toFixed(4)} → ${MODELS[1]}: $${costMini.toFixed(4)})`,
        );
    }

    console.log('\n' + '═'.repeat(70));
}

// ─── Ingredient comparison ───────────────────────────────────────────────────

function _compareIngredients(a: RunResult, b: RunResult): void {
    if (!a.raw || !b.raw) return;

    const namesA = new Set(a.raw.ingredients.map((i) => i.name.toLowerCase()));
    const namesB = new Set(b.raw.ingredients.map((i) => i.name.toLowerCase()));

    const onlyA = [...namesA].filter((n) => !namesB.has(n));
    const onlyB = [...namesB].filter((n) => !namesA.has(n));

    if (onlyA.length > 0 || onlyB.length > 0) {
        console.log(`  Zutaten-Diff:`);
        if (onlyA.length) console.log(`    Nur ${a.model}: ${onlyA.join(', ')}`);
        if (onlyB.length) console.log(`    Nur ${b.model}: ${onlyB.join(', ')}`);
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('═'.repeat(70));
    console.log('  TAG QUALITY CHECK: gpt-5.4-mini');
    console.log('  KitchenPace Recipe Import Pipeline');
    console.log('═'.repeat(70));
    console.log(`\n  Scraping ${TEST_URLS.length} recipes...\n`);

    const allResults: RunResult[] = [];

    for (let i = 0; i < TEST_URLS.length; i++) {
        const url = TEST_URLS[i];
        console.log(`  [${i + 1}/${TEST_URLS.length}] Scraping: ${url}`);

        let markdown: string;
        try {
            const scraped = await scrapeRecipe(url);
            markdown = scraped.markdown;
            console.log(`    → ${markdown.length} chars markdown`);
        } catch (err) {
            console.error(`    → SCRAPE FAILED: ${err instanceof Error ? err.message : err}`);
            continue;
        }

        // Run each model
        for (const model of MODELS) {
            console.log(`    → Running ${model}...`);
            const result = await runModel(model, markdown, url);
            console.log(
                `      ${result.success ? 'OK' : 'FAIL'} in ${result.durationMs}ms (${result.outputTokens} output tokens)`,
            );
            console.log('');
            printSingleResult(result);
            allResults.push(result);
        }
    }

    if (allResults.length > 0) {
        printSummary(allResults);
    }

    // Write raw results to JSON for later analysis
    const outPath = 'scripts/compare-results.json';
    const { writeFile } = await import('fs/promises');
    await writeFile(
        outPath,
        JSON.stringify(
            allResults.map(({ raw: _raw, ...rest }) => rest),
            null,
            2,
        ),
    );
    console.log(`\n  Raw results saved to ${outPath}\n`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
