import { Job } from 'bullmq';

import { sendEmail } from './email-service';
import { renderEmailTemplate } from './email-templates';
import { prisma } from './prisma';
import { DailyRecipeJob, WeeklyNewsletterJob } from './types';

export async function processDailyRecipe(
    job: Job<DailyRecipeJob>,
): Promise<{ success: boolean; recipeId?: string; reason?: string }> {
    console.log(`[Scheduled] Processing daily-recipe job ${job.id}`);

    try {
        const recipe = await prisma.recipe.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, email: true } },
            },
        });

        if (!recipe) {
            return { success: false, reason: 'No recipe found' };
        }

        const recipientEmail = job.data.recipientEmail || 'test@example.com';

        const result = await sendEmail({
            to: recipientEmail,
            subject: `Rezept des Tages: ${recipe.title}`,
            html: `<h1>${recipe.title}</h1><p>${recipe.description}</p>`,
        });

        console.log(`[Scheduled] Daily recipe email sent`, {
            recipeId: recipe.id,
            title: recipe.title,
            success: result,
        });

        return { success: result, recipeId: recipe.id };
    } catch (error) {
        console.error(`[Scheduled] daily-recipe job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processWeeklyNewsletter(job: Job<WeeklyNewsletterJob>): Promise<{
    totalRecipients: number;
    successCount: number;
    failCount: number;
}> {
    const dryRun = job.data.dryRun ?? false;

    console.log(`[Scheduled] Processing weekly-newsletter job ${job.id}`, { dryRun });

    try {
        const recentRecipes = await prisma.recipe.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                author: { select: { name: true } },
            },
        });

        console.log(`[Scheduled] Found ${recentRecipes.length} recent recipes`);

        const subscribers = await prisma.user.findMany({
            where: {
                email: { not: null },
            },
            select: { email: true, name: true },
        });

        console.log(`[Scheduled] Found ${subscribers.length} newsletter subscribers`);

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
                failCount++;
                continue;
            }

            if (dryRun) {
                console.log(`[Scheduled] Dry run - would send to: ${subscriber.email}`);
                successCount++;
                continue;
            }

            const success = await sendEmail({
                to: subscriber.email,
                subject: rendered.subject,
                html: rendered.html,
            });

            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        console.log(`[Scheduled] Weekly newsletter completed`, {
            totalRecipients: subscribers.length,
            successCount,
            failCount,
        });

        return {
            totalRecipients: subscribers.length,
            successCount,
            failCount,
        };
    } catch (error) {
        console.error(`[Scheduled] weekly-newsletter job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
