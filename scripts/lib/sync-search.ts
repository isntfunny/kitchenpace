/**
 * Search index update for scripts that write recipes directly (sync-recipe job
 * through the worker queue). Without Redis the queue retries forever
 * (maxRetriesPerRequest: null), so every call is bounded by a timeout and the
 * connections are closed afterwards in any case: the script always ends.
 */

/** The search sync must not hang the script when Redis is unreachable. */
const QUEUE_TIMEOUT_MS = 10_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, what: string): Promise<T> =>
    Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(
                () => reject(new Error(`${what}: Zeitüberschreitung nach ${ms} ms`)),
                ms,
            ).unref();
        }),
    ]);

export async function syncSearch(recipeIds: string[]) {
    let close: () => Promise<unknown> = async () => {};
    try {
        const { addSyncRecipeJob } = await import('../../worker/queues');
        const { closeAllQueues, getQueueForName } = await import('../../worker/queues/queue');
        const { disconnectRedis, getRedis } = await import('../../worker/queues/connection');
        const { QueueName } = await import('../../worker/queues/types');
        // errors of an abandoned connection must not crash the script after the timeout
        const ignore = () => {};
        getQueueForName(QueueName.OPENSEARCH).on('error', ignore);
        getRedis().on('error', ignore);
        // After a timeout only the client is disconnected: closing the queue would
        // drop its error listener while BullMQ still reports the failed connect.
        close = () => disconnectRedis();
        const work = (async () => {
            for (const id of recipeIds) await addSyncRecipeJob(id);
        })();
        work.catch(ignore);
        await withTimeout(work, QUEUE_TIMEOUT_MS, 'Redis');
        close = async () => {
            await Promise.allSettled([closeAllQueues(), disconnectRedis()]);
        };
        console.log(`${recipeIds.length} Suchindex-Jobs eingereiht.`);
    } catch (error) {
        console.warn(
            `Suchindex-Sync nicht eingereiht (${error instanceof Error ? error.message : error}); der 15-Minuten-Sync holt es nach.`,
        );
    } finally {
        await withTimeout(close(), 2_000, 'Redis schließen').catch(() => undefined);
    }
}
