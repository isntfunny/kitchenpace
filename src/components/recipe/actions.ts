'use server';

import {
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
} from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

import type { IngredientSearchResult } from './RecipeForm/data';
import type { TagFacet } from './types';

const DEFAULT_TAG_SEARCH_LIMIT = 50;

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type TagWithCount = {
    id: string;
    name: string;
    count: number;
};

export async function searchIngredients(query: string): Promise<IngredientSearchResult[]> {
    if (!query || query.length < 2) {
        return [];
    }

    const response = await opensearchClient.search({
        index: OPENSEARCH_INGREDIENTS_INDEX,
        body: {
            size: 10,
            query: {
                multi_match: {
                    query,
                    type: 'phrase_prefix',
                    fields: ['name^3', 'keywords'],
                },
            },
            sort: [{ _score: { order: 'desc' } }, { 'name.keyword': { order: 'asc' } }],
        },
    });

    const hits = response.body.hits?.hits ?? [];

    const results = hits
        .map((hit: { _source?: Record<string, unknown> }) => {
            const source = hit._source as
                | {
                      id?: string;
                      name?: string;
                      pluralName?: string | null;
                      category?: string | null;
                      units?: string[];
                  }
                | undefined;
            if (!source?.id || !source.name) {
                return null;
            }
            return {
                id: source.id,
                name: source.name,
                pluralName: source.pluralName ?? null,
                category: source.category ?? null,
                units: Array.isArray(source.units) ? source.units : [],
            };
        })
        .filter((result): result is IngredientSearchResult => Boolean(result));

    // Dedup: if a result's name matches another result's pluralName, it is a legacy plural entry.
    // Keep only the singular form (the one whose name is NOT a pluralName of another).
    const pluralNameSet = new Set(
        results.map((r) => r.pluralName?.toLowerCase()).filter((v): v is string => Boolean(v)),
    );
    return results.filter((r) => !pluralNameSet.has(r.name.toLowerCase()));
}

export async function searchTags(
    query = '',
    limit = DEFAULT_TAG_SEARCH_LIMIT,
): Promise<TagWithCount[]> {
    const trimmed = query.trim();
    const includePattern = trimmed ? `(?i).*${escapeRegex(trimmed)}.*` : undefined;

    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            size: 0,
            aggs: {
                tags: {
                    terms: {
                        field: 'tags',
                        size: limit,
                        ...(includePattern ? { include: includePattern } : {}),
                    },
                },
            },
        },
    });

    type TagBucket = { key: string | number; doc_count: number };
    const buckets = (response.body.aggregations?.tags as { buckets?: TagBucket[] } | undefined)
        ?.buckets;
    if (!buckets || buckets.length === 0) {
        return [];
    }

    const names = buckets.map((bucket) => String(bucket.key));
    const tags = await prisma.tag.findMany({
        where: { name: { in: names } },
    });
    const tagByName = new Map(tags.map((tag) => [tag.name, tag]));

    return buckets
        .map((bucket) => {
            const name = String(bucket.key);
            const tag = tagByName.get(name);
            if (!tag) return null;
            return { id: tag.id, name: tag.name, count: bucket.doc_count };
        })
        .filter((entry): entry is TagWithCount => entry !== null);
}

export async function getAllCategories() {
    return prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
}

export async function getAllTags() {
    return searchTags('', DEFAULT_TAG_SEARCH_LIMIT);
}

export async function getTagFacets(): Promise<TagFacet[]> {
    const response = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            size: 0,
            aggs: {
                tags: {
                    terms: {
                        field: 'tags',
                        size: 120,
                    },
                },
            },
        },
    });

    type TagBucket = { key: string | number; doc_count: number };
    type TermsAggregation = { buckets?: TagBucket[] };
    const tagsAgg = response.body.aggregations?.tags as TermsAggregation | undefined;
    const buckets = tagsAgg?.buckets ?? [];
    return buckets.map((bucket: TagBucket) => ({
        key: String(bucket.key),
        count: bucket.doc_count,
    }));
}
