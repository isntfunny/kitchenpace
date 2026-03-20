/**
 * Shared OpenSearch ingredient search — used by both the recipe form (UI)
 * and the importer (batch matching). No framework dependencies.
 */

import { distance as levenshtein } from 'fastest-levenshtein';

import { opensearchClient, OPENSEARCH_INGREDIENTS_INDEX } from '@shared/opensearch/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface IngredientHit {
    id: string;
    name: string;
    pluralName: string | null;
    categories: string[];
    units: string[];
    matchedAlias?: string;
    highlightedName?: string;
}

export interface IngredientMatchResult {
    hits: IngredientHit[];
    bestMatch: IngredientHit | null;
    matchType: 'exact' | 'fuzzy' | 'none';
}

// ── Matching helpers ─────────────────────────────────────────────────────────

/** Get candidate names: full name + name before first comma.
 *  e.g. "Hackfleisch, Gehacktes" → ["hackfleisch, gehacktes", "hackfleisch"] */
function matchCandidates(name: string): string[] {
    const lower = name.toLowerCase();
    const commaIdx = lower.indexOf(',');
    return commaIdx > 0 ? [lower, lower.slice(0, commaIdx).trim()] : [lower];
}

function findExactMatch(hits: IngredientHit[], name: string): IngredientHit | null {
    const lower = name.toLowerCase();
    return (
        hits.find(
            (r) =>
                matchCandidates(r.name).includes(lower) || r.matchedAlias?.toLowerCase() === lower,
        ) ?? null
    );
}

function findFuzzyMatch(hits: IngredientHit[], name: string): IngredientHit | null {
    const lower = name.toLowerCase();
    const maxDist = lower.length <= 8 ? 2 : 3;
    let best: IngredientHit | null = null;
    let bestDist = Infinity;
    for (const r of hits) {
        for (const candidate of matchCandidates(r.name)) {
            const dist = levenshtein(candidate, lower);
            if (dist <= maxDist && dist < bestDist) {
                best = r;
                bestDist = dist;
            }
        }
    }
    return best;
}

// ── Core OpenSearch query ────────────────────────────────────────────────────

/**
 * Search the OpenSearch ingredients index for a given name.
 * Returns ranked hits with exact/fuzzy best-match classification.
 */
export async function searchIngredientsByName(
    name: string,
    size = 10,
): Promise<IngredientMatchResult> {
    const empty: IngredientMatchResult = { hits: [], bestMatch: null, matchType: 'none' };
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) return empty;

    const response = await opensearchClient.search({
        index: OPENSEARCH_INGREDIENTS_INDEX,
        body: {
            size,
            query: {
                bool: {
                    should: [
                        {
                            multi_match: {
                                query: trimmed,
                                type: 'phrase_prefix',
                                fields: ['name^3', 'pluralName^3', 'aliases^2', 'keywords'],
                            },
                        },
                        {
                            multi_match: {
                                query: trimmed,
                                type: 'best_fields',
                                fields: ['name^10', 'pluralName^10', 'aliases^5'],
                            },
                        },
                    ],
                    minimum_should_match: 1,
                },
            },
            sort: [{ _score: { order: 'desc' } }, { 'name.keyword': { order: 'asc' } }],
            highlight: {
                fields: { name: {}, pluralName: {}, aliases: {} },
                pre_tags: ['<mark>'],
                post_tags: ['</mark>'],
            },
        },
    });

    const rawHits = response.body.hits?.hits ?? [];

    const results = rawHits
        .map((hit: { _source?: Record<string, unknown>; highlight?: Record<string, string[]> }) => {
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

            const queryLower = trimmed.toLowerCase();
            const nameMatches = source.name.toLowerCase().includes(queryLower);
            const aliases = Array.isArray(source.aliases) ? source.aliases : [];
            const matchedAlias = !nameMatches
                ? aliases.find((a) => a.toLowerCase().includes(queryLower))
                : undefined;

            const hl = hit.highlight;
            const highlightedName = hl?.name?.[0] ?? undefined;

            return {
                id: source.id,
                name: source.name,
                pluralName: source.pluralName ?? null,
                categories: Array.isArray(source.categories) ? source.categories : [],
                units: Array.isArray(source.units) ? source.units : [],
                matchedAlias,
                highlightedName,
            };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r));

    // Dedup plural forms: if both "Ei" and "Eier" appear, drop the singular
    const resultNames = new Set(results.map((r) => r.name.toLowerCase()));
    const filtered = results.filter((r) => {
        if (r.pluralName && resultNames.has(r.pluralName.toLowerCase())) return false;
        return true;
    });

    const exact = findExactMatch(filtered, trimmed);
    const fuzzy = !exact ? findFuzzyMatch(filtered, trimmed) : null;
    const bestMatch = exact ?? fuzzy;
    const matchType = exact ? 'exact' : fuzzy ? 'fuzzy' : 'none';

    return { hits: filtered, bestMatch, matchType };
}
