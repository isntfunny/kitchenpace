/**
 * Labels and search filters for clusters, derived from dominant tags and categories.
 * Pure functions over already-loaded recipe metadata (no DB, no OpenAI).
 */

export interface ClusterMemberMeta {
    recipeId: string;
    /** Tag names (the recipe search filters tags by name) */
    tags: string[];
    categories: { slug: string; name: string }[];
}

export interface TermScore {
    /** Tag name or category slug (what the search filter uses) */
    key: string;
    /** Display name */
    name: string;
    count: number;
    /** Share of the cluster's recipes that carry the term (0..1) */
    share: number;
    /** TF-IDF-like score: frequent in the cluster, rare overall */
    score: number;
}

export interface ClusterSearchFilter {
    tags: string[];
    categories: string[];
}

export interface ClusterProfile {
    size: number;
    label: string;
    tags: TermScore[];
    categories: TermScore[];
    filter: ClusterSearchFilter;
    /** Share of the cluster's recipes that the derived filter finds (0..1) */
    filterCoverage: number;
    /** Large enough and describable: candidate for release */
    eligible: boolean;
}

export interface ProfileOptions {
    /** Min. share of cluster recipes carrying a term to count as dominant */
    minShare?: number;
    minCount?: number;
    /** Number of terms kept per kind */
    topTerms?: number;
    /** Clusters below this size are not eligible */
    minClusterSize?: number;
    maxFilterTags?: number;
    /** Min. share for a tag to become part of the search filter */
    filterTagShare?: number;
    /** Min. share for the category to become part of the search filter */
    filterCategoryShare?: number;
}

const DEFAULTS: Required<ProfileOptions> = {
    minShare: 0.15,
    minCount: 2,
    topTerms: 6,
    minClusterSize: 5,
    maxFilterTags: 2,
    filterTagShare: 0.4,
    filterCategoryShare: 0.5,
};

type TermKind = 'tag' | 'category';

function countTerms(members: readonly ClusterMemberMeta[], kind: TermKind) {
    const counts = new Map<string, { name: string; count: number }>();
    for (const member of members) {
        const seen = new Set<string>();
        const terms =
            kind === 'tag'
                ? member.tags.map((tag) => ({ key: tag, name: tag }))
                : member.categories.map((c) => ({ key: c.slug, name: c.name }));
        for (const term of terms) {
            if (seen.has(term.key)) continue;
            seen.add(term.key);
            const entry = counts.get(term.key);
            if (entry) entry.count++;
            else counts.set(term.key, { name: term.name, count: 1 });
        }
    }
    return counts;
}

function rankTerms(
    members: readonly ClusterMemberMeta[],
    kind: TermKind,
    documentFrequency: Map<string, { name: string; count: number }>,
    totalRecipes: number,
    options: Required<ProfileOptions>,
): TermScore[] {
    const counts = countTerms(members, kind);
    const terms: TermScore[] = [];
    for (const [key, { name, count }] of counts) {
        const share = count / members.length;
        if (count < options.minCount && members.length >= options.minCount) continue;
        if (share < options.minShare) continue;
        const df = documentFrequency.get(key)?.count ?? count;
        const idf = Math.log(totalRecipes / df);
        terms.push({ key, name, count, share, score: share * idf });
    }
    // Ties: higher share, then alphabetically — keeps labels deterministic
    terms.sort(
        (a, b) => b.score - a.score || b.share - a.share || a.key.localeCompare(b.key, 'de'),
    );
    return terms.filter((term) => term.score > 0).slice(0, options.topTerms);
}

export function deriveClusterFilter(
    tags: readonly TermScore[],
    categories: readonly TermScore[],
    options: Pick<
        Required<ProfileOptions>,
        'maxFilterTags' | 'filterTagShare' | 'filterCategoryShare'
    > = DEFAULTS,
): ClusterSearchFilter {
    const filterTags = tags
        .filter((tag) => tag.share >= options.filterTagShare)
        .slice(0, options.maxFilterTags)
        .map((tag) => tag.key);
    const filterCategories = categories
        .filter((category) => category.share >= options.filterCategoryShare)
        .slice(0, 1)
        .map((category) => category.key);

    // Never return an empty filter when the cluster has any dominant term
    if (filterTags.length === 0 && filterCategories.length === 0) {
        if (tags[0]) filterTags.push(tags[0].key);
        else if (categories[0]) filterCategories.push(categories[0].key);
    }
    return { tags: filterTags, categories: filterCategories };
}

export function matchesClusterFilter(
    member: ClusterMemberMeta,
    filter: ClusterSearchFilter,
): boolean {
    if (filter.tags.length === 0 && filter.categories.length === 0) return false;
    const tagSet = new Set(member.tags);
    if (!filter.tags.every((tag) => tagSet.has(tag))) return false;
    if (filter.categories.length === 0) return true;
    return member.categories.some((category) => filter.categories.includes(category.slug));
}

/** "Pasta & Italienisch": the two strongest distinct terms, tags first. */
export function buildLabel(
    tags: readonly TermScore[],
    categories: readonly TermScore[],
    skip = 0,
): string {
    const names: string[] = [];
    const push = (name: string | undefined) => {
        if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
            names.push(name);
        }
    };
    const ordered = [...tags, ...categories].sort((a, b) => b.score - a.score);
    push(tags[0]?.name);
    push(categories[0]?.name);
    for (const term of ordered.slice(skip)) {
        if (names.length >= 2) break;
        push(term.name);
    }
    return names.length > 0 ? names.slice(0, 2).join(' & ') : 'Gemischte Rezepte';
}

/** Makes labels unique by adding the next strongest term, then a counter as last resort. */
export function uniquifyLabels(profiles: ClusterProfile[]): void {
    const used = new Map<string, number>();
    profiles.forEach((profile, index) => {
        let label = profile.label;
        if (used.has(label)) {
            const extra = [...profile.tags, ...profile.categories]
                .sort((a, b) => b.score - a.score)
                .map((term) => term.name)
                .find((name) => !label.toLowerCase().includes(name.toLowerCase()));
            if (extra) label = `${label} & ${extra}`;
        }
        let candidate = label;
        let counter = 2;
        while (used.has(candidate)) candidate = `${label} (${counter++})`;
        used.set(candidate, index);
        profile.label = candidate;
    });
}

/**
 * Profiles every cluster (members grouped by cluster, same order as the clusters).
 * `all` is the whole recipe population, used for the "rare overall" part of the score.
 */
export function profileClusters(
    clusters: readonly (readonly ClusterMemberMeta[])[],
    options: ProfileOptions = {},
): ClusterProfile[] {
    // Explicit `undefined` values must not override the defaults
    const opts: Required<ProfileOptions> = { ...DEFAULTS };
    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) (opts as Record<string, number>)[key] = value;
    }
    const all = clusters.flat();
    const totalRecipes = Math.max(1, all.length);
    const tagDf = countTerms(all, 'tag');
    const categoryDf = countTerms(all, 'category');

    const profiles = clusters.map((members): ClusterProfile => {
        const tags = rankTerms(members, 'tag', tagDf, totalRecipes, opts);
        const categories = rankTerms(members, 'category', categoryDf, totalRecipes, opts);
        const filter = deriveClusterFilter(tags, categories, opts);
        const covered = members.filter((member) => matchesClusterFilter(member, filter)).length;
        const hasTerms = tags.length > 0 || categories.length > 0;
        return {
            size: members.length,
            label: buildLabel(tags, categories),
            tags,
            categories,
            filter,
            filterCoverage: members.length > 0 ? covered / members.length : 0,
            eligible: hasTerms && members.length >= opts.minClusterSize,
        };
    });

    uniquifyLabels(profiles);
    return profiles;
}
