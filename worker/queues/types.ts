export enum QueueName {
    OPENSEARCH = 'opensearch',
    SCHEDULED = 'scheduled',
    BACKUP = 'backup',
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

export type OpenSearchJob =
    | { name: 'sync-recipes'; data: SyncRecipesJob }
    | { name: 'sync-recipe'; data: SyncRecipeToOpenSearchJob }
    | { name: 'sync-ingredients'; data: SyncIngredientsJob }
    | { name: 'sync-tags'; data: SyncTagsJob };

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

export type ScheduledJob =
    | { name: 'sync-recipes'; data: SyncRecipesJob }
    | { name: 'sync-ingredients'; data: SyncIngredientsJob }
    | { name: 'sync-tags'; data: SyncTagsJob }
    | { name: 'trending-recipes'; data: Record<string, unknown> }
    | { name: 'backup-database-hourly'; data: Record<string, unknown> }
    | { name: 'backup-database-daily'; data: Record<string, unknown> }
    | { name: 'generate-recipe-og'; data: GenerateRecipeOgJob }
    | { name: 'generate-og-images'; data: GenerateOgImagesJob }
    | { name: 'backfill-ingredient-plurals'; data: BackfillIngredientPluralsJob };

// Job payload schema for admin form generation
export type JobPayloadField =
    | { type: 'number'; label: string; default?: number; min?: number; max?: number }
    | { type: 'string'; label: string; default?: string; placeholder?: string }
    | { type: 'boolean'; label: string; default?: boolean };

export type JobPayloadSchema = Record<string, JobPayloadField>;
