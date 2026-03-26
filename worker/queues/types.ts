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
    batchSize?: number;
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
    batchSize?: number;
    dryRun?: boolean;
    includeNeedsReview?: boolean;
}

export interface ComputeTasteProfilesJob {
    batchSize?: number;
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
