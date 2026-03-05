import { Job } from 'bullmq';

import { syncContactToNotifuse } from '@app/lib/notifuse/email';

import { prisma } from './prisma';

console.log('[DEBUG] scheduled-processor.ts module loaded');

export async function processTrendingRecipes(
    job: Job<Record<string, unknown>>,
): Promise<{ success: boolean; updatedCount?: number }> {
    console.log(`[TrendingWorker] Starting trending-recipes job ${job.id}`);

    try {
        console.log(`[TrendingWorker] Calculating trending scores...`);
        const sql = `
            BEGIN;

            -- Reset all trending status
            UPDATE "Recipe" SET "isTrending" = FALSE;

            -- Calculate trending scores for recipes published in last 30 days
            WITH recent_recipes AS (
                SELECT r.id, r."imageKey" IS NOT NULL as has_image
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
                    -- Weighted scoring formula (no minimum cook threshold)
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
            ),
            -- Get trending by score
            trending_by_score AS (
                SELECT id, score, 1 as priority
                FROM scored_recipes
                ORDER BY score DESC
                LIMIT 5
            ),
            -- Get top rated as fallback
            top_rated_fallback AS (
                SELECT r.id, 0 as score, 2 as priority
                FROM "Recipe" r
                WHERE r."publishedAt" >= NOW() - INTERVAL '30 days'
                AND r."status" = 'PUBLISHED'
                AND r."ratingCount" > 0
                AND NOT EXISTS (SELECT 1 FROM trending_by_score WHERE id = r.id)
                ORDER BY r."rating" DESC
                LIMIT 5
            ),
            -- Combine trending and fallback
            final_trending AS (
                SELECT id, priority FROM trending_by_score
                UNION ALL
                SELECT id, priority FROM top_rated_fallback
            )
            -- Update top 5 trending recipes
            UPDATE "Recipe" r
            SET "isTrending" = TRUE
            FROM (
                SELECT id FROM final_trending ORDER BY priority ASC, score DESC LIMIT 5
            ) final
            WHERE r.id = final.id;

            COMMIT;
        `;

        await prisma.$executeRawUnsafe(sql);

        const result = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM "Recipe" WHERE "isTrending" = true
        `;
        const updatedCount = Number(result[0]?.count ?? 0);

        console.log(`[TrendingWorker] Trending recipes calculation completed`, {
            updatedCount,
            timestamp: new Date().toISOString(),
        });

        return { success: true, updatedCount };
    } catch (error) {
        console.error(`[TrendingWorker] trending-recipes job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}

export async function processSyncContactsNotifuse(
    job: Job<Record<string, unknown>>,
): Promise<{ success: boolean; syncedCount?: number }> {
    console.log(`[SyncContactsWorker] Starting sync-contacts-notifuse job ${job.id}`);

    const batchSize = (job.data.batchSize as number) || 100;

    try {
        const users = await prisma.user.findMany({
            where: {
                email: {
                    not: null,
                },
            },
            include: {
                profile: true,
            },
            take: batchSize,
        });

        console.log(`[SyncContactsWorker] Found ${users.length} users to sync`);

        if (users.length === 0) {
            console.log('[SyncContactsWorker] No users to sync');
            return { success: true, syncedCount: 0 };
        }

        let syncedCount = 0;
        let failedCount = 0;

        for (const user of users) {
            if (!user.email) continue;

            try {
                console.log(`[SyncContactsWorker] Syncing contact: ${user.email} (${user.id})`);
                await syncContactToNotifuse({
                    email: user.email,
                    externalId: user.id,
                    nickname: user.profile?.nickname,
                });
                syncedCount++;
                console.log(`[SyncContactsWorker] Successfully synced: ${user.email}`);
            } catch (error) {
                console.error(`[SyncContactsWorker] Failed to sync contact ${user.email}`, {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
                failedCount++;
            }
        }

        console.log(`[SyncContactsWorker] Synced ${syncedCount} contacts, ${failedCount} failed`);

        return { success: true, syncedCount };
    } catch (error) {
        console.error(`[SyncContactsWorker] sync-contacts-notifuse job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}
