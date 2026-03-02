import { Job } from 'bullmq';

import { sendEmail } from './email-service';
import { renderEmailTemplate } from './email-templates';
import { prisma } from './prisma';
import { DailyRecipeJob, WeeklyNewsletterJob } from './types';

export async function processTrendingRecipes(
    job: Job<Record<string, unknown>>,
): Promise<{ success: boolean; updatedCount?: number }> {
    console.log(`[Scheduled] Processing trending-recipes job ${job.id}`);

    try {
        // Embedded SQL query for trending calculation wrapped in transaction
        const sql = `
            BEGIN;

            -- Reset all trending status
            UPDATE "Recipe" SET "isTrending" = FALSE;

            -- Calculate trending scores for recipes published in last 30 days
            WITH recent_recipes AS (
                SELECT r.id, r."imageUrl" IS NOT NULL as has_image
                FROM "Recipe" r
                WHERE r."publishedAt" >= NOW() - INTERVAL '30 days'
                AND r."status" = 'PUBLISHED'
            ),
            -- Cook counts in last 7 days
            cook_counts AS (
                SELECT r.id, COUNT(*) as cook_count
                FROM "UserCookHistory" h
                JOIN recent_recipes r ON h."recipeId" = r.id
                WHERE h."cookedAt" >= NOW() - INTERVAL '7 days'
                GROUP BY r.id
            ),
            -- View counts in last 7 days
            view_counts AS (
                SELECT r.id, COUNT(*) as view_count
                FROM "UserViewHistory" v
                JOIN recent_recipes r ON v."recipeId" = r.id
                WHERE v."viewedAt" >= NOW() - INTERVAL '7 days'
                GROUP BY r.id
            ),
            -- Favorite counts in last 7 days
            favorite_counts AS (
                SELECT r.id, COUNT(*) as favorite_count
                FROM "Favorite" f
                JOIN recent_recipes r ON f."recipeId" = r.id
                WHERE f."createdAt" >= NOW() - INTERVAL '7 days'
                GROUP BY r.id
            ),
            -- Average ratings for recipes
            rating_averages AS (
                SELECT r.id, AVG(ur."rating") as avg_rating
                FROM "UserRating" ur
                JOIN recent_recipes r ON ur."recipeId" = r.id
                GROUP BY r.id
            ),
            -- Combined scores with filtering
            scored_recipes AS (
                SELECT 
                    r.id,
                    r.has_image,
                    COALESCE(cook_counts.cook_count, 0) as cook_count,
                    COALESCE(view_counts.view_count, 0) as view_count,
                    COALESCE(favorite_counts.favorite_count, 0) as favorite_count,
                    COALESCE(rating_averages.avg_rating, 0) as avg_rating,
                    -- Weighted scoring formula
                    (CASE 
                        WHEN r.has_image THEN COALESCE(cook_counts.cook_count, 0) * 8
                        ELSE COALESCE(cook_counts.cook_count, 0) * 6
                     END) +
                    (COALESCE(rating_averages.avg_rating, 0) * 6) +
                    (COALESCE(favorite_counts.favorite_count, 0) * 4) +
                    (COALESCE(view_counts.view_count, 0) * 2) as score
                FROM recent_recipes r
                LEFT JOIN cook_counts ON r.id = cook_counts.id
                LEFT JOIN view_counts ON r.id = view_counts.id
                LEFT JOIN favorite_counts ON r.id = favorite_counts.id
                LEFT JOIN rating_averages ON r.id = rating_averages.id
                WHERE COALESCE(cook_counts.cook_count, 0) >= 3
            )
            -- Update top 10 trending recipes
            UPDATE "Recipe" r
            SET "isTrending" = TRUE
            FROM (
                SELECT id
                FROM scored_recipes
                ORDER BY score DESC
                LIMIT 10
            ) top_trending
            WHERE r.id = top_trending.id;

            COMMIT;
        `;

        // Execute the trending calculation query
        await prisma.$executeRawUnsafe(sql);

        // Get the count of updated recipes using raw query
        const result = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM "Recipe" WHERE "isTrending" = true
        `;
        const updatedCount = Number(result[0]?.count ?? 0);

        console.log(`[Scheduled] Trending recipes calculation completed`, {
            updatedCount,
            timestamp: new Date().toISOString(),
        });

        return { success: true, updatedCount };
    } catch (error) {
        console.error(`[Scheduled] trending-recipes job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

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
