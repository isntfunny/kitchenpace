/**
 * CLI command: kitchen import <user-email> <url...>
 *
 * Single URL:    kitchen import user@example.com https://chefkoch.de/...
 * Multiple URLs: kitchen import user@example.com url1 url2 url3
 * From file:     kitchen import user@example.com -f urls.txt
 *
 * Scrapes each URL, analyzes with AI, shows interactive ingredient review
 * (scroll with arrows, toggle with space, confirm with enter), saves as DRAFT.
 */

import { readFileSync } from 'fs';

import { confirm, search, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';

import { type IngredientMatch, matchIngredients } from '@app/components/recipe/ingredientActions';
import { analyzeWithAI, saveImportedRecipe } from '@app/lib/importer/pipeline';
import { checkScraplerHealth, scrapeRecipe } from '@app/lib/importer/scraper';
import type { AnalyzedIngredient, AnalyzedRecipe } from '@app/lib/importer/transform';

import { db } from '../lib/db.js';

export function registerImportCommand(program: Command): void {
    program
        .command('import')
        .description('Import recipe(s) from URL(s) via AI analysis')
        .argument('<email>', 'Author email address')
        .argument('[urls...]', 'Recipe URL(s) to scrape and import')
        .option('-f, --from-file <file>', 'Import URLs from a text file (one URL per line)')
        .option('-p, --publish', 'Publish recipe immediately after saving')
        .action(
            async (
                email: string,
                urls: string[],
                options: { fromFile?: string; publish?: boolean },
            ) => {
                // Collect all URLs from arguments + file
                const allUrls = [...urls];

                if (options.fromFile) {
                    try {
                        const content = readFileSync(options.fromFile, 'utf-8');
                        const fileUrls = content
                            .split('\n')
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0 && !line.startsWith('#'));
                        allUrls.push(...fileUrls);
                    } catch (err) {
                        console.error(
                            chalk.red(
                                `Cannot read file: ${options.fromFile} — ${err instanceof Error ? err.message : String(err)}`,
                            ),
                        );
                        process.exit(1);
                    }
                }

                if (allUrls.length === 0) {
                    console.error(
                        chalk.red('No URLs provided. Pass URLs as arguments or use -f <file>.'),
                    );
                    process.exit(1);
                }

                await db.$connect();

                try {
                    // Resolve user once
                    const user = await resolveUser(email);

                    // Health check once
                    const healthSpinner = ora('Checking scraper service...').start();
                    const healthy = await checkScraplerHealth();
                    if (!healthy) {
                        healthSpinner.fail('Scrapling service is not reachable');
                        console.error(
                            chalk.yellow(
                                'Make sure the scraper is running (SCRAPLER_URL env or docker-compose)',
                            ),
                        );
                        process.exit(1);
                    }
                    healthSpinner.succeed('Scraper service is up');

                    const publish = options.publish ?? false;
                    if (allUrls.length === 1) {
                        // Single import — full interactive flow
                        await importOne(user, allUrls[0], publish);
                    } else {
                        // Batch import
                        await importBatch(user, allUrls, publish);
                    }
                } finally {
                    await db.$disconnect();
                }
            },
        );
}

// ─────────────────────────────────────────────────────────────────────────────
// User resolution
// ─────────────────────────────────────────────────────────────────────────────

interface ResolvedUser {
    id: string;
    email: string;
    nickname: string;
}

async function resolveUser(email: string): Promise<ResolvedUser> {
    const user = await db.user.findUnique({
        where: { email },
        include: { profile: true },
    });

    if (!user) {
        console.error(chalk.red(`User not found: ${email}`));
        process.exit(1);
    }

    if (!user.emailVerified) {
        console.error(chalk.red(`User ${email} is not verified`));
        process.exit(1);
    }

    const nickname = user.profile?.nickname ?? email;
    console.log(chalk.dim(`Author: ${nickname} (${user.id})`));

    return { id: user.id, email, nickname };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single import (interactive)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified ingredient review: single select loop to toggle (on/off), replace (DB search), or confirm.
 * Returns the final ingredient list, or null if all deselected.
 */
async function reviewIngredients(
    ingredients: AnalyzedIngredient[],
): Promise<AnalyzedIngredient[] | null> {
    const matches = await matchIngredientsWithSpinner(ingredients);

    const ings = [...ingredients];
    const mats = [...matches];
    const enabled = new Set(ings.map((_, i) => i));

    while (true) {
        const count = enabled.size;
        const choices = ings.map((ing, idx) => {
            const on = enabled.has(idx);
            const prefix = on ? chalk.green('✓') : chalk.red('✗');
            const label = on
                ? formatIngredientWithMatch(ing, mats[idx])
                : chalk.strikethrough(chalk.dim(formatIngredientWithMatch(ing, mats[idx])));
            return { name: `${prefix} ${label}`, value: idx };
        });
        choices.push({
            name: chalk.bold.green(`\n  ⏎ Fertig (${count}/${ings.length} ausgewählt)`),
            value: -1,
        });

        const picked = await select<number>({
            message: 'Zutaten — auswählen zum Umschalten/Ersetzen',
            choices,
            loop: false,
            pageSize: 22,
        });

        if (picked === -1) break;

        // Sub-action for the picked ingredient
        const ing = ings[picked];
        const isOn = enabled.has(picked);
        const action = await select<'toggle' | 'replace' | 'back'>({
            message: `${ing.amount ? ing.amount + ' ' : ''}${ing.unit && ing.unit !== 'Stück' ? ing.unit + ' ' : ''}${ing.name}`,
            choices: [
                {
                    name: isOn ? chalk.red('✗ Abwählen') : chalk.green('✓ Auswählen'),
                    value: 'toggle' as const,
                },
                { name: '🔍 Ersetzen (DB-Suche)', value: 'replace' as const },
                { name: chalk.dim('↩ Zurück'), value: 'back' as const },
            ],
        });

        if (action === 'toggle') {
            if (isOn) enabled.delete(picked);
            else enabled.add(picked);
        } else if (action === 'replace') {
            const result = await searchIngredientPrompt(
                ing.name,
                ings.map((i) => i.name),
            );
            if (result) {
                const oldName = ing.name;
                ings[picked] = { ...ing, name: result.name };
                mats[picked] = { status: 'exact', matchedName: result.name, matchedId: result.id };
                console.log(
                    chalk.green(
                        `  ✓ ${oldName} → ${result.name} (${ing.amount || ''} ${ing.unit || ''} beibehalten)`,
                    ),
                );
            }
        }
    }

    if (enabled.size === 0) return null;

    return [...enabled].sort((a, b) => a - b).map((idx) => ings[idx]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core single-URL import — used by both single and batch paths
// ─────────────────────────────────────────────────────────────────────────────

interface ImportResult {
    url: string;
    status: 'ok' | 'skipped' | 'error';
    title?: string;
    slug?: string;
    error?: string;
}

async function importOne(user: ResolvedUser, url: string, publish: boolean): Promise<ImportResult> {
    // Duplicate check
    const dupe = await isAlreadyImported(url);
    if (dupe) {
        console.log(
            chalk.yellow(`Bereits importiert: "${dupe.title}" (${dupe.slug}) — übersprungen.`),
        );
        return { url, status: 'skipped', title: dupe.title, slug: dupe.slug };
    }

    // Scrape + AI
    const analyzed = await scrapeAndAnalyze(user, url);
    if (!analyzed) {
        return { url, status: 'error', error: 'Scrape/AI failed' };
    }

    printRecipeSummary(analyzed);

    // Interactive ingredient review + correction
    const selectedIngredients = await reviewIngredients(analyzed.ingredients);
    if (!selectedIngredients) {
        console.log(chalk.red('Keine Zutaten ausgewählt — übersprungen.'));
        return { url, status: 'skipped', title: analyzed.title };
    }

    // Confirm save
    const statusLabel = publish ? 'PUBLISHED' : 'DRAFT';
    const proceed = await confirm({
        message: `Rezept "${analyzed.title}" als ${statusLabel} speichern?`,
        default: true,
    });

    if (!proceed) {
        return { url, status: 'skipped', title: analyzed.title };
    }

    const saved = await saveRecipe(
        user,
        { ...analyzed, ingredients: selectedIngredients },
        publish,
    );
    if (saved) {
        return { url, status: 'ok', title: analyzed.title, slug: saved.slug };
    }
    return { url, status: 'error', title: analyzed.title, error: 'Save failed' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single + Batch wrappers
// ─────────────────────────────────────────────────────────────────────────────

async function importBatch(user: ResolvedUser, urls: string[], publish: boolean): Promise<void> {
    console.log(chalk.bold(`\nBatch import: ${urls.length} URLs\n`));

    const results: ImportResult[] = [];

    for (let i = 0; i < urls.length; i++) {
        console.log(chalk.bold(`\n[${i + 1}/${urls.length}] ${urls[i]}`));
        console.log(chalk.dim('─'.repeat(60)));

        try {
            results.push(await importOne(user, urls[i], publish));
        } catch {
            // Ctrl+C during interactive prompts
            console.log(chalk.yellow('\nBatch aborted by user.'));
            break;
        }
    }

    // Print summary
    console.log(chalk.bold(`\n${'─'.repeat(60)}`));
    console.log(chalk.bold(`Batch summary: ${results.length}/${urls.length} processed\n`));

    const ok = results.filter((r) => r.status === 'ok');
    const skipped = results.filter((r) => r.status === 'skipped');
    const errors = results.filter((r) => r.status === 'error');

    if (ok.length > 0) {
        console.log(chalk.green.bold(`  ${ok.length} imported:`));
        for (const r of ok) console.log(chalk.green(`    ${r.title} → ${r.slug}`));
    }
    if (skipped.length > 0) {
        console.log(chalk.yellow(`  ${skipped.length} skipped:`));
        for (const r of skipped) console.log(chalk.yellow(`    ${r.title ?? r.url}`));
    }
    if (errors.length > 0) {
        console.log(chalk.red(`  ${errors.length} failed:`));
        for (const r of errors) console.log(chalk.red(`    ${r.url} — ${r.error}`));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function isAlreadyImported(url: string): Promise<{ title: string; slug: string } | null> {
    const [byRecipe, byImportRun] = await Promise.all([
        db.recipe.findFirst({
            where: { sourceUrl: url },
            select: { title: true, slug: true },
        }),
        db.importRun.findFirst({
            where: { sourceUrl: url, status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            select: { recipeId: true, recipe: { select: { title: true, slug: true } } },
        }),
    ]);
    if (byRecipe) return byRecipe;
    if (byImportRun?.recipe) return byImportRun.recipe;
    // ImportRun exists but recipe was deleted or recipeId is null — still skip
    if (byImportRun) return { title: '(previously imported)', slug: '(deleted)' };
    return null;
}

async function scrapeAndAnalyze(user: ResolvedUser, url: string): Promise<AnalyzedRecipe | null> {
    // Scrape
    const scrapeSpinner = ora(`Scraping ${chalk.cyan(url)}...`).start();
    let scraped;
    try {
        scraped = await scrapeRecipe(url);
    } catch (err) {
        scrapeSpinner.fail('Scraping failed');
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        return null;
    }
    scrapeSpinner.succeed(
        `Scraped ${chalk.cyan(scraped.title ?? url)} (${scraped.markdown.length} chars)`,
    );

    // AI analysis
    const aiSpinner = ora('Analyzing recipe with AI...').start();
    let analyzed;
    try {
        analyzed = await analyzeWithAI(db, scraped.markdown, url, user.id);
    } catch (err) {
        aiSpinner.fail('AI analysis failed');
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        return null;
    }
    aiSpinner.succeed(`AI analysis complete: ${chalk.bold(analyzed.title)}`);

    return analyzed;
}

function printRecipeSummary(analyzed: AnalyzedRecipe): void {
    console.log();
    console.log(chalk.bold.underline(analyzed.title));
    if (analyzed.description) {
        console.log(chalk.dim(analyzed.description.slice(0, 120)));
    }
    console.log();

    const meta = [
        analyzed.servings && `${analyzed.servings} Portionen`,
        analyzed.prepTime && `Vorb. ${analyzed.prepTime} min`,
        analyzed.cookTime && `Koch ${analyzed.cookTime} min`,
        analyzed.difficulty,
    ]
        .filter(Boolean)
        .join('  |  ');
    if (meta) console.log(chalk.dim(meta));

    if (analyzed.tags?.length) {
        console.log(chalk.dim(`Tags: ${analyzed.tags.join(', ')}`));
    }

    console.log(
        chalk.dim(`Flow: ${analyzed.flowNodes.length} Knoten, ${analyzed.flowEdges.length} Kanten`),
    );
    console.log();
}

async function matchIngredientsWithSpinner(
    ingredients: AnalyzedIngredient[],
): Promise<IngredientMatch[]> {
    const spinner = ora('Matching ingredients against database...').start();
    const matches = await matchIngredients(ingredients.map((i) => i.name));
    const newCount = matches.filter((m) => m.status === 'new').length;
    const matchedCount = matches.filter((m) => m.status === 'stem').length;
    const parts = [`${ingredients.length - newCount} bekannt`];
    if (matchedCount > 0) parts.push(`${matchedCount} ähnlich`);
    if (newCount > 0) parts.push(`${newCount} neu`);
    spinner.succeed(`Zutaten abgeglichen: ${parts.join(', ')}`);
    return matches;
}

async function saveRecipe(
    user: ResolvedUser,
    data: AnalyzedRecipe,
    publish: boolean,
): Promise<{ id: string; slug: string } | null> {
    const statusLabel = publish ? 'PUBLISHED' : 'DRAFT';
    const saveSpinner = ora(`Saving recipe as ${statusLabel}...`).start();
    try {
        const result = await saveImportedRecipe(db, data, user.id, { publish });
        saveSpinner.succeed('Recipe saved');
        console.log(chalk.green.bold(`  Recipe created as ${statusLabel}`));
        console.log(`  ID:   ${result.id}`);
        console.log(`  Slug: ${result.slug}`);
        if (!publish) {
            console.log(chalk.dim(`  Use 'kitchen import ... --publish' to publish directly`));
        }
        return result;
    } catch (err) {
        saveSpinner.fail('Save failed');
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        return null;
    }
}

async function searchIngredientsInDb(
    query: string,
): Promise<{ id: string; name: string; slug: string }[]> {
    if (!query || query.length < 2) return [];
    return db.ingredient.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { pluralName: { contains: query, mode: 'insensitive' } },
                { aliases: { hasSome: [query.toLowerCase()] } },
            ],
        },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
        take: 15,
    });
}

async function searchIngredientPrompt(
    currentName: string,
    allIngredientNames: string[],
): Promise<{ id: string; name: string } | null> {
    return search<{ id: string; name: string } | null>({
        message: `Suche Zutat (ersetzt "${currentName}")`,
        source: async (term) => {
            if (!term || term.length < 2) {
                // Show recipe's own ingredients as quick-pick before typing
                const localResults = await Promise.all(
                    allIngredientNames
                        .filter((n) => n !== currentName)
                        .map(async (n) => {
                            const results = await searchIngredientsInDb(n);
                            const match = results.find(
                                (r) => r.name.toLowerCase() === n.toLowerCase(),
                            );
                            return { name: chalk.dim(n), value: { id: match?.id ?? '', name: n } };
                        }),
                );
                const local = localResults;
                return [
                    ...local,
                    {
                        name: chalk.dim('— Tippe 2+ Zeichen für DB-Suche —'),
                        value: null,
                        disabled: true,
                    },
                    { name: chalk.yellow('↩ Abbrechen'), value: null },
                ];
            }
            const results = await searchIngredientsInDb(term);
            if (results.length === 0) {
                return [
                    { name: chalk.dim('Keine Treffer'), value: null, disabled: true },
                    { name: chalk.yellow('↩ Abbrechen'), value: null },
                ];
            }
            return [
                ...results.map((r) => ({ name: r.name, value: { id: r.id, name: r.name } })),
                { name: chalk.yellow('↩ Abbrechen'), value: null },
            ];
        },
    });
}

function formatIngredientWithMatch(ing: AnalyzedIngredient, match: IngredientMatch): string {
    const parts: string[] = [];
    if (ing.amount) parts.push(chalk.bold(ing.amount));
    if (ing.unit && ing.unit !== 'Stück') parts.push(ing.unit);
    parts.push(ing.name);
    if (ing.notes) parts.push(chalk.dim(`(${ing.notes})`));

    if (match.status === 'stem' && match.matchedName) {
        parts.push(chalk.cyan(`→ ${match.matchedName}`));
    } else if (match.status === 'new') {
        parts.push(chalk.yellow('(NEU)'));
    }

    return parts.join(' ');
}
