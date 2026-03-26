#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';

import { registerImportCommand } from './commands/import.js';
import { registerRemoteCommand } from './commands/remote.js';
import { registerSeedCommand } from './commands/seed.js';
import { generateCompletions } from './lib/complete.js';
import { db, RecipeStatus } from './lib/db.js';
import { triggerJobNow, getJobDefinitions } from './lib/jobs.js';

const program = new Command();

program.name('kitchen').description('KitchenPace CLI - Manage users and recipes').version('1.0.0');

program
    .command('acl')
    .description('User access control management')
    .argument('<email>', 'User email address')
    .option('-r, --role <role>', 'Set or update user role (user, admin)')
    .option('-p, --password <password>', 'Set or update password')
    .option('-v, --verify', 'Mark email as verified')
    .option('--unverify', 'Mark email as unverified')
    .option('-i, --info', 'Show user information')
    .option('-n, --nickname <nickname>', 'Nickname for the profile (auto derived from the email)')
    .action(async (email, options) => {
        await db.$connect();

        try {
            const user = await db.user.findUnique({
                where: { email },
                include: { profile: true },
            });

            if (!user && options.info) {
                console.error(`Error: User not found: ${email}`);
                process.exit(1);
            }

            if (!user) {
                console.error(`Error: User not found: ${email}`);
                console.error(
                    'Users must register through the app. Use this command to manage existing accounts.',
                );
                process.exit(1);
            }

            if (options.info) {
                console.log(`\nUser Info for ${email}:`);
                console.log(`  ID:         ${user.id}`);
                console.log(`  Name:       ${user.name || '(none)'}`);
                console.log(`  Role:       ${user.role}`);
                console.log(`  Verified:   ${user.emailVerified ? 'Yes' : 'No'}`);
                console.log(`  Created:    ${user.createdAt.toISOString()}`);
                if (user.profile) {
                    console.log(`  Nickname:   ${user.profile.nickname}`);
                    console.log(`  Followers:  ${user.profile.followerCount}`);
                    console.log(`  Recipes:    ${user.profile.recipeCount}`);
                }
                return;
            }

            if (options.role) {
                const roleValue = options.role.toLowerCase();
                if (!['user', 'admin'].includes(roleValue)) {
                    console.error(`Error: Invalid role "${options.role}". Use user or admin`);
                    process.exit(1);
                }
                await db.user.update({
                    where: { email },
                    data: { role: roleValue },
                });
                console.log(`✓ Updated ${email} role to ${roleValue}`);
            }

            if (options.password) {
                const { hashPassword } = await import('better-auth/crypto');
                const hashedPassword = await hashPassword(options.password);

                // Better Auth stores passwords in the Account table
                await db.account.upsert({
                    where: {
                        id: `credential_${user.id}`,
                    },
                    update: {
                        password: hashedPassword,
                    },
                    create: {
                        id: `credential_${user.id}`,
                        userId: user.id,
                        accountId: user.id,
                        providerId: 'credential',
                        password: hashedPassword,
                    },
                });
                console.log(`✓ Updated password for ${email}`);
            }

            if (options.verify) {
                await db.user.update({
                    where: { email },
                    data: { emailVerified: true },
                });
                console.log(`✓ Marked ${email} as verified`);
            }

            if (options.unverify) {
                await db.user.update({
                    where: { email },
                    data: { emailVerified: false },
                });
                console.log(`✓ Marked ${email} as unverified`);
            }
        } finally {
            await db.$disconnect();
        }
    });

program
    .command('recipe')
    .description('Recipe management')
    .argument('<identifier>', 'Recipe ID, slug, or title')
    .option('-p, --publish', 'Publish recipe')
    .option('-u, --unpublish', 'Set recipe to draft')
    .option('-a, --archive', 'Archive recipe')
    .option('-s, --status <status>', 'Set recipe status (DRAFT, PUBLISHED, ARCHIVED)')
    .option('-i, --info', 'Show recipe information')
    .action(async (identifier, options) => {
        await db.$connect();

        try {
            const recipe = await findRecipe(identifier);

            if (!recipe) {
                console.error(`Error: Recipe not found: ${identifier}`);
                process.exit(1);
            }

            if (options.info) {
                const author = await db.user.findUnique({
                    where: { id: recipe.authorId },
                    include: { profile: true },
                });

                console.log(`\nRecipe Info:`);
                console.log(`  ID:          ${recipe.id}`);
                console.log(`  Title:       ${recipe.title}`);
                console.log(`  Slug:        ${recipe.slug}`);
                console.log(`  Status:      ${recipe.status}`);
                console.log(
                    `  Author:      ${author?.profile?.nickname || author?.email || 'Unknown'}`,
                );
                console.log(`  Prep Time:   ${recipe.prepTime} min`);
                console.log(`  Cook Time:   ${recipe.cookTime} min`);
                console.log(`  Total Time:  ${recipe.totalTime} min`);
                console.log(`  Servings:    ${recipe.servings}`);
                console.log(`  Difficulty:  ${recipe.difficulty}`);
                console.log(
                    `  Rating:      ${recipe.rating.toFixed(1)} (${recipe.ratingCount} votes)`,
                );
                console.log(`  Views:       ${recipe.viewCount}`);
                console.log(`  Cook Count:  ${recipe.cookCount}`);
                console.log(`  Created:     ${recipe.createdAt.toISOString()}`);
                console.log(
                    `  Published:   ${recipe.publishedAt?.toISOString() || 'Not published'}`,
                );
                return;
            }

            if (options.publish) {
                await db.recipe.update({
                    where: { id: recipe.id },
                    data: {
                        status: RecipeStatus.PUBLISHED,
                        publishedAt: new Date(),
                    },
                });
                console.log(`✓ Published recipe "${recipe.title}"`);
            }

            if (options.unpublish) {
                await db.recipe.update({
                    where: { id: recipe.id },
                    data: {
                        status: RecipeStatus.DRAFT,
                        publishedAt: null,
                    },
                });
                console.log(`✓ Set recipe "${recipe.title}" to DRAFT`);
            }

            if (options.archive) {
                await db.recipe.update({
                    where: { id: recipe.id },
                    data: { status: RecipeStatus.ARCHIVED },
                });
                console.log(`✓ Archived recipe "${recipe.title}"`);
            }

            if (options.status) {
                const statusValue = options.status.toUpperCase();
                if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(statusValue)) {
                    console.error(
                        `Error: Invalid status "${options.status}". Use DRAFT, PUBLISHED, or ARCHIVED`,
                    );
                    process.exit(1);
                }
                await db.recipe.update({
                    where: { id: recipe.id },
                    data: {
                        status: statusValue as RecipeStatus,
                        publishedAt: statusValue === 'PUBLISHED' ? new Date() : recipe.publishedAt,
                    },
                });
                console.log(`✓ Set recipe "${recipe.title}" status to ${statusValue}`);
            }
        } finally {
            await db.$disconnect();
        }
    });

program
    .command('job')
    .description('Dispatch BullMQ jobs')
    .argument('[queue]', 'Queue name')
    .argument('[jobName]', 'Job name to trigger')
    .option('-d, --data <json>', 'Job payload as JSON', '{}')
    .option('-l, --list', 'List available queues and jobs')
    .action(async (queue, jobName, options) => {
        if (options.list) {
            const defs = getJobDefinitions();
            console.log('\nAvailable Queues & Jobs:');
            for (const q of Object.keys(defs)) {
                console.log(`\n  ${q}:`);
                for (const j of defs[q as keyof typeof defs] || []) {
                    console.log(`    - ${j}`);
                }
            }
            return;
        }

        if (!queue) {
            console.error('Error: Queue name required. Use --list to see available queues.');
            process.exit(1);
        }

        const defs = getJobDefinitions();
        const queueJobs = defs[queue as keyof typeof defs];

        if (!jobName) {
            if (queueJobs && queueJobs.length > 0) {
                console.error(`Error: Job name required. Available jobs for "${queue}":`);
                for (const j of queueJobs) {
                    console.error(`  - ${j}`);
                }
            } else {
                console.error(`Error: Job name required.`);
            }
            process.exit(1);
        }

        let payload = {};
        if (options.data) {
            try {
                payload = JSON.parse(options.data);
            } catch {
                console.error('Error: Invalid JSON in --data');
                process.exit(1);
            }
        }

        await triggerJobNow(queue, jobName, payload);
        console.log(`✓ Triggered job: ${jobName} on queue ${queue}`);
    });

program
    .command('backup')
    .description('Trigger database backup manually')
    .option('-t, --type <type>', 'Backup type: hourly or daily', 'daily')
    .action(async (options) => {
        const { getBackupQueue } = await import('../worker/queues/queue.js');
        const queue = getBackupQueue();

        const type = options.type;

        if (!['hourly', 'daily'].includes(type)) {
            console.error('Error: Type must be "hourly" or "daily"');
            process.exit(1);
        }

        const job = await queue.add('database-backup', { type });
        console.log(`✓ Backup job triggered: ${job.id}`);
        console.log(`  Type: ${type}`);

        await queue.close();
    });

program
    .command('env')
    .description('Show environment variables kitchen is running with')
    .argument('[filter]', 'Filter variables by prefix (case-insensitive)')
    .action((filter?: string) => {
        const entries = Object.entries(process.env)
            .filter(([key]) => !filter || key.toLowerCase().includes(filter.toLowerCase()))
            .sort(([a], [b]) => a.localeCompare(b));

        if (entries.length === 0) {
            console.log(
                filter ? `No variables matching "${filter}"` : 'No environment variables found',
            );
            return;
        }

        const maxKey = Math.min(Math.max(...entries.map(([k]) => k.length)), 40);
        for (const [key, value] of entries) {
            const masked =
                /secret|password|token|key|private/i.test(key) && value
                    ? value.slice(0, 4) + '••••'
                    : value;
            console.log(`  ${key.padEnd(maxKey)}  ${masked}`);
        }
        console.log(`\n  ${entries.length} variable${entries.length === 1 ? '' : 's'}`);
    });

program
    .command('relayout')
    .description('Recompute flow layout positions for imported recipes')
    .option('--all', 'Process ALL recipes, not just imported ones')
    .option('--dry-run', 'Show which recipes would be updated without saving')
    .action(async (options: { all?: boolean; dryRun?: boolean }) => {
        const { computeFlowLayout } = await import('@app/lib/flow-layout');
        const chalk = (await import('chalk')).default;
        const ora = (await import('ora')).default;

        await db.$connect();
        try {
            const spinner = ora('Finding recipes...').start();

            const where = options.all
                ? { flowNodes: { not: { equals: null as unknown as undefined } } }
                : { sourceUrl: { not: null } };

            const recipes = await db.recipe.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    flowNodes: true,
                    flowEdges: true,
                },
            });

            spinner.succeed(`Found ${recipes.length} recipes`);

            let updated = 0;
            let skipped = 0;

            for (const recipe of recipes) {
                const nodes = recipe.flowNodes as
                    | { id: string; position?: { x: number; y: number } }[]
                    | null;
                const edges = recipe.flowEdges as { source: string; target: string }[] | null;

                if (!nodes?.length || !edges?.length) {
                    skipped++;
                    continue;
                }

                const positions = computeFlowLayout(
                    nodes.map((n) => ({ id: n.id })),
                    edges,
                );

                const layoutNodes = nodes.map((node) => ({
                    ...node,
                    position: positions.get(node.id) ?? node.position ?? { x: 0, y: 0 },
                }));

                if (options.dryRun) {
                    console.log(chalk.dim(`  [dry-run] ${recipe.title} (${recipe.slug})`));
                } else {
                    await db.recipe.update({
                        where: { id: recipe.id },
                        data: { flowNodes: layoutNodes as unknown as object },
                    });
                }

                updated++;
                if (updated % 20 === 0) {
                    console.log(chalk.dim(`  ... ${updated}/${recipes.length} processed`));
                }
            }

            console.log();
            console.log(
                chalk.green.bold(
                    `  ${updated} recipes ${options.dryRun ? 'would be ' : ''}updated`,
                ),
            );
            if (skipped > 0) {
                console.log(chalk.yellow(`  ${skipped} skipped (no flow data)`));
            }
        } finally {
            await db.$disconnect();
        }
    });

program
    .command('fix-images')
    .description('Move recipe images from uploads/ to approved/ and set moderationStatus')
    .option('--dry-run', 'Show what would be done without making changes')
    .action(async (options: { dryRun?: boolean }) => {
        const { approvedKey } = await import('@app/lib/s3/keys');
        const { moveObject } = await import('@app/lib/s3/operations');
        const chalk = (await import('chalk')).default;
        const ora = (await import('ora')).default;

        await db.$connect();
        try {
            const spinner = ora('Finding recipes with uploads/ images...').start();
            const recipes = await db.recipe.findMany({
                where: { imageKey: { startsWith: 'uploads/' } },
                select: { id: true, title: true, imageKey: true },
            });
            spinner.succeed(`Found ${recipes.length} recipes with uploads/ images`);

            if (recipes.length === 0) return;

            let moved = 0;
            let failed = 0;

            for (const recipe of recipes) {
                const ext = recipe.imageKey!.split('.').pop() ?? 'jpg';
                const destKey = approvedKey('recipe', recipe.id, ext);

                if (options.dryRun) {
                    console.log(chalk.dim(`  [dry-run] ${recipe.imageKey} → ${destKey}`));
                    moved++;
                    continue;
                }

                try {
                    await moveObject(recipe.imageKey!, destKey);
                    await db.recipe.update({
                        where: { id: recipe.id },
                        data: { imageKey: destKey, moderationStatus: 'AUTO_APPROVED' },
                    });
                    moved++;
                } catch (err) {
                    console.error(chalk.red(`  ✗ ${recipe.title}: ${err}`));
                    failed++;
                }

                if (moved % 50 === 0) {
                    console.log(chalk.dim(`  ... ${moved}/${recipes.length} moved`));
                }
            }

            console.log();
            console.log(
                chalk.green.bold(
                    `  ${moved} images ${options.dryRun ? 'would be ' : ''}moved to approved/`,
                ),
            );
            if (failed > 0) {
                console.log(chalk.red(`  ${failed} failed`));
            }

            // Clear thumbnail cache — old thumbs are keyed by uploads/ hash
            if (!options.dryRun && moved > 0) {
                const { listByPrefix, deleteObject } = await import('@app/lib/s3/operations');
                const thumbSpinner = ora('Clearing thumbnail cache...').start();
                const thumbKeys = await listByPrefix('thumbs/');
                let deleted = 0;
                for (const key of thumbKeys) {
                    await deleteObject(key);
                    deleted++;
                }
                thumbSpinner.succeed(`Cleared ${deleted} cached thumbnails`);
            }
        } finally {
            await db.$disconnect();
        }
    });

registerImportCommand(program);
registerSeedCommand(program);
registerRemoteCommand(program);

program
    .command('completion')
    .description('Generate shell completion script')
    .argument('<shell>', 'Shell type: bash, zsh, fish')
    .action((shell) => {
        console.log(generateCompletions(shell));
    });

async function findRecipe(identifier: string) {
    const byId = await db.recipe.findUnique({ where: { id: identifier } });
    if (byId) return byId;

    const bySlug = await db.recipe.findUnique({ where: { slug: identifier } });
    if (bySlug) return bySlug;

    const byTitle = await db.recipe.findFirst({
        where: { title: { contains: identifier, mode: 'insensitive' } },
    });
    return byTitle;
}

program.parse();
