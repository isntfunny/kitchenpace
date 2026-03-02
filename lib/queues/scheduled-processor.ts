import { Job } from 'bullmq';

import { sendEmail } from './email-service';
import { renderEmailTemplate } from './email-templates';
import { prisma } from './prisma';
import { DailyRecipeJob, WeeklyNewsletterJob, DailyDigestJob } from './types';

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

interface TopRecipePick {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    rating: number;
    ratingCount: number;
    cookCount: number;
}

interface _NewestRecipe {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    authorName: string | null;
    createdAt: Date;
}

interface _UserActivitySummary {
    recipeId: string;
    recipeTitle: string;
    type: string;
    count: number;
}

export async function processDailyDigest(job: Job<DailyDigestJob>): Promise<{
    totalRecipients: number;
    successCount: number;
    failCount: number;
}> {
    const dryRun = job.data.dryRun ?? false;

    console.log(`[Scheduled] Processing daily-digest job ${job.id}`, { dryRun });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const topPicks = await prisma.$queryRaw<TopRecipePick[]>`
            SELECT r.id, r.title, r.description, r."imageUrl", r.rating, r."ratingCount", r."cookCount"
            FROM "Recipe" r
            WHERE r."status" = 'PUBLISHED'
              AND r."publishedAt" IS NOT NULL
              AND r."imageUrl" IS NOT NULL
            ORDER BY (r.rating * r."ratingCount" + 3 * r."cookCount") DESC
            LIMIT 50
        `;

        const shuffledTopPicks = topPicks.sort(() => Math.random() - 0.5).slice(0, 3);

        const newestRecipes = await prisma.recipe.findMany({
            where: {
                status: 'PUBLISHED',
                publishedAt: {
                    gte: threeDaysAgo,
                },
            },
            orderBy: { publishedAt: 'desc' },
            take: 3,
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                publishedAt: true,
                author: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        console.log(
            `[Scheduled] Found ${shuffledTopPicks.length} top picks, ${newestRecipes.length} newest recipes`,
        );

        const users = await prisma.user.findMany({
            where: {
                email: { not: null },
                profile: {
                    notifyOnWeeklyPlanReminder: true,
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        console.log(`[Scheduled] Found ${users.length} users for daily digest`);

        const newRecipesHtml = newestRecipes
            .map(
                (recipe) => `
            <div style="background:#faf9f7;padding:16px;border-radius:12px;margin-bottom:12px;">
                <h3 style="margin:0 0 6px;font-size:16px;">${recipe.title}</h3>
                <p style="margin:0 0 6px;font-size:13px;color:#636e72;">${recipe.description?.substring(0, 80) || ''}...</p>
                <a href="${appUrl}/recipe/${recipe.id}" style="color:#e07b53;font-size:13px;">Rezept ansehen →</a>
            </div>
        `,
            )
            .join('');

        const topPicksHtml = shuffledTopPicks
            .map(
                (recipe) => `
            <div style="background:#fff8f2;padding:16px;border-radius:12px;margin-bottom:12px;border-left:4px solid #e07b53;">
                <h3 style="margin:0 0 6px;font-size:16px;">${recipe.title}</h3>
                <p style="margin:0 0 6px;font-size:13px;color:#636e72;">⭐ ${recipe.rating.toFixed(1)} (${recipe.ratingCount} Bew.) · 👨‍🍳 ${recipe.cookCount}x gekocht</p>
                <a href="${appUrl}/recipe/${recipe.id}" style="color:#e07b53;font-size:13px;">Rezept ansehen →</a>
            </div>
        `,
            )
            .join('');

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            if (!user.email) {
                failCount++;
                continue;
            }

            const userRecipeIds = await prisma.recipe.findMany({
                where: { authorId: user.id },
                select: { id: true },
            });
            const recipeIds = userRecipeIds.map((r) => r.id);

            let communityActivityHtml = '';

            if (recipeIds.length > 0) {
                const communityActivities = await prisma.activityLog.findMany({
                    where: {
                        targetId: { in: recipeIds },
                        targetType: 'Recipe',
                        userId: { not: user.id },
                        createdAt: { gte: threeDaysAgo },
                    },
                    include: {
                        user: { select: { name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                });

                if (communityActivities.length > 0) {
                    const activitiesByRecipe: Record<
                        string,
                        { types: Record<string, number>; users: Set<string> }
                    > = {};

                    for (const activity of communityActivities) {
                        const recipeId = activity.targetId!;
                        if (!activitiesByRecipe[recipeId]) {
                            activitiesByRecipe[recipeId] = { types: {}, users: new Set() };
                        }
                        activitiesByRecipe[recipeId].types[activity.type] =
                            (activitiesByRecipe[recipeId].types[activity.type] || 0) + 1;
                        if (activity.user?.name) {
                            activitiesByRecipe[recipeId].users.add(activity.user.name);
                        }
                    }

                    const recipeIdToTitle = new Map(
                        await prisma.recipe
                            .findMany({
                                where: { id: { in: recipeIds } },
                                select: { id: true, title: true },
                            })
                            .then((recipes) => recipes.map((r) => [r.id, r.title] as const)),
                    );

                    communityActivityHtml = Object.entries(activitiesByRecipe)
                        .slice(0, 5)
                        .map(([recipeId, data]) => {
                            const recipeTitle = recipeIdToTitle.get(recipeId) || 'Rezept';
                            const uniqueUsers = Array.from(data.users).slice(0, 3).join(', ');
                            const actionParts: string[] = [];

                            if (data.types.RECIPE_FAVORITED) {
                                actionParts.push(`${data.types.RECIPE_FAVORITED}x favorisiert`);
                            }
                            if (data.types.RECIPE_COMMENTED) {
                                actionParts.push(`${data.types.RECIPE_COMMENTED}x kommentiert`);
                            }
                            if (data.types.RECIPE_RATED) {
                                actionParts.push(`${data.types.RECIPE_RATED}x bewertet`);
                            }
                            if (data.types.RECIPE_COOKED) {
                                actionParts.push(`${data.types.RECIPE_COOKED}x gekocht`);
                            }

                            return `
                        <div style="background:#f0f7ff;padding:12px;border-radius:8px;margin-bottom:8px;border-left:3px solid #2196f3;">
                            <span style="font-size:14px;"><strong>${uniqueUsers || 'Jemand'}</strong> hat "${recipeTitle}" ${actionParts.join(', ')}</span>
                        </div>
                    `;
                        })
                        .join('');
                }
            }

            let finalMissedHtml = communityActivityHtml;

            if (!finalMissedHtml) {
                const allRecentActivity = await prisma.activityLog.findMany({
                    where: {
                        userId: { not: user.id },
                        createdAt: { gte: threeDaysAgo },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                });

                if (allRecentActivity.length > 0) {
                    const typeLabels: Record<string, string> = {
                        RECIPE_FAVORITED: 'Favoriten',
                        RECIPE_COMMENTED: 'Kommentare',
                        RECIPE_RATED: 'Bewertungen',
                        RECIPE_COOKED: 'Gekochte Rezepte',
                        USER_FOLLOWED: 'Neue Follower',
                    };

                    const activityCounts = allRecentActivity.reduce(
                        (acc, log) => {
                            acc[log.type] = (acc[log.type] || 0) + 1;
                            return acc;
                        },
                        {} as Record<string, number>,
                    );

                    const popularActivities = Object.entries(activityCounts)
                        .filter(([type]) =>
                            [
                                'RECIPE_FAVORITED',
                                'RECIPE_COMMENTED',
                                'RECIPE_RATED',
                                'RECIPE_COOKED',
                            ].includes(type),
                        )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4);

                    finalMissedHtml = popularActivities
                        .map(
                            ([type, count]) => `
                        <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:8px;">
                            <span style="font-size:14px;">🔥 ${typeLabels[type] || type}: ${count} neue Aktivitäten</span>
                        </div>
                    `,
                        )
                        .join('');
                }
            }

            if (!finalMissedHtml) {
                finalMissedHtml = `
                    <div style="background:#e8f5e9;padding:16px;border-radius:12px;margin-bottom:16px;">
                        <h4 style="margin:0 0 8px;font-size:15px;">👋 Willkommen zurück!</h4>
                        <p style="margin:0;font-size:13px;color:#636e72;">Schau dir die neuesten Rezepte an und entdecke, was du verpasst hast.</p>
                    </div>
                `;
            }

            const emailHtml = `
<body style="margin:0;padding:0;background:#fff8f2;font-family:'Inter',system-ui,sans-serif;color:#2d3436;">
    <table role="presentation" width="100%" style="background:#fff8f2;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" style="background:#ffffff;border-radius:32px;box-shadow:0 30px 60px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#e07b53,#f8b500);padding:48px 32px;text-align:center;color:#fff;font-family:'Playfair Display',Georgia,serif;">
                            <p style="margin:0;text-transform:uppercase;letter-spacing:0.2em;font-size:12px;opacity:0.8;">KitchenPace</p>
                            <h1 style="margin:12px 0 4px;font-size:28px;font-weight:700;">Dein täglicher Digest</h1>
                            <p style="margin:0;font-size:14px;">Was es heute Neues gibt</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 40px;">
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                                Hallo ${user.name || 'Kochenthusiast'},
                            </p>

                            ${
                                finalMissedHtml
                                    ? `
                            <h3 style="margin:0 0 12px;font-size:18px;">Du hast verpasst:</h3>
                            ${finalMissedHtml}
                            `
                                    : ''
                            }

                            <h3 style="margin:0 0 12px;font-size:18px;">⭐ Unsere Top-Picks für dich:</h3>
                            ${topPicksHtml}

                            <h3 style="margin:24px 0 12px;font-size:18px;">🆕 Die neuesten Rezepte:</h3>
                            ${newRecipesHtml}

                            <p style="text-align:center;margin:32px 0;">
                                <a href="${appUrl}" style="background:#e07b53;color:#fff;text-decoration:none;font-weight:600;padding:14px 32px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 10px 30px rgba(224,123,83,0.4);">
                                    Alle Rezepte entdecken
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 40px;border-top:1px solid #f0e4da;background:#faf9f7;font-size:13px;color:#7d7d7d;text-align:center;">
                            <p style="margin:0;">KitchenPace · Deine Küche, dein Tempo</p>
                            <p style="margin:8px 0 0;font-size:12px;">
                                <a href="${appUrl}/profile?unsubscribe=daily" style="color:#7d7d7d;">Digest abbestellen</a> · 
                                <a href="${appUrl}" style="color:#7d7d7d;">Webseite</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
            `;

            if (dryRun) {
                console.log(`[Scheduled] Dry run - would send daily digest to: ${user.email}`);
                successCount++;
                continue;
            }

            const success = await sendEmail({
                to: user.email,
                subject: 'KitchenPace - Dein täglicher Digest: Top-Picks & neue Rezepte',
                html: emailHtml,
            });

            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        console.log(`[Scheduled] Daily digest completed`, {
            totalRecipients: users.length,
            successCount,
            failCount,
        });

        return {
            totalRecipients: users.length,
            successCount,
            failCount,
        };
    } catch (error) {
        console.error(`[Scheduled] daily-digest job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
