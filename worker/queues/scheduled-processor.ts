import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Job } from 'bullmq';

import { syncContactToNotifuse } from '@app/lib/notifuse/email';
import { s3Client, BUCKET, generateOgImage, ogThumbKey, exists } from '@app/lib/s3';

import type { GenerateRecipeOgJob, GenerateOgImagesJob } from './types';

import { prisma } from './prisma';
import { getBackupQueue } from './queue';
import { BackupJob } from './types';

console.log('[DEBUG] scheduled-processor.ts module loaded');

// Trending calculation weights
const TRENDING_WEIGHTS = {
    cook: { withImage: 8, withoutImage: 6 },
    rating: 6,
    favorite: 4,
    view: 2,
    window: { publish: 30, activity: 7 },
    limit: 5,
} as const;

export async function processTrendingRecipes(
    job: Job<Record<string, unknown>>,
): Promise<{ success: boolean; trendingCount?: number }> {
    console.log(`[TrendingWorker] Starting trending-recipes job ${job.id}`);

    try {
        console.log(`[TrendingWorker] Calculating trending scores...`);

        // Step 1: Calculate trending IDs within a transaction
        const trendingIds = await prisma.$transaction(async (tx) => {
            // Calculate trending scores for recipes published in last 30 days
            const scored = await tx.$queryRaw<Array<{ id: string; score: number }>>`
                WITH recent_recipes AS (
                    SELECT r.id, r."imageKey" IS NOT NULL as has_image, r."rating", r."ratingCount"
                    FROM "Recipe" r
                    WHERE r."publishedAt" >= NOW() - INTERVAL '30 days'
                    AND r."status" = 'PUBLISHED'
                ),
                -- Cook counts in last 7 days
                cook_counts AS (
                    SELECT h."recipeId" as id, COUNT(*) as cook_count
                    FROM "UserCookHistory" h
                    WHERE h."cookedAt" >= NOW() - INTERVAL '7 days'
                    GROUP BY h."recipeId"
                ),
                -- View counts in last 7 days
                view_counts AS (
                    SELECT v."recipeId" as id, COUNT(*) as view_count
                    FROM "UserViewHistory" v
                    WHERE v."viewedAt" >= NOW() - INTERVAL '7 days'
                    GROUP BY v."recipeId"
                ),
                -- Favorite counts in last 7 days
                favorite_counts AS (
                    SELECT f."recipeId" as id, COUNT(*) as favorite_count
                    FROM "Favorite" f
                    WHERE f."createdAt" >= NOW() - INTERVAL '7 days'
                    GROUP BY f."recipeId"
                ),
                -- Scored recipes using denormalized rating field
                scored_recipes AS (
                    SELECT
                        r.id,
                        r.has_image,
                        COALESCE(cook_counts.cook_count, 0)::int as cook_count,
                        COALESCE(view_counts.view_count, 0)::int as view_count,
                        COALESCE(favorite_counts.favorite_count, 0)::int as favorite_count,
                        COALESCE(r."rating", 0)::float as rating,
                        -- Weighted scoring formula
                        (CASE
                            WHEN r.has_image THEN COALESCE(cook_counts.cook_count, 0) * ${TRENDING_WEIGHTS.cook.withImage}
                            ELSE COALESCE(cook_counts.cook_count, 0) * ${TRENDING_WEIGHTS.cook.withoutImage}
                         END) +
                        (COALESCE(r."rating", 0)::float * ${TRENDING_WEIGHTS.rating}) +
                        (COALESCE(favorite_counts.favorite_count, 0) * ${TRENDING_WEIGHTS.favorite}) +
                        (COALESCE(view_counts.view_count, 0) * ${TRENDING_WEIGHTS.view}) as score
                    FROM recent_recipes r
                    LEFT JOIN cook_counts ON r.id = cook_counts.id
                    LEFT JOIN view_counts ON r.id = view_counts.id
                    LEFT JOIN favorite_counts ON r.id = favorite_counts.id
                ),
                -- Get trending by score
                trending_by_score AS (
                    SELECT id, score
                    FROM scored_recipes
                    WHERE score > 0
                    ORDER BY score DESC
                    LIMIT ${TRENDING_WEIGHTS.limit}
                ),
                -- Get top rated as fallback (not already in trending)
                top_rated_fallback AS (
                    SELECT r.id, r."rating" as score
                    FROM "Recipe" r
                    WHERE r."publishedAt" >= NOW() - INTERVAL '30 days'
                    AND r."status" = 'PUBLISHED'
                    AND r."ratingCount" > 0
                    AND NOT EXISTS (SELECT 1 FROM trending_by_score WHERE id = r.id)
                    ORDER BY r."rating" DESC
                    LIMIT ${TRENDING_WEIGHTS.limit}
                ),
                -- Combine: trending first (priority), then fallback
                final_trending AS (
                    SELECT id, score, 1::int as priority FROM trending_by_score
                    UNION ALL
                    SELECT id, score, 2::int as priority FROM top_rated_fallback
                )
                SELECT id, score FROM final_trending ORDER BY priority ASC, score DESC LIMIT ${TRENDING_WEIGHTS.limit}
            `;

            return scored.map((r) => r.id);
        });

        console.log(`[TrendingWorker] Calculated trending recipes:`, {
            count: trendingIds.length,
            ids: trendingIds,
        });

        // Step 2: Apply changes in a transaction (no visibility gap)
        // First mark new trending, then clear old ones in a single transaction
        const result = await prisma.$transaction(async (tx) => {
            // Mark new trending recipes
            if (trendingIds.length > 0) {
                await tx.$executeRaw`
                    UPDATE "Recipe"
                    SET "isTrending" = TRUE, "updatedAt" = NOW()
                    WHERE id = ANY(${trendingIds}::text[])
                `;
            }

            // Clear recipes that are no longer trending (avoid full table scan)
            await tx.$executeRaw`
                UPDATE "Recipe"
                SET "isTrending" = FALSE, "updatedAt" = NOW()
                WHERE "isTrending" = TRUE
                  AND id != ALL(COALESCE(${trendingIds.length > 0 ? trendingIds : null}::text[], '{}'::text[]))
            `;

            // Get current trending count
            const count = await tx.$queryRaw<[{ count: bigint }]>`
                SELECT COUNT(*) as count FROM "Recipe" WHERE "isTrending" = true
            `;

            return Number(count[0]?.count ?? 0);
        });

        console.log(`[TrendingWorker] Trending recipes calculation completed`, {
            trendingCount: result,
            timestamp: new Date().toISOString(),
        });

        return { success: true, trendingCount: result };
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

export async function processBackupDatabase(
    job: Job<Record<string, unknown>>,
    type: BackupJob['type'],
): Promise<{ success: boolean; jobId?: string }> {
    console.log(`[BackupScheduler] Starting ${type} backup job ${job.id}`);

    try {
        const priority = type === 'hourly' ? 1 : 2;
        const addedJob = await getBackupQueue().add('database-backup', { type }, { priority });

        console.log(`[BackupScheduler] ${type} backup queued: ${addedJob.id}`);
        return { success: true, jobId: addedJob.id };
    } catch (error) {
        console.error(`[BackupScheduler] ${type} backup job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function processCachePurge(
    job: Job<{ maxAgeDays?: number }>,
): Promise<{ success: boolean; scannedCount: number; deletedCount: number }> {
    console.log(`[CachePurge] Starting purge-thumbnail-cache job ${job.id}`);

    const maxAgeDays = job.data.maxAgeDays ?? 3;
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    try {
        const staleKeys: { Key: string }[] = [];
        let continuationToken: string | undefined;
        let scannedCount = 0;

        // Paginate through all thumbs/ objects
        do {
            const response = await s3Client.send(
                new ListObjectsV2Command({
                    Bucket: BUCKET,
                    Prefix: 'thumbs/',
                    ContinuationToken: continuationToken,
                }),
            );

            for (const obj of response.Contents ?? []) {
                scannedCount++;
                if (obj.Key && obj.LastModified && obj.LastModified < cutoff) {
                    staleKeys.push({ Key: obj.Key });
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        console.log(
            `[CachePurge] Found ${staleKeys.length} files older than ${maxAgeDays} days out of ${scannedCount} scanned`,
        );

        // Batch delete (max 1000 per request)
        let deletedCount = 0;
        for (let i = 0; i < staleKeys.length; i += 1000) {
            const batch = staleKeys.slice(i, i + 1000);
            await s3Client.send(
                new DeleteObjectsCommand({
                    Bucket: BUCKET,
                    Delete: { Objects: batch, Quiet: true },
                }),
            );
            deletedCount += batch.length;
        }

        console.log(`[CachePurge] Deleted ${deletedCount} cache files`, {
            scannedCount,
            deletedCount,
            maxAgeDays,
            jobId: job.id,
        });

        return { success: true, scannedCount, deletedCount };
    } catch (error) {
        console.error(`[CachePurge] purge-thumbnail-cache job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}

// ---------------------------------------------------------------------------
// OG image generation
// ---------------------------------------------------------------------------

/**
 * Generate OG image (1200x630 JPEG) for a single recipe.
 * Triggered on-demand when a recipe image is approved.
 */
export async function processGenerateRecipeOg(
    job: Job<GenerateRecipeOgJob>,
): Promise<{ success: boolean; key?: string; skipped?: boolean }> {
    const { recipeId, imageKey } = job.data;
    console.log(`[OgWorker] Generating OG image for recipe ${recipeId}, key: ${imageKey}`);

    try {
        const tKey = ogThumbKey(imageKey);

        // Skip if already generated
        if (await exists(tKey)) {
            console.log(`[OgWorker] OG already exists for ${recipeId}, skipping`);
            return { success: true, skipped: true };
        }

        const key = await generateOgImage(imageKey);
        console.log(`[OgWorker] Generated OG for recipe ${recipeId}: ${key}`);
        return { success: true, key };
    } catch (error) {
        console.error(`[OgWorker] generate-recipe-og job ${job.id} failed`, {
            recipeId,
            imageKey,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * Scheduled job: find all published recipes with an imageKey but missing OG cache,
 * and enqueue individual generate-recipe-og jobs for each.
 */
export async function processGenerateOgImages(
    job: Job<GenerateOgImagesJob>,
): Promise<{ success: boolean; enqueued: number }> {
    const batchSize = job.data.batchSize ?? 50;
    console.log(`[OgWorker] Scanning for recipes missing OG images (batch: ${batchSize})`);

    try {
        const recipes = await prisma.recipe.findMany({
            where: {
                status: 'PUBLISHED',
                imageKey: { not: null },
            },
            select: { id: true, imageKey: true },
            take: batchSize,
        });

        const { getScheduledQueue } = await import('./queue');
        const queue = getScheduledQueue();
        let enqueued = 0;

        for (const recipe of recipes) {
            if (!recipe.imageKey) continue;

            const tKey = ogThumbKey(recipe.imageKey);
            if (await exists(tKey)) continue; // already cached

            await queue.add(
                'generate-recipe-og',
                { recipeId: recipe.id, imageKey: recipe.imageKey },
                { priority: 1 },
            );
            enqueued++;
        }

        console.log(`[OgWorker] Enqueued ${enqueued} OG generation jobs`);
        return { success: true, enqueued };
    } catch (error) {
        console.error(`[OgWorker] generate-og-images job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
