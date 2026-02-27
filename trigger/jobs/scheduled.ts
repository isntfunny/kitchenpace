import { PrismaClient } from '@prisma/client';
import { task, schedules, logger } from '@trigger.dev/sdk';

import { sendEmail } from '../lib/email';
import { renderEmailTemplate } from '../lib/email-templates';

const prisma = new PrismaClient();

export const dailyRecipeTask = task({
    id: 'daily-recipe',
    run: async () => {
        logger.info('Starting daily recipe task');

        const recipe = await prisma.recipe.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, email: true } },
            },
        });

        if (!recipe) {
            logger.warn('No recipe found for daily recipe');
            return { success: false, reason: 'No recipe found' };
        }

        const _appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const result = await sendEmail({
            to: 'test@example.com',
            subject: `Rezept des Tages: ${recipe.title}`,
            html: `<h1>${recipe.title}</h1><p>${recipe.description}</p>`,
        });

        logger.info('Daily recipe email sent', { recipeId: recipe.id });

        return { success: result, recipeId: recipe.id };
    },
});

export const weeklyNewsletterTask = task({
    id: 'weekly-newsletter',
    run: async () => {
        logger.info('Starting weekly newsletter task');

        const recentRecipes = await prisma.recipe.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                author: { select: { name: true } },
            },
        });

        const subscribers = await prisma.user.findMany({
            where: {
                email: { not: null },
            },
            select: { email: true, name: true },
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

        for (const subscriber of subscribers) {
            if (!subscriber.email) continue;

            const rendered = renderEmailTemplate('weeklyNewsletter', {
                name: subscriber.name || 'Kochenthusiast',
                recipes: recipesHtml,
                unsubscribeUrl: `${appUrl}/profile?unsubscribe=true`,
                appUrl,
            });

            if (!rendered) continue;

            const success = await sendEmail({
                to: subscriber.email,
                subject: rendered.subject,
                html: rendered.html,
            });

            results.push({ email: subscriber.email, success });
        }

        logger.info('Weekly newsletter sent', { recipients: results.length });

        return {
            totalRecipients: subscribers.length,
            results,
        };
    },
});

export const dailyRecipeSchedule = schedules.task({
    id: 'daily-recipe-schedule',
    cron: '0 8 * * *',
    run: async () => {
        logger.info('Daily recipe schedule triggered');
        await dailyRecipeTask.trigger();
    },
});
