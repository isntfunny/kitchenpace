import 'server-only';

import { createLogger } from '@shared/logger';
import { loadTitleDictionary } from '@shared/opensearch/title-dictionary';
import { queryLeaves } from '@shared/opensearch/title-terms';
import { prisma } from '@shared/prisma';

const log = createLogger('query-leaves');

/** Split query words for the title terms (KUC-144); empty when the dictionary fails to load. */
export async function loadQueryLeaves(query: string): Promise<string[][]> {
    try {
        return queryLeaves(await loadTitleDictionary(prisma), query);
    } catch (err) {
        log.warn('Loading the title dictionary failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return [];
    }
}
