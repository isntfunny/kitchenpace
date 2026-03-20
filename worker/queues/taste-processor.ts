import { Job } from 'bullmq';

import { EMBEDDING_DIMENSIONS } from '@shared/opensearch/client';

import { prisma } from './prisma';
import type { ComputeTasteProfilesJob } from './types';

console.log('[DEBUG] taste-processor.ts module loaded');

// ── Taste weights (effort-based — higher effort = higher weight) ────────────
const TASTE_WEIGHTS = {
    cooked: 1.0,
    rating5: 0.9,
    rating4: 0.6,
    favorite: 0.5,
    view: 0.2,
    rating2: -0.5,
    rating1: -1.0,
} as const;

// ── Main processor ──────────────────────────────────────────────────────────

export async function processComputeTasteProfiles(
    job: Job<ComputeTasteProfilesJob>,
): Promise<{ success: boolean; processed: number; skipped: number; errors: number }> {
    const batchSize = job.data.batchSize ?? 100;
    let cursor: string | undefined;
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let total = 0;

    console.log(`[TasteWorker] Starting compute-taste-profiles job ${job.id} (batch ${batchSize})`);

    while (true) {
        const profiles = await prisma.profile.findMany({
            select: { id: true, userId: true, tasteUpdatedAt: true },
            orderBy: { id: 'asc' },
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        if (profiles.length === 0) break;
        cursor = profiles[profiles.length - 1].id;
        total += profiles.length;

        for (const profile of profiles) {
            try {
                const updated = await computeForUser(profile.userId, profile.tasteUpdatedAt);
                if (updated) processed++;
                else skipped++;
            } catch (err) {
                console.error(`[TasteWorker] Failed for user ${profile.userId}`, {
                    error: err instanceof Error ? err.message : String(err),
                });
                errors++;
            }
        }

        await job.updateProgress(Math.round(((processed + skipped + errors) / total) * 100));
    }

    console.log(
        `[TasteWorker] Done — processed: ${processed}, skipped: ${skipped}, errors: ${errors}`,
    );
    return { success: true, processed, skipped, errors };
}

// ── Per-user computation ────────────────────────────────────────────────────

async function computeForUser(userId: string, lastUpdated: Date | null): Promise<boolean> {
    // 1. Skip if no new interactions since last taste update
    const since = lastUpdated ?? new Date(0);
    if (!(await hasInteractionsSince(userId, since))) return false;

    // 2. Gather all interaction signals
    const [favorites, cooks, ratings, views] = await Promise.all([
        prisma.favorite.findMany({
            where: { userId },
            select: { recipeId: true },
        }),
        prisma.userCookHistory.findMany({
            where: { userId },
            select: { recipeId: true },
            distinct: ['recipeId'],
        }),
        prisma.userRating.findMany({
            where: { userId },
            select: { recipeId: true, rating: true },
        }),
        prisma.userViewHistory.findMany({
            where: { userId },
            select: { recipeId: true },
        }),
    ]);

    // 3. Build weighted recipe map (additive — a favorited + cooked recipe gets 1.5)
    const weightMap = new Map<string, number>();
    const addWeight = (recipeId: string, w: number) => {
        weightMap.set(recipeId, (weightMap.get(recipeId) ?? 0) + w);
    };

    for (const c of cooks) addWeight(c.recipeId, TASTE_WEIGHTS.cooked);
    for (const r of ratings) {
        if (r.rating === 5) addWeight(r.recipeId, TASTE_WEIGHTS.rating5);
        else if (r.rating === 4) addWeight(r.recipeId, TASTE_WEIGHTS.rating4);
        else if (r.rating === 2) addWeight(r.recipeId, TASTE_WEIGHTS.rating2);
        else if (r.rating === 1) addWeight(r.recipeId, TASTE_WEIGHTS.rating1);
        // rating 3 = neutral, no contribution
    }
    for (const f of favorites) addWeight(f.recipeId, TASTE_WEIGHTS.favorite);
    for (const v of views) addWeight(v.recipeId, TASTE_WEIGHTS.view);

    if (weightMap.size === 0) return false;

    // 4. Fetch cached embeddings from PostgreSQL (no OpenAI calls)
    const recipeIds = Array.from(weightMap.keys());
    const embeddings = await prisma.recipeEmbedding.findMany({
        where: { recipeId: { in: recipeIds } },
        select: { recipeId: true, embedding: true },
    });

    if (embeddings.length === 0) return false;

    // 5. Weighted average of 3072-dim vectors
    const result = new Float64Array(EMBEDDING_DIMENSIONS);
    let totalAbsWeight = 0;

    for (const emb of embeddings) {
        const w = weightMap.get(emb.recipeId) ?? 0;
        if (w === 0) continue;
        const vec = emb.embedding as number[];
        for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
            result[i] += vec[i] * w;
        }
        totalAbsWeight += Math.abs(w);
    }

    if (totalAbsWeight === 0) return false;

    // Divide by total absolute weight
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
        result[i] /= totalAbsWeight;
    }

    // 6. L2-normalize to unit vector (dot product = cosine similarity)
    const magnitude = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
        for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
            result[i] /= magnitude;
        }
    }

    // 7. Persist to Profile
    await prisma.profile.update({
        where: { userId },
        data: {
            tasteEmbedding: Array.from(result),
            tasteUpdatedAt: new Date(),
        },
    });

    return true;
}

// ── Skip check (short-circuit on first hit) ─────────────────────────────────

async function hasInteractionsSince(userId: string, since: Date): Promise<boolean> {
    const fav = await prisma.favorite.findFirst({
        where: { userId, createdAt: { gt: since } },
        select: { id: true },
    });
    if (fav) return true;

    const cook = await prisma.userCookHistory.findFirst({
        where: { userId, cookedAt: { gt: since } },
        select: { id: true },
    });
    if (cook) return true;

    const rating = await prisma.userRating.findFirst({
        where: { userId, updatedAt: { gt: since } },
        select: { id: true },
    });
    if (rating) return true;

    const view = await prisma.userViewHistory.findFirst({
        where: { userId, viewedAt: { gt: since } },
        select: { id: true },
    });
    if (view) return true;

    return false;
}
