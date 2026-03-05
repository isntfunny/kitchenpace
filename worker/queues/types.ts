export enum QueueName {
    OPENSEARCH = 'opensearch',
    SCHEDULED = 'scheduled',
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

export type ScheduledJob =
    | { name: 'opensearch-sync'; data: SyncOpenSearchJob }
    | { name: 'sync-ingredients'; data: SyncIngredientsJob }
    | { name: 'trending-recipes'; data: Record<string, unknown> };

export type AllJob = OpenSearchJob | ScheduledJob;
