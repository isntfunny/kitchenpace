export enum QueueName {
    OPENSEARCH = 'opensearch',
    SCHEDULED = 'scheduled',
    BACKUP = 'backup',
    TWITCH = 'twitch',
}

export interface SyncRecipesJob {
    batchSize?: number;
}

export interface SyncRecipeToOpenSearchJob {
    recipeId: string;
}

export interface SyncIngredientsJob {
    batchSize?: number;
}

export interface SyncTagsJob {
    batchSize?: number;
}

export interface BackfillEmbeddingsJob {
    /** Recipes per page when copying stored embeddings into OpenSearch */
    batchSize?: number;
    /** Poll interval while the batch runs (0 = no automatic polling) */
    pollMinutes?: number;
    /** Forget the saved batch and start over */
    reset?: boolean;
}

export interface BackupJob {
    type: 'hourly' | 'daily';
}

export interface GenerateRecipeOgJob {
    recipeId: string;
    imageKey: string;
}

export interface GenerateOgImagesJob {
    batchSize?: number;
}

export interface BackfillIngredientPluralsJob {
    batchSize?: number;
    dryRun?: boolean;
}

export interface EnrichIngredientNutritionJob {
    ingredientId: string;
}

export interface BackfillIngredientEnrichmentJob {
    /** Max ingredients per new batch */
    batchSize?: number;
    /** Only list what would be submitted; never imports */
    dryRun?: boolean;
    includeNeedsReview?: boolean;
    /** Poll interval while the batch runs (0 = no automatic polling) */
    pollMinutes?: number;
    /** Forget the saved batch and start over */
    reset?: boolean;
}

export interface BackfillIngredientShelfLifeJob {
    /** Import into the database; false = dry run report only */
    write?: boolean;
    /** Max ingredients for a new batch (0 = all not yet assessed) */
    limit?: number;
    /** Ingredients per request */
    chunkSize?: number;
    /** Poll interval while the batch runs (0 = no automatic polling) */
    pollMinutes?: number;
    /** Forget the saved batch and start over */
    reset?: boolean;
}

export interface ComputeTasteProfilesJob {
    batchSize?: number;
}

export interface ClusterRecipeThemesJob {
    /** Number of clusters (0 = automatic) */
    clusters?: number;
    /** Seed of the k-means initialisation (fixed seed = reproducible runs) */
    seed?: number;
    /** Min. centroid similarity to continue a cluster of the previous run */
    minSimilarity?: number;
    /** Clusters below this size are not eligible for release */
    minClusterSize?: number;
    /** Compute and report only, persist nothing */
    dryRun?: boolean;
}

// ── Twitch jobs ──────────────────────────────────────────────────────

export interface TwitchRegisterEventSubJob {
    userId: string;
    twitchId: string;
}

export interface TwitchUnregisterEventSubJob {
    userId: string;
    eventSubOnlineId?: string;
    eventSubOfflineId?: string;
}

export interface TwitchStreamOnlineJob {
    userId: string;
    twitchStreamId: string;
    startedAt: string;
}

export interface TwitchStreamOfflineJob {
    userId: string;
}

export type TwitchHealthCheckJob = Record<string, unknown>;

// Job payload schema for admin form generation
export type JobPayloadField =
    | { type: 'number'; label: string; default?: number; min?: number; max?: number }
    | { type: 'string'; label: string; default?: string; placeholder?: string }
    | { type: 'boolean'; label: string; default?: boolean };

export type JobPayloadSchema = Record<string, JobPayloadField>;
