import type { Job } from 'bullmq';

import { runDatabaseBackup } from './backup-processor';
import { processEnrichIngredientNutrition } from './nutrition-processor';
import {
    processBackfillEmbeddings,
    processReindex,
    processSyncIngredients,
    processSyncRecipes,
    processSyncRecipeToOpenSearch,
    processSyncTags,
} from './opensearch-processor';
import {
    processTrendingRecipes,
    processSyncContactsNotifuse,
    processBackupDatabase,
    processCachePurge,
    processGenerateRecipeOg,
    processGenerateOgImages,
    processBackfillIngredientPlurals,
    processBackfillIngredientEnrichment,
    processRecalculateStats,
} from './scheduled-processor';
import { processComputeTasteProfiles } from './taste-processor';
import {
    processRegisterEventSub,
    processUnregisterEventSub,
    processStreamOnline,
    processStreamOffline,
    processHealthCheck,
} from './twitch-processor';
import { QueueName, type JobPayloadSchema } from './types';

// ── Job definition shape ────────────────────────────────────────────

interface JobDefinition<TData = Record<string, unknown>> {
    /** Which BullMQ queue this job runs on */
    queue: QueueName;
    /** The processor function */
    processor: (job: Job<TData>) => Promise<unknown>;
    /** Default data when triggered from admin UI or scheduler */
    defaultData: TData;
    /** Optional admin UI form schema for payload fields */
    schema?: JobPayloadSchema;
    /** Cron schedule (if repeatable) */
    repeat?: {
        pattern: string;
        tz?: string;
    };
}

// Helper to preserve literal key types while allowing typed definitions
function defineJobs<T extends Record<string, JobDefinition<any>>>(jobs: T): T {
    return jobs;
}

// ── Central Job Registry ────────────────────────────────────────────
//
// This is the SINGLE SOURCE OF TRUTH for all BullMQ jobs.
// Adding a new job = adding one entry here + writing the processor function.
//
// Everything else is auto-derived:
//   - Worker dispatch (worker.ts)
//   - Scheduler cron (scheduler.ts)
//   - Admin UI cards, form fields, cron badges (page.tsx)
//   - Type safety on job names (JobName type)

export const JOB_REGISTRY = defineJobs({
    // ── OpenSearch queue ────────────────────────────────────────────

    'sync-recipes': {
        queue: QueueName.OPENSEARCH,
        processor: processSyncRecipes,
        defaultData: { batchSize: 150 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 150, min: 1, max: 1000 },
        },
        repeat: { pattern: '*/15 * * * *' },
    },

    'sync-ingredients': {
        queue: QueueName.OPENSEARCH,
        processor: processSyncIngredients,
        defaultData: { batchSize: 500 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 500, min: 1, max: 2000 },
        },
        repeat: { pattern: '0 */1 * * *', tz: 'Europe/Berlin' },
    },

    'sync-tags': {
        queue: QueueName.OPENSEARCH,
        processor: processSyncTags,
        defaultData: { batchSize: 500 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 500, min: 1, max: 2000 },
        },
        repeat: { pattern: '0 */1 * * *', tz: 'Europe/Berlin' },
    },

    'sync-recipe': {
        queue: QueueName.OPENSEARCH,
        processor: processSyncRecipeToOpenSearch,
        defaultData: { recipeId: '' },
        schema: {
            recipeId: { type: 'string', label: 'Recipe ID', placeholder: 'cuid of the recipe' },
        },
    },

    'backfill-embeddings': {
        queue: QueueName.OPENSEARCH,
        processor: processBackfillEmbeddings,
        defaultData: { batchSize: 50 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 50, min: 1, max: 500 },
        },
    },

    reindex: {
        queue: QueueName.OPENSEARCH,
        processor: processReindex,
        defaultData: { dropAndRecreate: false },
        schema: {
            dropAndRecreate: { type: 'boolean', label: 'Drop & Recreate Index', default: false },
        },
    },

    // ── Scheduled queue ─────────────────────────────────────────────

    'recalculate-stats': {
        queue: QueueName.SCHEDULED,
        processor: processRecalculateStats,
        defaultData: {},
        repeat: { pattern: '0 4 * * *', tz: 'Europe/Berlin' },
    },

    'trending-recipes': {
        queue: QueueName.SCHEDULED,
        processor: processTrendingRecipes,
        defaultData: {},
        repeat: { pattern: '0 6 * * *', tz: 'Europe/Berlin' },
    },

    'sync-contacts-notifuse': {
        queue: QueueName.SCHEDULED,
        processor: processSyncContactsNotifuse,
        defaultData: { batchSize: 100 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 1, max: 500 },
        },
        repeat: { pattern: '0 */6 * * *', tz: 'Europe/Berlin' },
    },

    'backup-database-hourly': {
        queue: QueueName.SCHEDULED,
        processor: (job) => processBackupDatabase(job, 'hourly'),
        defaultData: {},
        repeat: { pattern: '0 * * * *', tz: 'Europe/Berlin' },
    },

    'backup-database-daily': {
        queue: QueueName.SCHEDULED,
        processor: (job) => processBackupDatabase(job, 'daily'),
        defaultData: {},
        repeat: { pattern: '0 2 * * *', tz: 'Europe/Berlin' },
    },

    'generate-og-images': {
        queue: QueueName.SCHEDULED,
        processor: processGenerateOgImages,
        defaultData: { batchSize: 50 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 50, min: 1, max: 200 },
        },
        repeat: { pattern: '0 */2 * * *', tz: 'Europe/Berlin' },
    },

    'generate-recipe-og': {
        queue: QueueName.SCHEDULED,
        processor: processGenerateRecipeOg,
        defaultData: { recipeId: '', imageKey: '' },
        schema: {
            recipeId: { type: 'string', label: 'Recipe ID', placeholder: 'cuid' },
            imageKey: { type: 'string', label: 'Image Key', placeholder: 'approved/...' },
        },
    },

    'purge-thumbnail-cache': {
        queue: QueueName.SCHEDULED,
        processor: processCachePurge,
        defaultData: { maxAgeDays: 3 },
        schema: {
            maxAgeDays: { type: 'number', label: 'Max Age (days)', default: 3, min: 1, max: 30 },
        },
        repeat: { pattern: '0 * * * *', tz: 'Europe/Berlin' },
    },

    'backfill-ingredient-plurals': {
        queue: QueueName.SCHEDULED,
        processor: processBackfillIngredientPlurals,
        defaultData: { batchSize: 100, dryRun: false },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 1, max: 500 },
            dryRun: { type: 'boolean', label: 'Dry Run (no DB writes)', default: false },
        },
    },

    'enrich-ingredient-nutrition': {
        queue: QueueName.SCHEDULED,
        processor: processEnrichIngredientNutrition,
        defaultData: { ingredientId: '' },
        schema: {
            ingredientId: {
                type: 'string',
                label: 'Ingredient ID',
                placeholder: 'cuid of the ingredient',
            },
        },
    },

    'backfill-ingredient-enrichment': {
        queue: QueueName.SCHEDULED,
        processor: processBackfillIngredientEnrichment,
        defaultData: { batchSize: 100, dryRun: false, includeNeedsReview: false },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 1, max: 500 },
            dryRun: { type: 'boolean', label: 'Dry Run (no DB writes)', default: false },
            includeNeedsReview: {
                type: 'boolean',
                label: 'Include needsReview (re-enrich even if data exists)',
                default: false,
            },
        },
    },

    'compute-taste-profiles': {
        queue: QueueName.SCHEDULED,
        processor: processComputeTasteProfiles,
        defaultData: { batchSize: 100 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 10, max: 500 },
        },
        repeat: { pattern: '0 3 * * *', tz: 'Europe/Berlin' },
    },

    // ── Backup queue ────────────────────────────────────────────────

    'database-backup': {
        queue: QueueName.BACKUP,
        processor: (job) => runDatabaseBackup(job.data.type),
        defaultData: { type: 'hourly' as const },
    },

    // ── Twitch queue ────────────────────────────────────────────────

    'twitch-register-eventsub': {
        queue: QueueName.TWITCH,
        processor: processRegisterEventSub,
        defaultData: { userId: '', twitchId: '' },
        schema: {
            userId: { type: 'string', label: 'User ID', placeholder: 'cuid' },
            twitchId: { type: 'string', label: 'Twitch ID', placeholder: 'numeric twitch ID' },
        },
    },

    'twitch-unregister-eventsub': {
        queue: QueueName.TWITCH,
        processor: processUnregisterEventSub,
        defaultData: { userId: '' },
        schema: {
            userId: { type: 'string', label: 'User ID', placeholder: 'cuid' },
        },
    },

    'twitch-stream-online': {
        queue: QueueName.TWITCH,
        processor: processStreamOnline,
        defaultData: { userId: '', twitchStreamId: '', startedAt: '' },
    },

    'twitch-stream-offline': {
        queue: QueueName.TWITCH,
        processor: processStreamOffline,
        defaultData: { userId: '' },
    },

    'twitch-health-check': {
        queue: QueueName.TWITCH,
        processor: processHealthCheck,
        defaultData: {},
        repeat: { pattern: '0 */6 * * *', tz: 'Europe/Berlin' },
    },
});

// ── Derived types ───────────────────────────────────────────────────

/** Union of all valid job name literals */
export type JobName = keyof typeof JOB_REGISTRY;
