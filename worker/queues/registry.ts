import type { Job } from 'bullmq';

import { runDatabaseBackup } from './backup-processor';
import { processPollOpenAIBatches } from './batch-poll';
import { processBringSync, processBringSyncConnection } from './bring-sync-processor';
import { processBackfillIngredientEnrichment } from './enrichment-backfill';
import { processBackfillIngredientIcons } from './icon-backfill';
import { processReconcileMealReminders, processSendMealReminder } from './meal-reminder-processor';
import { processEnrichIngredientNutrition } from './nutrition-processor';
import {
    processBackfillEmbeddings,
    processReindex,
    processSyncIngredients,
    processSyncRecipes,
    processSyncRecipeToOpenSearch,
    processSyncTags,
} from './opensearch-processor';
import { processBookAssumedCooked } from './pantry-booking-processor';
import { JOB_CATALOG, type JobMeta, type JobName } from './registry-meta';
import {
    processTrendingRecipes,
    processSyncContactsNotifuse,
    processBackupDatabase,
    processCachePurge,
    processGenerateRecipeOg,
    processGenerateOgImages,
    processBackfillIngredientPlurals,
    processRecalculateStats,
} from './scheduled-processor';
import { processBackfillIngredientShelfLife } from './shelf-life-processor';
import { processComputeTasteProfiles } from './taste-processor';
import { processClusterRecipeThemes } from './theme-cluster-processor';
import {
    processRegisterEventSub,
    processUnregisterEventSub,
    processStreamOnline,
    processStreamOffline,
    processHealthCheck,
} from './twitch-processor';

// ── Central Job Registry ────────────────────────────────────────────
//
// The metadata (queue, default data, admin form, cron) lives only in JOB_CATALOG
// (registry-meta.ts); this module adds the processor of each job. Adding a job = one
// catalog entry + one processor here; a missing or extra processor is a type error.
//
// Derived from it: worker dispatch (worker.ts), scheduler cron (scheduler.ts), admin UI.

 
type Processor = (job: Job<any>) => Promise<unknown>;

export interface JobDefinition extends JobMeta {
    processor: Processor;
}

/** Processors in registry order (the order workers and schedules are set up in). */
const PROCESSORS: Record<JobName, Processor> = {
    'sync-recipes': processSyncRecipes,
    'sync-ingredients': processSyncIngredients,
    'sync-tags': processSyncTags,
    'sync-recipe': processSyncRecipeToOpenSearch,
    'backfill-embeddings': processBackfillEmbeddings,
    reindex: processReindex,
    'recalculate-stats': processRecalculateStats,
    'trending-recipes': processTrendingRecipes,
    'sync-contacts-notifuse': processSyncContactsNotifuse,
    'backup-database-hourly': (job: Job) => processBackupDatabase(job, 'hourly'),
    'backup-database-daily': (job: Job) => processBackupDatabase(job, 'daily'),
    'generate-og-images': processGenerateOgImages,
    'generate-recipe-og': processGenerateRecipeOg,
    'purge-thumbnail-cache': processCachePurge,
    'backfill-ingredient-plurals': processBackfillIngredientPlurals,
    'enrich-ingredient-nutrition': processEnrichIngredientNutrition,
    'backfill-ingredient-enrichment': processBackfillIngredientEnrichment,
    'backfill-ingredient-icons': processBackfillIngredientIcons,
    'poll-openai-batches': processPollOpenAIBatches,
    'backfill-ingredient-shelf-life': processBackfillIngredientShelfLife,
    'compute-taste-profiles': processComputeTasteProfiles,
    'cluster-recipe-themes': (job: Job) => processClusterRecipeThemes(job),
    'book-assumed-cooked': (job: Job) => processBookAssumedCooked(job),
    'reconcile-meal-reminders': (job: Job) => processReconcileMealReminders(job),
    'send-meal-reminder': (job: Job) => processSendMealReminder(job),
    'bring-sync': (job: Job) => processBringSync(job),
    'bring-sync-connection': (job: Job) => processBringSyncConnection(job),
    'database-backup': (job: Job) => runDatabaseBackup(job.data.type),
    'twitch-register-eventsub': processRegisterEventSub,
    'twitch-unregister-eventsub': processUnregisterEventSub,
    'twitch-stream-online': processStreamOnline,
    'twitch-stream-offline': processStreamOffline,
    'twitch-health-check': processHealthCheck,
};

export const JOB_REGISTRY = Object.fromEntries(
    (Object.keys(PROCESSORS) as JobName[]).map((name) => [
        name,
        { ...JOB_CATALOG[name], processor: PROCESSORS[name] },
    ]),
) as Record<JobName, JobDefinition>;
