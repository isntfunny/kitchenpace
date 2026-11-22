// Switch for automatic OpenAI calls (KUC-128). Beta must not cause running
// costs: with AI_AUTOMATION=off no scheduled AI job is registered, new
// ingredients are not enriched, saved recipes get no new embedding and the
// semantic search only uses cached query embeddings. Jobs an admin starts by
// hand in /admin/worker and explicit user actions (URL import) still call
// OpenAI.

/** Scheduled jobs that (directly or through a re-enqueued batch job) call OpenAI */
export const AI_SCHEDULED_JOBS: ReadonlySet<string> = new Set([
    'backfill-ingredient-enrichment',
    'poll-openai-batches',
]);

/** False only for AI_AUTOMATION=off (case and spaces ignored); on by default. */
export function isAiAutomationEnabled(env: Record<string, string | undefined> = process.env) {
    return (env.AI_AUTOMATION ?? '').trim().toLowerCase() !== 'off';
}
