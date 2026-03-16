/**
 * CLI command: kitchen seed [name]
 *
 * Thin runner over the seeder registry.
 *
 * Usage:
 *   kitchen seed                    -- run all seeders (safe, idempotent)
 *   kitchen seed basics             -- run only the basics seeder
 *   kitchen seed ingredients        -- run only the ingredients seeder
 *   kitchen seed --force            -- delete managed data and re-create (destructive)
 *   kitchen seed --dry-run          -- show what would happen without writing
 *   kitchen seed --list             -- list available seeders
 */

import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';

import { db } from '../lib/db.js';
import { seeders, type Seeder, type SeederResult } from '../seeders/index.js';

export function registerSeedCommand(program: Command): void {
    program
        .command('seed [name]')
        .description('Seed database (run all seeders or a specific one)')
        .option('--force', 'Delete managed data and re-create (destructive)')
        .option('--dry-run', 'Show what would happen without writing')
        .option('--list', 'List available seeders')
        .action(
            async (
                name?: string,
                options?: { force?: boolean; dryRun?: boolean; list?: boolean },
            ) => {
                if (options?.list) {
                    console.log('\nAvailable seeders:\n');
                    for (const s of seeders) {
                        console.log(
                            `  ${chalk.bold(s.name.padEnd(20))} ${chalk.dim(s.description)}`,
                        );
                    }
                    console.log();
                    return;
                }

                await db.$connect();
                try {
                    const toRun: Seeder[] = name ? seeders.filter((s) => s.name === name) : seeders;

                    if (name && toRun.length === 0) {
                        console.error(chalk.red(`Unknown seeder: ${name}`));
                        console.error(
                            chalk.dim(`Available: ${seeders.map((s) => s.name).join(', ')}`),
                        );
                        process.exit(1);
                    }

                    if (options?.force) {
                        console.log(
                            chalk.red.bold(
                                '\n  FORCE MODE -- managed data will be deleted and re-created\n',
                            ),
                        );
                    }
                    if (options?.dryRun) {
                        console.log(chalk.yellow.bold('  DRY RUN -- no DB writes\n'));
                    }

                    if (options?.dryRun) {
                        // Dry run: execute inside a transaction, collect results, then rollback
                        const results: Array<{ seeder: Seeder; result: SeederResult }> = [];
                        try {
                            await db.$transaction(
                                async (tx) => {
                                    for (const seeder of toRun) {
                                        const result = options?.force
                                            ? await seeder.reset(tx as unknown as typeof db)
                                            : await seeder.run(tx as unknown as typeof db);
                                        results.push({ seeder, result });
                                    }
                                    // Throw to trigger rollback — this is intentional
                                    throw new Error('__DRY_RUN_ROLLBACK__');
                                },
                                { timeout: 120_000 },
                            );
                        } catch (e) {
                            if (!(e instanceof Error && e.message === '__DRY_RUN_ROLLBACK__'))
                                throw e;
                        }

                        for (const { seeder, result } of results) {
                            const parts: string[] = [];
                            if (result.created > 0)
                                parts.push(chalk.green(`${result.created} would be created`));
                            if (result.skipped > 0)
                                parts.push(chalk.dim(`${result.skipped} already exist`));
                            if (result.deleted > 0)
                                parts.push(chalk.red(`${result.deleted} would be deleted`));
                            console.log(`  ${chalk.bold(seeder.name)}: ${parts.join(', ')}`);
                        }

                        console.log(
                            chalk.yellow.bold('\n  Dry run complete — no changes were made.\n'),
                        );
                    } else {
                        for (const seeder of toRun) {
                            const spinner = ora(`${seeder.name}...`).start();

                            const result = options?.force
                                ? await seeder.reset(db)
                                : await seeder.run(db);

                            const parts: string[] = [];
                            if (result.created > 0)
                                parts.push(chalk.green(`${result.created} created`));
                            if (result.skipped > 0)
                                parts.push(chalk.dim(`${result.skipped} existed`));
                            if (result.deleted > 0)
                                parts.push(chalk.red(`${result.deleted} deleted`));

                            spinner.succeed(`${seeder.name}: ${parts.join(', ')}`);
                        }

                        console.log(chalk.green.bold('\n  Seed complete!\n'));
                    }
                } finally {
                    await db.$disconnect();
                }
            },
        );
}
