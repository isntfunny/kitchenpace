'use server';

import {
    buildIngredientParser,
    escapeRegex,
    type ParsedIngredientInput,
} from '@app/lib/ingredients/parseIngredientInput';
import { searchIngredientsByName } from '@app/lib/ingredients/search';
import { createLogger } from '@shared/logger';
import { opensearchClient, OPENSEARCH_INDEX } from '@shared/opensearch/client';
import { prisma } from '@shared/prisma';

import type { IngredientSearchResult } from './RecipeForm/data';
import type { TagFacet } from './types';

const ingLog = createLogger('ingredient-search');
const DEFAULT_TAG_SEARCH_LIMIT = 50;

type TagWithCount = {
    id: string;
    name: string;
    count: number;
};

// ── Server-side parser (cached, rebuilt when units change) ──

let _parserPromise: Promise<(raw: string) => ParsedIngredientInput> | null = null;
let _parserBuiltAt = 0;
const PARSER_TTL = 60_000; // rebuild every 60s

async function getParser() {
    if (_parserPromise && Date.now() - _parserBuiltAt < PARSER_TTL) return _parserPromise;
    _parserBuiltAt = Date.now();
    _parserPromise = prisma.unit
        .findMany({
            select: { shortName: true, longName: true },
            orderBy: { shortName: 'asc' },
        })
        .then((units) => buildIngredientParser(units));
    return _parserPromise;
}

// ── Main search action ──

export interface IngredientSearchResponse {
    results: IngredientSearchResult[];
    parsed: ParsedIngredientInput;
    /** Best match (exact or fuzzy) — null means "NEU" */
    bestMatch: IngredientSearchResult | null;
    matchType: 'exact' | 'fuzzy' | 'none';
}

export async function searchIngredients(rawInput: string): Promise<IngredientSearchResponse> {
    const empty: IngredientSearchResponse = {
        results: [],
        parsed: { name: '', amount: '', unit: null },
        bestMatch: null,
        matchType: 'none',
    };
    const trimmed = rawInput?.trim();
    if (!trimmed || trimmed.length < 2) return empty;

    // 1. Parse raw input server-side (extracts amount/unit from "200g Mehl")
    const parse = await getParser();
    const parsed = parse(trimmed);
    const searchTerm = parsed.name || trimmed;

    // 2. Shared OpenSearch search + matching
    const { hits, bestMatch, matchType } = await searchIngredientsByName(searchTerm);

    ingLog.debug('search', {
        rawInput: trimmed,
        parsed: { name: parsed.name, amount: parsed.amount, unit: parsed.unit },
        searchTerm,
        hits: hits.length,
        matchType,
        bestMatch: bestMatch?.name ?? null,
    });

    return { results: hits, parsed, bestMatch, matchType };
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
