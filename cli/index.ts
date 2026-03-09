#!/usr/bin/env node
import 'dotenv/config';
import { hash } from 'bcrypt';
import { Command } from 'commander';

import { generateUniqueSlug } from '@app/lib/slug';

import { generateCompletions } from './lib/complete.js';
import { db, Role, RecipeStatus } from './lib/db.js';
import { triggerJobNow, getJobDefinitions } from './lib/jobs.js';

const program = new Command();

program.name('kitchen').description('KitchenPace CLI - Manage users and recipes').version('1.0.0');

program
    .command('acl')
    .description('User access control management')
    .argument('<email>', 'User email address')
    .option('-r, --role <role>', 'Set or update user role (USER, ADMIN)')
    .option('-a, --activate', 'Activate user account')
    .option('-d, --deactivate', 'Deactivate user account')
    .option('-i, --info', 'Show user information')
    .option(
        '-p, --password <password>',
        'Set or reset password (required when creating a new account)',
    )
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
                if (!options.password) {
                    console.error(
                        'Error: User not found. Provide --password to create a new account.',
                    );
                    process.exit(1);
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    console.error('Error: Invalid email format');
                    process.exit(1);
                }

                const roleValue = options.role ? options.role.toUpperCase() : 'USER';
                if (!['USER', 'ADMIN'].includes(roleValue)) {
                    console.error(`Error: Invalid role "${options.role}". Use USER or ADMIN`);
                    process.exit(1);
                }

                const password = options.password;
                if (password.length < 8) {
                    console.error('Error: Password must be at least 8 characters');
                    process.exit(1);
                }

                const nickname = await resolveNickname(options.nickname, email);
                const hashedPassword = await hash(password, 12);

                const newUser = await db.$transaction(async (tx) => {
                    const created = await tx.user.create({
                        data: {
                            email,
                            hashedPassword,
                            role: roleValue as Role,
                            isActive: options.activate || false,
                        },
                    });

                    const slug = await generateUniqueSlug(
                        nickname,
                        async (s) => !!(await tx.profile.findUnique({ where: { slug: s } })),
                    );
                    await tx.profile.create({
                        data: {
                            userId: created.id,
                            nickname,
                            slug,
                        },
                    });

                    return created;
                });

                console.log(`✓ Account created successfully for ${email}`);
                console.log(`  ID:       ${newUser.id}`);
                console.log(`  Role:     ${roleValue}`);
                console.log(`  Active:   ${options.activate ? 'Yes' : 'No (activation required)'}`);
                console.log(`  Nickname: ${nickname}`);

                if (!options.activate) {
                    console.log(
                        `\nNote: User needs to activate their account via email verification.`,
                    );
                    console.log(`Use 'kitchen acl ${email} --activate' to activate manually.`);
                }

                return;
            }

            if (options.info) {
                console.log(`\nUser Info for ${email}:`);
                console.log(`  ID:         ${user.id}`);
                console.log(`  Name:       ${user.name || '(none)'}`);
                console.log(`  Role:       ${user.role}`);
                console.log(`  Active:     ${user.isActive ? 'Yes' : 'No'}`);
                console.log(`  Created:    ${user.createdAt.toISOString()}`);
                if (user.profile) {
                    console.log(`  Nickname:   ${user.profile.nickname}`);
                    console.log(`  Followers:  ${user.profile.followerCount}`);
                    console.log(`  Recipes:    ${user.profile.recipeCount}`);
                }
                return;
            }

            if (options.role) {
                const roleValue = options.role.toUpperCase();
                if (!['USER', 'ADMIN'].includes(roleValue)) {
                    console.error(`Error: Invalid role "${options.role}". Use USER or ADMIN`);
                    process.exit(1);
                }
                await db.user.update({
                    where: { email },
                    data: { role: roleValue as Role },
                });
                console.log(`✓ Updated ${email} role to ${roleValue}`);
            }

            if (options.password) {
                if (options.password.length < 8) {
                    console.error('Error: Password must be at least 8 characters');
                    process.exit(1);
                }

                const newHash = await hash(options.password, 12);
                await db.user.update({
                    where: { email },
                    data: { hashedPassword: newHash },
                });
                console.log(`✓ Updated password for ${email}`);
            }

            if (options.activate) {
                await db.user.update({
                    where: { email },
                    data: { isActive: true },
                });
                console.log(`✓ Activated user ${email}`);
            }

            if (options.deactivate) {
                await db.user.update({
                    where: { email },
                    data: { isActive: false },
                });
                console.log(`✓ Deactivated user ${email}`);
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

async function resolveNickname(preferred: string | undefined, email: string) {
    const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const fallback = email.split('@')[0] || 'user';
    let base = preferred && preferred.length > 0 ? preferred : fallback;
    base = sanitize(base);
    if (base.length === 0) {
        base = `user${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    if (base.length > 40) {
        base = base.slice(0, 40);
    }
    if (base.length < 3) {
        base = base.padEnd(3, 'x');
    }

    let candidate = base;
    let suffix = 0;
    while (await db.profile.findUnique({ where: { nickname: candidate } })) {
        suffix += 1;
        const suffixText = suffix.toString();
        const truncationLength = Math.max(1, 40 - suffixText.length);
        candidate = `${base.slice(0, truncationLength)}${suffixText}`;
    }

    return candidate;
}

program.parse();
