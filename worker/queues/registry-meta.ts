/**
 * Lightweight metadata derived from JOB_REGISTRY — no processor imports.
 *
 * Use this module from Next.js pages / Server Components that only need
 * job names, queues, schemas, cron patterns, etc.  Importing the full
 * registry would pull in backup-processor (fs, child_process) and other
 * Node-only modules, triggering Turbopack's "whole project was traced"
 * warning.
 */

import type { WorkerOptions } from 'bullmq';

import { QueueName, type JobPayloadSchema } from './types';

// ── Worker definitions (static, no registry import) ─────────────────

const queueOptions: Partial<Record<QueueName, Omit<WorkerOptions, 'connection'>>> = {
    [QueueName.BACKUP]: {
        concurrency: 1,
        limiter: { max: 1, duration: 60000 },
    },
};

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_LIMITER = { max: 10, duration: 1000 };

export interface WorkerDefinitionSummary {
    name: string;
    queue: QueueName;
    concurrency: number;
    limiter?: WorkerOptions['limiter'];
}

/**
 * Returns worker metadata for all active queues.
 * Safe to call from Next.js Server Components (no fs/child_process).
 */
export function getWorkerDefinitions(): WorkerDefinitionSummary[] {
    const activeQueues = Object.values(QueueName);
    return activeQueues.map((queue) => {
        const opts = queueOptions[queue];
        return {
            name: queue,
            queue,
            concurrency: opts?.concurrency ?? DEFAULT_CONCURRENCY,
            limiter: opts?.limiter ?? DEFAULT_LIMITER,
        };
    });
}

// ── Scheduled job definitions (static metadata only) ────────────────

export interface ScheduledJobDefinition {
    name: string;
    queue: QueueName;
    data: Record<string, unknown>;
    schema?: JobPayloadSchema;
    options?: {
        repeat?: {
            pattern: string;
            tz?: string;
        };
        delay?: number;
    };
}

/**
 * Static job catalog — mirrors the JOB_REGISTRY shape but without
 * importing any processor modules.
 */
const JOB_CATALOG: Record<
    string,
    {
        queue: QueueName;
        defaultData: Record<string, unknown>;
        schema?: JobPayloadSchema;
        repeat?: { pattern: string; tz?: string };
    }
> = {
    'sync-recipes': {
        queue: QueueName.OPENSEARCH,
        defaultData: { batchSize: 150 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 150, min: 1, max: 1000 },
        },
        repeat: { pattern: '*/15 * * * *' },
    },
    'sync-ingredients': {
        queue: QueueName.OPENSEARCH,
        defaultData: { batchSize: 500 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 500, min: 1, max: 2000 },
        },
        repeat: { pattern: '0 */1 * * *', tz: 'Europe/Berlin' },
    },
    'sync-tags': {
        queue: QueueName.OPENSEARCH,
        defaultData: { batchSize: 500 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 500, min: 1, max: 2000 },
        },
        repeat: { pattern: '0 */1 * * *', tz: 'Europe/Berlin' },
    },
    'sync-recipe': {
        queue: QueueName.OPENSEARCH,
        defaultData: { recipeId: '' },
        schema: {
            recipeId: { type: 'string', label: 'Recipe ID', placeholder: 'cuid of the recipe' },
        },
    },
    'backfill-embeddings': {
        queue: QueueName.OPENSEARCH,
        defaultData: { batchSize: 50 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 50, min: 1, max: 500 },
        },
    },
    reindex: {
        queue: QueueName.OPENSEARCH,
        defaultData: { dropAndRecreate: false },
        schema: {
            dropAndRecreate: { type: 'boolean', label: 'Drop & Recreate Index', default: false },
        },
    },
    'recalculate-stats': {
        queue: QueueName.SCHEDULED,
        defaultData: {},
        repeat: { pattern: '0 4 * * *', tz: 'Europe/Berlin' },
    },
    'trending-recipes': {
        queue: QueueName.SCHEDULED,
        defaultData: {},
        repeat: { pattern: '0 6 * * *', tz: 'Europe/Berlin' },
    },
    'sync-contacts-notifuse': {
        queue: QueueName.SCHEDULED,
        defaultData: { batchSize: 100 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 1, max: 500 },
        },
        repeat: { pattern: '0 */6 * * *', tz: 'Europe/Berlin' },
    },
    'backup-database-hourly': {
        queue: QueueName.SCHEDULED,
        defaultData: {},
        repeat: { pattern: '0 * * * *', tz: 'Europe/Berlin' },
    },
    'backup-database-daily': {
        queue: QueueName.SCHEDULED,
        defaultData: {},
        repeat: { pattern: '0 2 * * *', tz: 'Europe/Berlin' },
    },
    'generate-og-images': {
        queue: QueueName.SCHEDULED,
        defaultData: { batchSize: 50 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 50, min: 1, max: 200 },
        },
        repeat: { pattern: '0 */2 * * *', tz: 'Europe/Berlin' },
    },
    'generate-recipe-og': {
        queue: QueueName.SCHEDULED,
        defaultData: { recipeId: '', imageKey: '' },
        schema: {
            recipeId: { type: 'string', label: 'Recipe ID', placeholder: 'cuid' },
            imageKey: { type: 'string', label: 'Image Key', placeholder: 'approved/...' },
        },
    },
    'purge-thumbnail-cache': {
        queue: QueueName.SCHEDULED,
        defaultData: { maxAgeDays: 3 },
        schema: {
            maxAgeDays: { type: 'number', label: 'Max Age (days)', default: 3, min: 1, max: 30 },
        },
        repeat: { pattern: '0 * * * *', tz: 'Europe/Berlin' },
    },
    'backfill-ingredient-plurals': {
        queue: QueueName.SCHEDULED,
        defaultData: { batchSize: 100, dryRun: false },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 1, max: 500 },
            dryRun: { type: 'boolean', label: 'Dry Run (no DB writes)', default: false },
        },
    },
    'enrich-ingredient-nutrition': {
        queue: QueueName.SCHEDULED,
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
        defaultData: { batchSize: 100 },
        schema: {
            batchSize: { type: 'number', label: 'Batch Size', default: 100, min: 10, max: 500 },
        },
        repeat: { pattern: '0 3 * * *', tz: 'Europe/Berlin' },
    },
    'database-backup': {
        queue: QueueName.BACKUP,
        defaultData: { type: 'hourly' as const },
    },
    'twitch-register-eventsub': {
        queue: QueueName.TWITCH,
        defaultData: { userId: '', twitchId: '' },
        schema: {
            userId: { type: 'string', label: 'User ID', placeholder: 'cuid' },
            twitchId: { type: 'string', label: 'Twitch ID', placeholder: 'numeric twitch ID' },
        },
    },
    'twitch-unregister-eventsub': {
        queue: QueueName.TWITCH,
        defaultData: { userId: '' },
        schema: {
            userId: { type: 'string', label: 'User ID', placeholder: 'cuid' },
        },
    },
    'twitch-stream-online': {
        queue: QueueName.TWITCH,
        defaultData: { userId: '', twitchStreamId: '', startedAt: '' },
    },
    'twitch-stream-offline': {
        queue: QueueName.TWITCH,
        defaultData: { userId: '' },
    },
    'twitch-health-check': {
        queue: QueueName.TWITCH,
        defaultData: {},
        repeat: { pattern: '0 */6 * * *', tz: 'Europe/Berlin' },
    },
};

export function getScheduledJobDefinitions(): ScheduledJobDefinition[] {
    return Object.entries(JOB_CATALOG).map(([name, def]) => ({
        name,
        queue: def.queue,
        data: def.defaultData,
        schema: def.schema,
        options: def.repeat ? { repeat: def.repeat } : undefined,
    }));
}

/** Check whether a job name exists in the catalog. */
export function isKnownJob(jobName: string): boolean {
    return jobName in JOB_CATALOG;
}
