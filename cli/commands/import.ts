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

import { checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';

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
        .action(async (email: string, urls: string[], options: { fromFile?: string }) => {
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
                console.error(chalk.red('No URLs provided. Pass URLs as arguments or use -f <file>.'));
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

                if (allUrls.length === 1) {
                    // Single import — full interactive flow
                    await importSingle(user, allUrls[0]);
                } else {
                    // Batch import
                    await importBatch(user, allUrls);
                }
            } finally {
                await db.$disconnect();
            }
        });
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

    if (!user.isActive) {
        console.error(chalk.red(`User ${email} is not active`));
        process.exit(1);
    }

    const nickname = user.profile?.nickname ?? email;
    console.log(chalk.dim(`Author: ${nickname} (${user.id})`));

    return { id: user.id, email, nickname };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single import (interactive)
// ─────────────────────────────────────────────────────────────────────────────

async function importSingle(user: ResolvedUser, url: string): Promise<void> {
    const analyzed = await scrapeAndAnalyze(user, url);
    if (!analyzed) return;

    printRecipeSummary(analyzed);

    // Interactive ingredient review
    console.log(chalk.yellow('Review ingredients — deselect with SPACE, confirm with ENTER:'));
    console.log();

    const selected = await checkbox<number>({
        message: 'Zutaten',
        loop: false,
        pageSize: 20,
        choices: analyzed.ingredients.map((ing, idx) => ({
            name: formatIngredient(ing),
            value: idx,
            checked: true,
        })),
    });

    if (selected.length === 0) {
        console.log(chalk.red('\nKeine Zutaten ausgewählt — Import abgebrochen.'));
        return;
    }

    const selectedIngredients = selected.map((idx) => analyzed.ingredients[idx]);
    console.log(
        chalk.green(
            `\n${selectedIngredients.length}/${analyzed.ingredients.length} Zutaten ausgewählt`,
        ),
    );

    const proceed = await confirm({
        message: `Rezept "${analyzed.title}" als DRAFT speichern?`,
        default: true,
    });

    if (!proceed) {
        console.log(chalk.yellow('Import abgebrochen.'));
        return;
    }

    await saveRecipe(user, { ...analyzed, ingredients: selectedIngredients });
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch import
// ─────────────────────────────────────────────────────────────────────────────

async function importBatch(user: ResolvedUser, urls: string[]): Promise<void> {
    console.log(chalk.bold(`\nBatch import: ${urls.length} URLs\n`));

    const results: { url: string; status: 'ok' | 'skipped' | 'error'; title?: string; slug?: string; error?: string }[] =
        [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(chalk.bold(`\n[${ i + 1}/${urls.length}] ${url}`));
        console.log(chalk.dim('─'.repeat(60)));

        const analyzed = await scrapeAndAnalyze(user, url);
        if (!analyzed) {
            results.push({ url, status: 'error', error: 'Scrape/AI failed' });
            continue;
        }

        printRecipeSummary(analyzed);

        // Interactive ingredient review per recipe
        console.log(chalk.yellow('Review ingredients — deselect with SPACE, confirm with ENTER:'));
        console.log();

        let selected: number[];
        try {
            selected = await checkbox<number>({
                message: 'Zutaten',
                loop: false,
                pageSize: 20,
                choices: analyzed.ingredients.map((ing, idx) => ({
                    name: formatIngredient(ing),
                    value: idx,
                    checked: true,
                })),
            });
        } catch {
            // User pressed Ctrl+C during checkbox — abort remaining
            console.log(chalk.yellow('\nBatch aborted by user.'));
            break;
        }

        if (selected.length === 0) {
            console.log(chalk.red('Keine Zutaten ausgewählt — übersprungen.'));
            results.push({ url, status: 'skipped', title: analyzed.title });
            continue;
        }

        const selectedIngredients = selected.map((idx) => analyzed.ingredients[idx]);
        console.log(
            chalk.green(
                `${selectedIngredients.length}/${analyzed.ingredients.length} Zutaten ausgewählt`,
            ),
        );

        let proceed: boolean;
        try {
            proceed = await confirm({
                message: `Rezept "${analyzed.title}" als DRAFT speichern?`,
                default: true,
            });
        } catch {
            console.log(chalk.yellow('\nBatch aborted by user.'));
            break;
        }

        if (!proceed) {
            results.push({ url, status: 'skipped', title: analyzed.title });
            continue;
        }

        const saved = await saveRecipe(user, { ...analyzed, ingredients: selectedIngredients });
        if (saved) {
            results.push({ url, status: 'ok', title: analyzed.title, slug: saved.slug });
        } else {
            results.push({ url, status: 'error', title: analyzed.title, error: 'Save failed' });
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
        for (const r of ok) {
            console.log(chalk.green(`    ${r.title} → ${r.slug}`));
        }
    }
    if (skipped.length > 0) {
        console.log(chalk.yellow(`  ${skipped.length} skipped:`));
        for (const r of skipped) {
            console.log(chalk.yellow(`    ${r.title ?? r.url}`));
        }
    }
    if (errors.length > 0) {
        console.log(chalk.red(`  ${errors.length} failed:`));
        for (const r of errors) {
            console.log(chalk.red(`    ${r.url} — ${r.error}`));
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeAndAnalyze(
    user: ResolvedUser,
    url: string,
): Promise<AnalyzedRecipe | null> {
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
        chalk.dim(
            `Flow: ${analyzed.flowNodes.length} Knoten, ${analyzed.flowEdges.length} Kanten`,
        ),
    );
    console.log();
}

async function saveRecipe(
    user: ResolvedUser,
    data: AnalyzedRecipe,
): Promise<{ id: string; slug: string } | null> {
    const saveSpinner = ora('Saving recipe as DRAFT...').start();
    try {
        const result = await saveImportedRecipe(db, data, user.id);
        saveSpinner.succeed('Recipe saved');
        console.log(chalk.green.bold(`  Recipe created as DRAFT`));
        console.log(`  ID:   ${result.id}`);
        console.log(`  Slug: ${result.slug}`);
        console.log(chalk.dim(`  Use 'kitchen recipe ${result.slug} --publish' to publish`));
        return result;
    } catch (err) {
        saveSpinner.fail('Save failed');
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        return null;
    }
}

function formatIngredient(ing: AnalyzedIngredient): string {
    const parts: string[] = [];
    if (ing.amount) parts.push(chalk.bold(ing.amount));
    if (ing.unit && ing.unit !== 'Stück') parts.push(ing.unit);
    parts.push(ing.name);
    if (ing.notes) parts.push(chalk.dim(`(${ing.notes})`));
    return parts.join(' ');
}
