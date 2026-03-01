import { task, schedules, logger } from '@trigger.dev/sdk';

import { sendEmail } from '../lib/email';
import { renderEmailTemplate } from '../lib/email-templates';
import { prisma } from '../lib/prisma';

export const dailyRecipeTask = task({
    id: 'daily-recipe',
    run: async (payload, { ctx }) => {
        logger.info('📅 Starting daily recipe task', { runId: ctx.run.id });

        try {
            const recipe = await prisma.recipe.findFirst({
                orderBy: { createdAt: 'desc' },
                include: {
                    author: { select: { name: true, email: true } },
                },
            });

            if (!recipe) {
                logger.warn('⚠️ No recipe found for daily recipe', { runId: ctx.run.id });
                return { success: false, reason: 'No recipe found' };
            }

            logger.debug('Found recipe for daily email', {
                recipeId: recipe.id,
                title: recipe.title,
                author: recipe.author?.name,
                runId: ctx.run.id,
            });

            logger.info('Sending daily recipe email', {
                recipeId: recipe.id,
                to: 'test@example.com',
                subject: `Rezept des Tages: ${recipe.title}`,
                runId: ctx.run.id,
            });

            const result = await sendEmail({
                to: 'test@example.com',
                subject: `Rezept des Tages: ${recipe.title}`,
                html: `<h1>${recipe.title}</h1><p>${recipe.description}</p>`,
            });

            if (result) {
                logger.info('✅ Daily recipe email sent', {
                    recipeId: recipe.id,
                    recipeTitle: recipe.title,
                    runId: ctx.run.id,
                });
            } else {
                logger.error('❌ Daily recipe email failed', {
                    recipeId: recipe.id,
                    recipeTitle: recipe.title,
                    runId: ctx.run.id,
                });
            }

            return { success: result, recipeId: recipe.id };
        } catch (error) {
            logger.error('❌ Daily recipe task exception', {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
            });
            throw error;
        }
    },
});

export const weeklyNewsletterTask = task({
    id: 'weekly-newsletter',
    run: async (payload, { ctx }) => {
        logger.info('📧 Starting weekly newsletter task', { runId: ctx.run.id });

        try {
            const recentRecipes = await prisma.recipe.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    author: { select: { name: true } },
                },
            });

            logger.info('Found recent recipes for newsletter', {
                count: recentRecipes.length,
                recipeIds: recentRecipes.map((r) => r.id),
                runId: ctx.run.id,
            });

            const subscribers = await prisma.user.findMany({
                where: {
                    email: { not: null },
                },
                select: { email: true, name: true },
            });

            logger.info('Found newsletter subscribers', {
                count: subscribers.length,
                runId: ctx.run.id,
            });

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

            const recipesHtml = recentRecipes
                .map(
                    (recipe) => `
            <div style="background:#faf9f7;padding:20px;border-radius:12px;margin-bottom:16px;">
                <h3 style="margin:0 0 8px;">${recipe.title}</h3>
                <p style="margin:0 0 8px;font-size:14px;color:#636e72;">${recipe.description?.substring(0, 100)}...</p>
                <a href="${appUrl}/recipe/${recipe.id}" style="color:#e07b53;font-size:14px;">Rezept ansehen →</a>
            </div>
        `,
                )
                .join('');

            const results = [];
            let successCount = 0;
            let failCount = 0;

            for (const subscriber of subscribers) {
                if (!subscriber.email) {
                    failCount++;
                    continue;
                }

                const rendered = renderEmailTemplate('weeklyNewsletter', {
                    name: subscriber.name || 'Kochenthusiast',
                    recipes: recipesHtml,
                    unsubscribeUrl: `${appUrl}/profile?unsubscribe=true`,
                    appUrl,
                });

                if (!rendered) {
                    logger.warn('⚠️ Failed to render newsletter template', {
                        email: subscriber.email,
                        runId: ctx.run.id,
                    });
                    failCount++;
                    continue;
                }

                logger.debug('Sending newsletter to subscriber', {
                    email: subscriber.email,
                    name: subscriber.name,
                    runId: ctx.run.id,
                });

                const success = await sendEmail({
                    to: subscriber.email,
                    subject: rendered.subject,
                    html: rendered.html,
                });

                if (success) {
                    successCount++;
                } else {
                    failCount++;
                    logger.error('❌ Failed to send newsletter', {
                        email: subscriber.email,
                        runId: ctx.run.id,
                    });
                }

                results.push({ email: subscriber.email, success });
            }

            logger.info('✅ Weekly newsletter completed', {
                totalRecipients: subscribers.length,
                successCount,
                failCount,
                runId: ctx.run.id,
            });

            return {
                totalRecipients: subscribers.length,
                successCount,
                failCount,
                results,
            };
        } catch (error) {
            logger.error('❌ Weekly newsletter exception', {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
            });
            throw error;
        }
    },
});

export const dailyRecipeSchedule = schedules.task({
    id: 'daily-recipe-schedule',
    cron: '0 8 * * *',
    run: async (payload, { ctx }) => {
        logger.info('📅 Daily recipe schedule triggered', { runId: ctx.run.id });
        await dailyRecipeTask.trigger();
        logger.info('Daily recipe task triggered successfully', { runId: ctx.run.id });
    },
});
