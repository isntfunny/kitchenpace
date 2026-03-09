/**
 * Shared k6 test helpers for extracting slugs and metadata from API responses and HTML.
 */

export function extractRecipeSlugsFromPayload(payload) {
    const recipes = payload?.data;
    if (!Array.isArray(recipes)) return [];
    return recipes
        .map((recipe) => recipe?.slug)
        .filter((slug) => typeof slug === 'string' && slug.length > 0);
}

export function extractSlugsFromHtml(html, prefix) {
    const re = new RegExp(`href="\\/${prefix}\\/([^"?#/]+)"`, 'g');
    const seen = new Set();
    let m;
    while ((m = re.exec(html)) !== null) seen.add(m[1]);
    return Array.from(seen);
}

export function extractRecipeSlugsFromHtml(html) {
    return extractSlugsFromHtml(html, 'recipe');
}

export function extractUserSlugsFromHtml(html) {
    return extractSlugsFromHtml(html, 'user');
}

export function extractCategoriesFromPayload(payload) {
    const buckets = payload?.meta?.facets?.categories;
    if (!Array.isArray(buckets)) return [];
    return buckets.map((b) => b.key).filter((k) => typeof k === 'string' && k.length > 0);
}

export function extractTagsFromPayload(payload) {
    const buckets = payload?.meta?.facets?.tags;
    if (!Array.isArray(buckets)) return [];
    return buckets.map((b) => b.key).filter((k) => typeof k === 'string' && k.length > 0);
}

/**
 * Fetch the /recipes HTML page once and extract both recipe and user slugs.
 * Returns { body, recipes, users } where body is the raw HTML (for reuse).
 */
export function fetchRecipesPageSlugs(baseUrl, http) {
    const resp = http.get(`${baseUrl}/recipes`, { responseType: 'text' });
    if (resp.status === 200 && resp.body) {
        return {
            body: resp.body,
            recipes: extractRecipeSlugsFromHtml(resp.body),
            users: extractUserSlugsFromHtml(resp.body),
        };
    }
    return { body: null, recipes: [], users: [] };
}
