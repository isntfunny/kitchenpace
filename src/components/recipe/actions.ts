'use server';

import { distance as levenshtein } from 'fastest-levenshtein';

import {
    buildIngredientParser,
    escapeRegex,
    type ParsedIngredientInput,
} from '@app/lib/ingredients/parseIngredientInput';
import { createLogger } from '@shared/logger';
import {
    opensearchClient,
    OPENSEARCH_INDEX,
    OPENSEARCH_INGREDIENTS_INDEX,
} from '@shared/opensearch/client';
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

// ── Matching helpers ──

function findExactMatch(
    results: IngredientSearchResult[],
    name: string,
): IngredientSearchResult | null {
    const lower = name.toLowerCase();
    return (
        results.find(
            (r) => r.name.toLowerCase() === lower || r.matchedAlias?.toLowerCase() === lower,
        ) ?? null
    );
}

function findFuzzyMatch(
    results: IngredientSearchResult[],
    name: string,
): IngredientSearchResult | null {
    const lower = name.toLowerCase();
    const maxDist = lower.length <= 8 ? 2 : 3;
    let best: IngredientSearchResult | null = null;
    let bestDist = Infinity;
    for (const r of results) {
        const dist = levenshtein(r.name.toLowerCase(), lower);
        if (dist <= maxDist && dist < bestDist) {
            best = r;
            bestDist = dist;
        }
    }
    return best;
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

    // 1. Parse raw input server-side
    const parse = await getParser();
    const parsed = parse(trimmed);
    const searchTerm = parsed.name || trimmed;

    // 2. Search OpenSearch
    //    - phrase_prefix: broad candidate matching (prefix on any token)
    //    - match on name/pluralName: boosts exact word matches ("Eier" > "Eierschwamm")
    const response = await opensearchClient.search({
        index: OPENSEARCH_INGREDIENTS_INDEX,
        body: {
            size: 10,
            query: {
                bool: {
                    should: [
                        {
                            multi_match: {
                                query: searchTerm,
                                type: 'phrase_prefix',
                                fields: ['name^3', 'pluralName^3', 'aliases^2', 'keywords'],
                            },
                        },
                        {
                            multi_match: {
                                query: searchTerm,
                                type: 'best_fields',
                                fields: ['name^10', 'pluralName^10', 'aliases^5'],
                            },
                        },
                    ],
                    minimum_should_match: 1,
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
                      categories?: string[];
                      units?: string[];
                      aliases?: string[];
                  }
                | undefined;
            if (!source?.id || !source.name) return null;

            const queryLower = searchTerm.toLowerCase();
            const nameMatches = source.name.toLowerCase().includes(queryLower);
            const aliases = Array.isArray(source.aliases) ? source.aliases : [];
            const matchedAlias = !nameMatches
                ? aliases.find((a) => a.toLowerCase().includes(queryLower))
                : undefined;

            return {
                id: source.id,
                name: source.name,
                pluralName: source.pluralName ?? null,
                categories: Array.isArray(source.categories) ? source.categories : [],
                units: Array.isArray(source.units) ? source.units : [],
                matchedAlias,
            };
        })
        .filter((result): result is NonNullable<typeof result> => Boolean(result));

    // Dedup plural forms
    const pluralNameSet = new Set(
        results.map((r) => r.pluralName?.toLowerCase()).filter((v): v is string => Boolean(v)),
    );
    const filtered = results.filter((r) => !pluralNameSet.has(r.name.toLowerCase()));

    // 3. Find best match
    const exact = findExactMatch(filtered, searchTerm);
    const fuzzy = !exact ? findFuzzyMatch(filtered, searchTerm) : null;
    const bestMatch = exact ?? fuzzy;
    const matchType = exact ? 'exact' : fuzzy ? 'fuzzy' : 'none';

    ingLog.debug('search', {
        rawInput: trimmed,
        parsed: { name: parsed.name, amount: parsed.amount, unit: parsed.unit },
        searchTerm,
        hits: filtered.length,
        matchType,
        bestMatch: bestMatch?.name ?? null,
    });

    return { results: filtered, parsed, bestMatch, matchType };
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
