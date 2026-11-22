// Probe for the week selection (KUC-126). READ-ONLY: the DB session is read-only and
// OpenSearch is only searched. Run inside the app container (it has pg and the OpenSearch
// client), never against production:
//
//   docker cp scripts/probe-week-selection.mjs <app>:/tmp/probe.mjs
//   docker exec -w /app <app> node /tmp/probe.mjs --user <userId> [--user <id2>] [--rounds 3]
//
// Prints JSON to stdout: per profile the lists "Passt" (after 0..N simulated picks, each
// round picks the top card), "Probier auch mal", "Dazu passt" for the picks, plus stats.
// Prototype of the spec docs/superpowers/specs/2026-11-22-wochenauswahl-design.md.
import { createRequire } from 'node:module';

const require = createRequire('/app/package.json');
const { Client: OpenSearch } = require('@opensearch-project/opensearch');
const { Client } = require('pg');

// ── Config (the numbers to tune) ────────────────────────────────────────────────
const CONFIG = {
    weights: { taste: 4, pick: 3, season: 2, rating: 1.5 },
    /** Share of the picks in the search vector: per pick, and the maximum */
    blendPerPick: 0.15,
    blendMax: 0.5,
    knnK: 150,
    listSize: 12,
    tryAlsoSize: 5,
    /** Cosine to a pick above this counts as "almost the same dish" */
    nearDuplicate: 0.8,
    /** Bayes damping: prior weight and prior mean (null = global mean) */
    bayesM: 5,
    season: 'Herbst',
    otherSeasons: ['Frühling', 'Sommer', 'Winter'],
};

const STYLE_TAGS = new Set([
    'Italienisch',
    'Deutsch',
    'Amerikanisch',
    'Mediterran',
    'Französisch',
    'Asiatisch',
    'Österreichisch',
    'Griechisch',
    'Mexikanisch',
    'Ofengericht',
    'Pfannengericht',
    'Ein Topf',
    'Grillen',
    'Frittiert',
]);
const STAPLE_ROOTS = new Set(['verschiedenes', 'fette-und-oele']);
const STARCH_ROOTS = new Set([
    'getreideprodukte-huelsenfruechte-und-kartoffeln',
    'brote-flocken-und-fruehstueckscerealien',
]);
const PROTEIN_ROOTS = new Set([
    'fleisch-und-innereien',
    'fleisch-und-wurstwaren',
    'fisch',
    'eier',
    'pflanzliche-proteinlieferanten-und-alternativen-zu-tierischen-produkten',
]);
const NEVER_ALONE_TAGS = new Set(['Grundrezept', 'Vorratshaltung', 'Geschenk aus der Küche']);

// ── Helpers ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const users = args.flatMap((a, i) => (a === '--user' ? [args[i + 1]] : []));
const rounds = Number(args[args.indexOf('--rounds') + 1] || 3);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const norm = (v) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n ? v.map((x) => x / n) : v;
};
const cos = (a, b) => {
    if (!a || !b || a.length !== b.length) return 0;
    let d = 0,
        na = 0,
        nb = 0;
    for (let i = 0; i < a.length; i++) {
        d += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return na && nb ? d / Math.sqrt(na * nb) : 0;
};
const mean = (vs) => vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length);
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// ── Load (read-only) ────────────────────────────────────────────────────────────
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('SET default_transaction_read_only = on');
const q = async (sql, params) => (await db.query(sql, params)).rows;

const recipes = await q(`
    select r.id, r.title, r.rating, r."ratingCount" as "ratingCount", r."totalTime" as "totalTime",
           r.difficulty,
           case when jsonb_typeof(r."flowNodes"::jsonb) = 'array'
                then jsonb_array_length(r."flowNodes"::jsonb) else 0 end as nodes,
           coalesce((select array_agg(c.name) from "RecipeCategory" rc join "Category" c on c.id = rc."categoryId"
                     where rc."recipeId" = r.id), '{}') as categories,
           coalesce((select array_agg(t.name) from "RecipeTag" rt join "Tag" t on t.id = rt."tagId"
                     where rt."recipeId" = r.id), '{}') as tags
    from "Recipe" r
    where r.status = 'PUBLISHED' and r."moderationStatus" <> 'REJECTED'`);
const byId = new Map(recipes.map((r) => [r.id, { ...r, ingredients: [], roots: new Set() }]));

const lines = await q(`
    select ri."recipeId" as rid, ri."ingredientId" as iid, coalesce(i."normalizedName", i.name) as name,
           (select coalesce(p.slug, c.slug) from "_IngredientToIngredientCategory" ic
              join "IngredientCategory" c on c.id = ic."B"
              left join "IngredientCategory" p on p.id = c."parentId"
             where ic."A" = i.id limit 1) as root
    from "RecipeIngredient" ri join "Ingredient" i on i.id = ri."ingredientId"
    where ri."isOptional" = false`);
for (const l of lines) {
    const r = byId.get(l.rid);
    if (!r) continue;
    r.ingredients.push(l);
    if (l.root) r.roots.add(l.root);
}

const embeddingRows = await q(`select "recipeId" as id, embedding from "RecipeEmbedding"`);
const embedding = new Map(embeddingRows.map((e) => [e.id, e.embedding.map(Number)]));

const isMain = (r) =>
    r.categories.includes('Hauptgericht') && !r.tags.some((t) => NEVER_ALONE_TAGS.has(t));
const mains = [...byId.values()].filter(isMain);
const sides = (cat) => [...byId.values()].filter((r) => r.categories.includes(cat) && !isMain(r));

const rated = recipes.filter((r) => r.ratingCount > 0);
const globalMean = rated.length
    ? rated.reduce((s, r) => s + r.rating * r.ratingCount, 0) /
      rated.reduce((s, r) => s + r.ratingCount, 0)
    : 3.5;
const bayes = (r) =>
    (r.rating * r.ratingCount + CONFIG.bayesM * globalMean) / (r.ratingCount + CONFIG.bayesM);

const effort = (r) =>
    round(
        (clamp01(Math.max(0, r.nodes - 1) / 15) +
            clamp01(r.totalTime / 120) +
            ({ EASY: 0, MEDIUM: 0.5, HARD: 1 }[r.difficulty] ?? 0.5)) /
            3,
    );
const seasonFit = (r) =>
    r.tags.includes(CONFIG.season)
        ? 1
        : r.tags.some((t) => CONFIG.otherSeasons.includes(t))
          ? 0
          : 0.5;
const meaningful = (r) =>
    new Set(r.ingredients.filter((i) => !STAPLE_ROOTS.has(i.root)).map((i) => i.iid));
const styleOf = (r) => r.tags.filter((t) => STYLE_TAGS.has(t));
const proteinOf = (r) => [...r.roots].filter((x) => PROTEIN_ROOTS.has(x));

const os = new OpenSearch({ node: process.env.OPENSEARCH_URL ?? 'http://localhost:9200' });
const osIndex = process.env.OPENSEARCH_EMBEDDINGS_INDEX ?? 'recipe-embeddings';
async function knn(vector, k) {
    try {
        const res = await os.search({
            index: osIndex,
            body: { size: k, _source: false, query: { knn: { embedding: { vector, k } } } },
        });
        return res.body.hits.hits.map((h) => h._id);
    } catch (error) {
        return { error: String(error?.message ?? error) };
    }
}

// ── Scoring (prototype of selection-score.ts) ───────────────────────────────────
function scoreAll(pool, taste, picks) {
    const tasteCos = taste ? pool.map((r) => cos(taste, embedding.get(r.id))) : [];
    const lo = Math.min(...tasteCos),
        hi = Math.max(...tasteCos);
    const pickIngredients = new Set(picks.flatMap((p) => [...meaningful(p)]));
    const pickStyles = new Set(picks.flatMap(styleOf));
    const pickProteins = new Set(picks.flatMap(proteinOf));
    return pool.map((r, i) => {
        const tasteS = taste && hi > lo ? (tasteCos[i] - lo) / (hi - lo) : 0.5;
        let pickS = 0.5;
        const why = [];
        if (picks.length) {
            const shared = [...meaningful(r)].filter((x) => pickIngredients.has(x));
            const nearest = Math.max(
                ...picks.map((p) => cos(embedding.get(r.id), embedding.get(p.id))),
            );
            const sameStyle = styleOf(r).some((s) => pickStyles.has(s));
            const sameProtein = proteinOf(r).some((s) => pickProteins.has(s));
            pickS = clamp01(
                0.5 +
                    (0.5 * Math.min(shared.length, 3)) / 3 -
                    (nearest > CONFIG.nearDuplicate ? 0.5 : 0) -
                    (sameStyle ? 0.15 : 0) -
                    (sameProtein ? 0.15 : 0),
            );
            if (shared.length) why.push(`teilt ${shared.length} Zutat(en)`);
            if (nearest > CONFIG.nearDuplicate) why.push(`fast gleich (${round(nearest)})`);
            if (sameStyle) why.push('gleicher Stil');
            if (sameProtein) why.push('gleiche Eiweißquelle');
        }
        const seasonS = seasonFit(r);
        const ratingS = clamp01((bayes(r) - 1) / 4);
        const w = CONFIG.weights;
        const total = w.taste * tasteS + w.pick * pickS + w.season * seasonS + w.rating * ratingS;
        return {
            id: r.id,
            title: r.title,
            total: round(total),
            parts: {
                taste: round(tasteS),
                pick: round(pickS),
                season: seasonS,
                rating: round(ratingS),
            },
            tasteCos: taste ? round(tasteCos[i], 3) : null,
            effort: effort(r),
            minutes: r.totalTime,
            rating: `${round(r.rating, 1)} (${r.ratingCount})`,
            styles: styleOf(r),
            notes: why,
        };
    });
}

function sideFor(main) {
    const hasStarch = [...main.roots].some((x) => STARCH_ROOTS.has(x));
    const hasVeg = main.roots.has('gemuese');
    const need = !hasStarch ? 'Beilage' : !hasVeg ? 'Salat' : null;
    if (!need) return { need: null };
    const e = embedding.get(main.id);
    const best = sides(need)
        .map((s) => ({ s, v: cos(e, embedding.get(s.id)) * 0.7 + ((bayes(s) - 1) / 4) * 0.3 }))
        .sort((a, b) => b.v - a.v)[0];
    return { need, suggestion: best ? `${best.s.title} (${round(best.v)})` : null };
}

async function probe(userId) {
    const profile = userId
        ? (
              await q(
                  `select nickname, "tasteEmbedding" as taste from "Profile" where "userId" = $1`,
                  [userId],
              )
          )[0]
        : null;
    const taste =
        profile?.taste?.length && profile.taste.some((x) => x !== 0)
            ? profile.taste.map(Number)
            : null;
    const out = { user: profile?.nickname ?? '(ohne Profil)', hasTaste: !!taste, rounds: [] };
    const picks = [];
    for (let round_ = 0; round_ <= rounds; round_++) {
        const blend = Math.min(CONFIG.blendMax, CONFIG.blendPerPick * picks.length);
        let vector = null;
        if (taste && picks.length)
            vector = norm(
                taste.map(
                    (x, i) =>
                        (1 - blend) * x + blend * mean(picks.map((p) => embedding.get(p.id)))[i],
                ),
            );
        else if (taste) vector = norm(taste);
        else if (picks.length) vector = norm(mean(picks.map((p) => embedding.get(p.id))));

        let pool;
        let knnStats = null;
        if (vector) {
            const ids = await knn(vector, CONFIG.knnK);
            if (Array.isArray(ids)) {
                const hits = ids.map((id) => byId.get(id)).filter(Boolean);
                pool = hits.filter(isMain);
                knnStats = { hits: ids.length, mains: pool.length };
            } else {
                knnStats = { error: ids.error };
                pool = mains;
            }
        } else pool = mains;
        const taken = new Set(picks.map((p) => p.id));
        pool = pool.filter((r) => !taken.has(r.id) && embedding.has(r.id));
        if (pool.length < CONFIG.listSize) {
            const extra = mains
                .filter((r) => !taken.has(r.id) && !pool.includes(r) && embedding.has(r.id))
                .sort((a, b) => bayes(b) - bayes(a));
            pool = [...pool, ...extra.slice(0, CONFIG.listSize * 3)];
        }
        const list = scoreAll(pool, taste ?? vector, picks)
            .sort((a, b) => b.total - a.total)
            .slice(0, CONFIG.listSize);
        out.rounds.push({ picks: picks.map((p) => p.title), knn: knnStats, list });
        if (round_ < rounds && list[0]) picks.push(byId.get(list[0].id));
    }

    // Probier auch mal: decent rating, farthest from the taste (or the picks), spread by style
    const anchor = taste ?? (picks.length ? mean(picks.map((p) => embedding.get(p.id))) : null);
    const inLists = new Set(out.rounds.flatMap((r) => r.list.map((x) => x.id)));
    const candidates = mains
        .filter((r) => embedding.has(r.id) && !inLists.has(r.id) && bayes(r) >= globalMean)
        .map((r) => ({ r, d: anchor ? cos(anchor, embedding.get(r.id)) : Math.random() }))
        .sort((a, b) => a.d - b.d);
    const usedStyles = new Set();
    out.tryAlso = [];
    for (const { r, d } of candidates) {
        const key = styleOf(r)[0] ?? proteinOf(r)[0] ?? r.id;
        if (usedStyles.has(key)) continue;
        usedStyles.add(key);
        out.tryAlso.push({
            title: r.title,
            cos: round(d, 3),
            styles: styleOf(r),
            rating: `${round(r.rating, 1)} (${r.ratingCount})`,
        });
        if (out.tryAlso.length >= CONFIG.tryAlsoSize) break;
    }
    out.sides = picks.map((p) => ({ main: p.title, ...sideFor(p) }));
    out.effortSorted = {
        quick: [...out.rounds[0].list]
            .sort((a, b) => a.effort - b.effort)
            .slice(0, 3)
            .map((x) => `${x.title} (${x.effort})`),
        elaborate: [...out.rounds[0].list]
            .sort((a, b) => b.effort - a.effort)
            .slice(0, 3)
            .map((x) => `${x.title} (${x.effort})`),
    };
    return out;
}

const results = [];
for (const user of [...users, null]) results.push(await probe(user));

const ruleStats = {
    mains: mains.length,
    mainsWithEmbedding: mains.filter((r) => embedding.has(r.id)).length,
    lackStarch: mains.filter((r) => ![...r.roots].some((x) => STARCH_ROOTS.has(x))).length,
    lackVeg: mains.filter((r) => !r.roots.has('gemuese')).length,
    withoutIngredients: mains.filter((r) => r.ingredients.length === 0).length,
    beilagen: sides('Beilage').length,
    salate: sides('Salat').length,
    globalMeanRating: round(globalMean),
    recipesWithRatings: rated.length,
};
console.log(JSON.stringify({ config: CONFIG, ruleStats, results }, null, 1));
await db.end();
