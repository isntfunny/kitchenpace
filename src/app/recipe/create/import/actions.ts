'use server';

/**
 * Server Actions für den Rezept-Import Workflow
 *
 * All heavy lifting is delegated to shared modules in src/lib/importer/.
 * This file re-exports the pipeline functions as Next.js server actions.
 */

import {
    analyzeWithAI as analyzeWithAIShared,
    saveImportedRecipe as saveImportedRecipeShared,
} from '@app/lib/importer/pipeline';
import { checkScraplerHealth, scrapeRecipe } from '@app/lib/importer/scraper';
import type { AnalyzedRecipe } from '@app/lib/importer/transform';
import { prisma } from '@shared/prisma';

// Re-export types that the UI layer needs
export type { ScrapedContent } from '@app/lib/importer/scraper';
export type { AnalyzedRecipe, FlowEdgeInput, FlowNodeInput } from '@app/lib/importer/transform';

// Re-export scrapeRecipe and checkScraplerHealth as server actions
export { checkScraplerHealth, scrapeRecipe };

/**
 * Sendet gescrapptes Markdown an OpenAI und transformiert das Ergebnis.
 * Server-action wrapper around the shared analyzeWithAI.
 */
export async function analyzeWithAI(
    markdown: string,
    sourceUrl = '',
    userId?: string,
): Promise<AnalyzedRecipe> {
    return analyzeWithAIShared(prisma, markdown, sourceUrl, userId);
}

/**
 * Speichert ein importiertes Rezept als DRAFT.
 * Server-action wrapper around the shared saveImportedRecipe.
 */
export async function saveImportedRecipe(
    data: AnalyzedRecipe,
    authorId: string,
): Promise<{ id: string; slug: string }> {
    return saveImportedRecipeShared(prisma, data, authorId);
}
