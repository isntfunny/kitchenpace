// Cleans up the tag table against the fixed tag list in shared/tags/tag-list.ts (KUC-116).
// Dry run by default; writes only with --write (one transaction). Afterwards the
// affected recipes are resynced in OpenSearch and the tag index is rebuilt.
// Back up Tag, RecipeTag, FilterSetTag and CollectionTag before --write.
//
//   npx tsx scripts/cleanup-tags.ts [--write] [--report out.json] [--no-sync]
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { prisma } from '../shared/prisma';
import { formatTagCleanupReport, runTagCleanup } from '../shared/tags/cleanup';

/** Same key as WATERMARK_KEY_TAGS in worker/queues/opensearch-processor.ts */
const TAG_WATERMARK_KEY = 'opensearch:watermark:tags';

async function resyncSearch(recipeIds: string[]) {
    const { addSyncRecipeJob } = await import('../worker/queues');
    const { getQueueForName, closeAllQueues } = await import('../worker/queues/queue');
    const { QueueName } = await import('../worker/queues/types');
    const { getRedis, disconnectRedis } = await import('../worker/queues/connection');
    try {
        for (const recipeId of recipeIds) await addSyncRecipeJob(recipeId);
        // Renamed tags keep their createdAt, so the incremental sync would miss them
        await getRedis().del(TAG_WATERMARK_KEY);
        await getQueueForName(QueueName.OPENSEARCH).add('sync-tags', { batchSize: 500 });
        console.log(`OpenSearch: ${recipeIds.length} Rezepte und Tag-Index eingereiht`);
    } finally {
        await closeAllQueues();
        await disconnectRedis();
    }
}

async function main() {
    const { values } = parseArgs({
        options: {
            write: { type: 'boolean', default: false },
            report: { type: 'string' },
            'no-sync': { type: 'boolean', default: false },
        },
    });

    const report = await runTagCleanup(prisma, { write: values.write });

    console.log(formatTagCleanupReport(report));
    if (values.report) {
        writeFileSync(values.report, JSON.stringify(report, null, 2));
        console.log(`Protokoll: ${values.report}`);
    }
    if (values.write && !values['no-sync']) {
        await resyncSearch(report.affectedRecipeIds);
    }
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
