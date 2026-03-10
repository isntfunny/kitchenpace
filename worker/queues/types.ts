export enum QueueName {
    OPENSEARCH = 'opensearch',
    SCHEDULED = 'scheduled',
    BACKUP = 'backup',
}

export enum JobPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 4,
}

export interface SyncOpenSearchJob {
    batchSize?: number;
}

export interface SyncRecipeToOpenSearchJob {
    recipeId: string;
}

export interface SyncIngredientsJob {
    batchSize?: number;
}

export type OpenSearchJob =
    | { name: 'sync-opensearch'; data: SyncOpenSearchJob }
    | { name: 'sync-recipe'; data: SyncRecipeToOpenSearchJob }
    | { name: 'sync-ingredients'; data: SyncIngredientsJob };

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

export type ScheduledJob =
    | { name: 'opensearch-sync'; data: SyncOpenSearchJob }
    | { name: 'sync-ingredients'; data: SyncIngredientsJob }
    | { name: 'trending-recipes'; data: Record<string, unknown> }
    | { name: 'backup-database-hourly'; data: Record<string, unknown> }
    | { name: 'backup-database-daily'; data: Record<string, unknown> }
    | { name: 'generate-recipe-og'; data: GenerateRecipeOgJob }
    | { name: 'generate-og-images'; data: GenerateOgImagesJob };

export type AllJob = OpenSearchJob | ScheduledJob;

// Job payload schema for admin form generation
export type JobPayloadField =
    | { type: 'number'; label: string; default?: number; min?: number; max?: number }
    | { type: 'string'; label: string; default?: string; placeholder?: string }
    | { type: 'boolean'; label: string; default?: boolean };

export type JobPayloadSchema = Record<string, JobPayloadField>;
