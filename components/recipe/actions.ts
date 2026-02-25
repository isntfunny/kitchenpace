'use server';

import { opensearchClient, OPENSEARCH_INDEX } from '@/lib/opensearch/client';
import { prisma } from '@/lib/prisma';

import type { TagFacet } from './types';

export interface IngredientSearchResult {
    id: string;
    name: string;
    category: string | null;
    units: string[];
}

export async function searchIngredients(query: string): Promise<IngredientSearchResult[]> {
    if (!query || query.length < 2) {
        return [];
    }

    const ingredients = await prisma.ingredient.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive',
            },
        },
        take: 10,
    });

    return ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
        units: ing.units || [],
    }));
}

export async function getAllCategories() {
    return prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
}

export async function getAllTags() {
    const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { recipes: true },
            },
        },
    });

    return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        count: tag._count.recipes,
    }));
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
    const buckets = response.body.aggregations?.tags?.buckets ?? [];
    return buckets.map((bucket: TagBucket) => ({
        key: String(bucket.key),
        count: bucket.doc_count,
    }));
}

export type { TagFacet };
