/**
 * Input of the flow-only refresh (scripts/refresh-recipe-flows.ts): recipes
 * with their ingredient rows and the markdown sent to the model.
 */
import { Prisma } from '@prisma/client';

import { prisma } from '../../shared/prisma';
import {
    fallbackMarkdown,
    type RefreshRecipe,
    type StoredFlowNode,
} from '../../src/lib/importer/flow-refresh';
import { MIN_SOURCE_MARKDOWN } from '../../src/lib/importer/full-refresh';
import { scrapeRecipe } from '../../src/lib/importer/scraper';

export async function loadRecipes(where: {
    ids?: string[];
    limit?: number;
}): Promise<RefreshRecipe[]> {
    const rows = await prisma.recipe.findMany({
        where: {
            sourceUrl: { not: null },
            NOT: { sourceUrl: '' },
            // only recipes that already have a flow: refresh, not first build
            flowNodes: { not: Prisma.AnyNull },
            ...(where.ids?.length ? { id: { in: where.ids } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        ...(where.limit ? { take: where.limit } : {}),
        select: {
            id: true,
            title: true,
            description: true,
            sourceUrl: true,
            flowNodes: true,
            recipeIngredients: {
                orderBy: { position: 'asc' },
                select: {
                    id: true,
                    amount: true,
                    notes: true,
                    ingredient: { select: { name: true } },
                    unit: { select: { shortName: true } },
                },
            },
        },
    });
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        sourceUrl: row.sourceUrl,
        flowNodes: (row.flowNodes as StoredFlowNode[] | null) ?? [],
        ingredients: row.recipeIngredients.map((ri) => ({
            id: ri.id,
            name: ri.ingredient.name,
            amount: ri.amount,
            unit: ri.unit?.shortName ?? null,
            notes: ri.notes,
        })),
    }));
}

export async function markdownFor(
    recipe: RefreshRecipe,
    scrape: boolean,
): Promise<{ markdown: string; source: 'scrape' | 'fallback'; note?: string }> {
    if (scrape && recipe.sourceUrl) {
        try {
            const scraped = await scrapeRecipe(recipe.sourceUrl);
            if (scraped.markdown.trim().length >= MIN_SOURCE_MARKDOWN)
                return { markdown: scraped.markdown, source: 'scrape' };
            return {
                markdown: fallbackMarkdown(recipe),
                source: 'fallback',
                note: `Seite zu kurz (${scraped.markdown.trim().length} Zeichen)`,
            };
        } catch (error) {
            return {
                markdown: fallbackMarkdown(recipe),
                source: 'fallback',
                note: error instanceof Error ? error.message : String(error),
            };
        }
    }
    return { markdown: fallbackMarkdown(recipe), source: 'fallback', note: 'ohne Scraping' };
}
