#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';

import { generateCompletions } from './lib/complete.js';
import { db, Role, RecipeStatus } from './lib/db.js';
import { triggerJobNow, getJobDefinitions } from './lib/jobs.js';

const program = new Command();

program.name('kitchen').description('KitchenPace CLI - Manage users and recipes').version('1.0.0');

program
    .command('acl')
    .description('User access control management')
    .argument('<email>', 'User email address')
    .option('-r, --role <role>', 'Set user role (USER, ADMIN)')
    .option('-a, --activate', 'Activate user account')
    .option('-d, --deactivate', 'Deactivate user account')
    .option('-i, --info', 'Show user information')
    .action(async (email, options) => {
        await db.$connect();

        try {
            const user = await db.user.findUnique({
                where: { email },
                include: { profile: true },
            });

            if (!user) {
                console.error(`Error: User not found: ${email}`);
                process.exit(1);
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
