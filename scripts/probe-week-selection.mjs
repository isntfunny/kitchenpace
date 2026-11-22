// Probe for the week selection (KUC-126). READ-ONLY: the DB session is read-only and
// OpenSearch is only searched. Run inside the app container (it has pg and the OpenSearch
// client), never against production:
//
//   docker cp scripts/probe-week-selection.mjs <app>:/tmp/probe.mjs
//   docker exec -w /app <app> node /tmp/probe.mjs --user <userId> [--user <id2>] [--rounds 3]
//
// Prints JSON to stdout: per profile the lists "Passt" (after 0..N simulated picks, each
// round picks the top card), "Probier auch mal", "Dazu passt" for the picks, plus stats.
// Every profile is simulated twice: `legacy` (first formula: kNN k=150 unfiltered, no
// diversity) and the new one (kNN filtered to mains, MMR + dish type "Art"), so the summary
// compares before/after on the same data. No OpenAI calls: only stored embeddings are used.
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
    /** 'filtered': kNN restricted to the allowed mains by an id filter (Lucene pre-filter);
     *  'plain': unfiltered with knnKPlain neighbours, mains filtered afterwards */
    knnMode: 'filtered',
    knnKPlain: 400,
    listSize: 12,
    tryAlsoSize: 5,
    /** Cosine to a pick above this counts as "almost the same dish" */
    nearDuplicate: 0.8,
    /** Bayes damping: prior weight and prior mean (null = global mean) */
    bayesM: 5,
    /** Prior mean when fewer recipes than this have ratings (the global mean is meaningless then) */
    minRatedForGlobalMean: 20,
    /**
     * Diversity (MMR): a candidate loses points for being close to what is already chosen or
     * listed. Cosine penalty ramps from cosStart (0) to 1 (1); the other terms are in the
     * unit of the relevance (0..1).
     */
    mmr: {
        cosStart: 0.5,
        cosWeightPick: 0.5,
        cosWeightList: 0.4,
        /** Same dish type ("Art") as a pick / per earlier card of the same type in the list */
        artPick: 0.12,
        artList: 0.07,
        artListCap: 3,
        /** Share of meaningful ingredients in common with listed cards (Jaccard) */
        jaccardStart: 0.3,
        jaccardWeight: 0.2,
    },
    /** Minimum number of ratings before the rating reason is shown */
    ratingReasonMin: 3,
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

// Dish type ("Art") by ingredient names and title keywords, not by ingredient categories
// (501 of 1741 ingredients have no category, among them Spaghetti, Reis, Gnocchi, Spätzle).
// Title hit = 3 points, each ingredient hit 1 (max 2); ties follow the order of this list.
// `ingMin`: ingredient name hits needed before the ingredients count at all (a single potato
// does not make a potato dish; one pasta or rice ingredient usually does). No quantities here.
const ARTS = {
    'Suppe/Eintopf': {
        title: /suppe|eintopf|bauerntopf|topf\b|chili con|gulasch|minestrone|borschtsch|brühe/,
        ing: null,
    },
    Salat: { title: /salat/, ing: null },
    Nudeln: {
        ingMin: 1,
        title: /nudel|pasta|spaghetti|penne|tagliatelle|makkaroni|lasagne|cannelloni|tortellini|ravioli|spätzle|schupfnudel|gnocchi|rigatoni|fusilli|maultasche/,
        ing: /nudel|spaghetti|penne|tagliatelle|makkaroni|fusilli|farfalle|rigatoni|lasagne|cannelloni|tortellini|ravioli|spätzle|schupfnudel|gnocchi|maultasche|pasta|linguine|orecchiette|tagliolini/,
    },
    Reis: {
        ingMin: 1,
        title: /\breis\b|reis$|risotto|paella|sushi/,
        ing: /(^|\s)reis\b|reis$|risotto|basmati|jasmin|milchreis|sushi/,
    },
    'Brot/Teig': {
        ingMin: 2,
        title: /brot|brötchen|pizza|flammkuchen|teig|tarte|quiche|toast|burger|wrap|tortilla|fladen|focaccia|pfannkuchen|waffel|knödel|zwiebelkuchen|crêpe|crepe/,
        ing: /blätterteig|pizzateig|hefeteig|^hefe\b|toastbrot|brötchen|\bbrot\b|baguette|tortilla|wrap|fladenbrot|ciabatta|burgerbr/,
    },
    Kartoffel: {
        ingMin: 2,
        title: /kartoffel|püree|rösti|pommes|kroketten|stampf|reibekuchen|puffer/,
        ing: /kartoffel/,
    },
    Hülsenfrüchte: {
        ingMin: 2,
        title: /linsen|kichererbsen|bohnen|erbsen|\bdal\b|dhal|hummus|falafel|tofu/,
        ing: /linse|kichererbse|bohne|erbsen|tofu|tempeh|falafel/,
    },
};
/** Staples that make a dish filling (name list; the category is only an addition) */
const STARCH_NAME =
    /nudel|spaghetti|penne|tagliatelle|makkaroni|fusilli|farfalle|rigatoni|lasagne|cannelloni|tortellini|ravioli|spätzle|schupfnudel|gnocchi|pasta|maultasche|(^|\s)reis\b|reis$|risotto|basmati|kartoffel|pommes|kroketten|brot\b|brötchen|baguette|ciabatta|toast|tortilla|wrap|fladenbrot|pizzateig|blätterteig|hefeteig|couscous|bulgur|quinoa|hirse|polenta|grieß|graupen|haferflocken|knödel|linse|kichererbse|bohne|erbsen|tofu|tempeh|mais\b|maiskolben/;
const VEG_NAME =
    /tomate|paprika|zucchini|karotte|möhre|mohrrübe|brokkoli|broccoli|spinat|kürbis|gurke|aubergine|lauch|porree|pilz|champignon|kohl|blumenkohl|rucola|salat|mangold|fenchel|sellerie|spargel|rosenkohl|radieschen|rote bete|pastinake|kohlrabi|süßkartoffel|erbsen|mais\b|paprikaschote|oliven|artischocke|rübe|wirsing|chicorée|endivie|mangold|spitzkohl|bohnen/;
const NOT_VEG_NAME =
    /tomatenmark|ketchup|tomatensauce|tomatensoße|passierte|gewürz|brühe|zwiebelpulver|knoblauch/;
/** Sauces, dips, dressings, pastes: never a side dish on their own */
const SAUCE_TITLE =
    /soße|sosse|sauce|dip\b|dressing|pesto|marinade|vinaigrette|chutney|aioli|mayonnaise|mayo|sugo|ketchup|salsa|remoulade|tzatziki|hummus|aufstrich|glasur|gewürzmischung|gewürzsalz|würzpaste|paste\b|brühe|fond|-dip|crème fraîche/;

// ── Helpers ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const users = args.flatMap((a, i) => (a === '--user' ? [args[i + 1]] : []));
const rounds = Number(args[args.indexOf('--rounds') + 1] || 3);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const norm = (v) => {
    const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return n ? v.map((x) => x / n) : v;
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
    l.name = String(l.name ?? '').toLowerCase();
    r.ingredients.push(l);
    if (l.root) r.roots.add(l.root);
}

const embeddingRows = await q(`select "recipeId" as id, embedding from "RecipeEmbedding"`);
const embedding = new Map(embeddingRows.map((e) => [e.id, norm(e.embedding.map(Number))]));

const isMain = (r) =>
    r.categories.includes('Hauptgericht') && !r.tags.some((t) => NEVER_ALONE_TAGS.has(t));
const mains = [...byId.values()].filter(isMain);
const isSauce = (r) => SAUCE_TITLE.test(r.title.toLowerCase());
const sides = (cat) =>
    [...byId.values()].filter((r) => r.categories.includes(cat) && !isMain(r) && !isSauce(r));

const rated = recipes.filter((r) => r.ratingCount > 0);
const globalMean =
    rated.length >= CONFIG.minRatedForGlobalMean
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
// Kitchen basics are no "shared ingredient": by category and by name (many have no category)
const COMMON_NAME =
    /^(salz|pfeffer|wasser|zucker|mehl|butter|margarine|milch|sahne|schlagsahne|eier?|knoblauch.*|zwiebel.*|.*öl|essig.*|.*brühe|muskat.*|petersilie|schnittlauch|thymian|oregano|basilikum|paprikapulver|currypulver|speisestärke|backpulver)$/;
const meaningful = (r) =>
    new Set(
        r.ingredients
            .filter((i) => !STAPLE_ROOTS.has(i.root) && !COMMON_NAME.test(i.name))
            .map((i) => i.iid),
    );
const styleOf = (r) => r.tags.filter((t) => STYLE_TAGS.has(t));
const proteinOf = (r) => [...r.roots].filter((x) => PROTEIN_ROOTS.has(x));

// Dish type: title hit 3 points, each ingredient name hit 1 (max 2); no hit = by protein
const ART_ORDER = Object.keys(ARTS);
const artCache = new Map();
function artOf(r) {
    if (artCache.has(r.id)) return artCache.get(r.id);
    const title = r.title.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const name of ART_ORDER) {
        const def = ARTS[name];
        const hits = def.ing ? r.ingredients.filter((i) => def.ing.test(i.name)).length : 0;
        const score =
            (def.title.test(title) ? 3 : 0) + (hits >= (def.ingMin ?? 1) ? Math.min(2, hits) : 0);
        if (score > bestScore) {
            best = name;
            bestScore = score;
        }
    }
    if (!best) {
        const p = proteinOf(r);
        best = p.includes('fisch')
            ? 'Fisch'
            : p.some((x) => x.startsWith('fleisch'))
              ? 'Fleisch'
              : 'Gemüse/Sonstiges';
    }
    artCache.set(r.id, best);
    return best;
}
const hasStarch = (r) =>
    r.ingredients.some((i) => STARCH_NAME.test(i.name)) ||
    [...r.roots].some((x) => STARCH_ROOTS.has(x));
const hasVeg = (r) =>
    r.ingredients.some((i) => VEG_NAME.test(i.name) && !NOT_VEG_NAME.test(i.name)) ||
    r.roots.has('gemuese');

const dot = (a, b) => {
    let d = 0;
    for (let i = 0; i < a.length; i++) d += a[i] * b[i];
    return d;
};
const pairCache = new Map();
const pairCos = (a, b) => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    let v = pairCache.get(key);
    if (v === undefined) {
        v = dot(embedding.get(a), embedding.get(b));
        pairCache.set(key, v);
    }
    return v;
};
const jaccard = (a, b) => {
    const inter = [...a].filter((x) => b.has(x)).length;
    const union = a.size + b.size - inter;
    return union ? inter / union : 0;
};

const os = new OpenSearch({ node: process.env.OPENSEARCH_URL ?? 'http://localhost:9200' });
const osIndex = process.env.OPENSEARCH_EMBEDDINGS_INDEX ?? 'recipe-embeddings';
/** kNN on the stored embeddings; `allowed` restricts it to these ids (Lucene pre-filter on the
 *  keyword field `id`, the index has no other fields). Never calls OpenAI. */
async function knn(vector, k, allowed = null) {
    try {
        const inner = { vector, k };
        if (allowed) inner.filter = { terms: { id: allowed } };
        const res = await os.search({
            index: osIndex,
            body: { size: k, _source: false, query: { knn: { embedding: inner } } },
        });
        return res.body.hits.hits.map((h) => h._id);
    } catch (error) {
        return { error: String(error?.message ?? error) };
    }
}
const mainShare = (ids) =>
    Array.isArray(ids)
        ? {
              hits: ids.length,
              mains: ids.filter((id) => byId.has(id) && isMain(byId.get(id))).length,
          }
        : { error: ids.error };

// ── Scoring (prototype of selection-score.ts) ───────────────────────────────────
const W = CONFIG.weights;
const W_SUM = W.taste + W.pick + W.season + W.rating;

/** First formula, kept for the before/after comparison */
function scoreLegacy(pool, taste, picks) {
    const tasteCos = taste ? pool.map((r) => dot(taste, embedding.get(r.id))) : [];
    const lo = Math.min(...tasteCos),
        hi = Math.max(...tasteCos);
    const pickIngredients = new Set(picks.flatMap((p) => [...meaningful(p)]));
    const pickStyles = new Set(picks.flatMap(styleOf));
    const pickProteins = new Set(picks.flatMap(proteinOf));
    return pool.map((r, i) => {
        const tasteS = taste && hi > lo ? (tasteCos[i] - lo) / (hi - lo) : 0.5;
        let pickS = 0.5;
        if (picks.length) {
            const shared = [...meaningful(r)].filter((x) => pickIngredients.has(x));
            const nearest = Math.max(...picks.map((p) => pairCos(r.id, p.id)));
            pickS = clamp01(
                0.5 +
                    (0.5 * Math.min(shared.length, 3)) / 3 -
                    (nearest > CONFIG.nearDuplicate ? 0.5 : 0) -
                    (styleOf(r).some((s) => pickStyles.has(s)) ? 0.15 : 0) -
                    (proteinOf(r).some((s) => pickProteins.has(s)) ? 0.15 : 0),
            );
        }
        const total =
            W.taste * tasteS +
            W.pick * pickS +
            W.season * seasonFit(r) +
            W.rating * clamp01((bayes(r) - 1) / 4);
        return { id: r.id, title: r.title, total: round(total) };
    });
}

/** New formula: relevance 0..1 with parts and a short reason (no diversity yet) */
function scoreRelevance(pool, taste, picks) {
    const tasteCos = taste ? pool.map((r) => dot(taste, embedding.get(r.id))) : [];
    const lo = Math.min(...tasteCos),
        hi = Math.max(...tasteCos);
    const pickIngredients = new Set(picks.flatMap((p) => [...meaningful(p)]));
    const pickArts = new Set(picks.map(artOf));
    const pickStyles = new Set(picks.flatMap(styleOf));
    return pool.map((r, i) => {
        const tasteS = taste && hi > lo ? (tasteCos[i] - lo) / (hi - lo) : 0.5;
        let pickS = 0.5;
        let shared = 0;
        if (picks.length) {
            shared = [...meaningful(r)].filter((x) => pickIngredients.has(x)).length;
            pickS = clamp01(
                0.5 +
                    (0.5 * Math.min(shared, 3)) / 3 -
                    (pickArts.has(artOf(r)) ? 0.2 : 0) -
                    (styleOf(r).some((s) => pickStyles.has(s)) ? 0.1 : 0),
            );
        }
        const seasonS = seasonFit(r);
        const ratingS = clamp01((bayes(r) - 1) / 4);
        const relevance =
            (W.taste * tasteS + W.pick * pickS + W.season * seasonS + W.rating * ratingS) / W_SUM;
        // Reason: the strongest contribution above neutral
        const reasons = [
            taste && { v: W.taste * (tasteS - 0.5) * 2, text: 'Passt zu deinem Geschmack' },
            shared > 0 &&
                picks.length && {
                    v: W.pick * (pickS - 0.5) * 2,
                    text: `Teilt ${shared} ${shared === 1 ? 'Zutat' : 'Zutaten'} mit deiner Auswahl`,
                },
            seasonS === 1 && { v: W.season, text: `Passt zum ${CONFIG.season}` },
            r.ratingCount >= CONFIG.ratingReasonMin &&
                ratingS > 0.7 && {
                    v: W.rating * (ratingS - 0.5) * 2,
                    text: 'Gut bewertet',
                },
            picks.length > 0 && !pickArts.has(artOf(r)) && { v: 0.3, text: `Mal ${artOf(r)}` },
        ]
            .filter(Boolean)
            .sort((a, b) => b.v - a.v);
        return {
            id: r.id,
            title: r.title,
            relevance,
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
            art: artOf(r),
            styles: styleOf(r),
            reason: reasons[0]?.text ?? 'Gut für die Woche',
        };
    });
}

/** Greedy MMR list: relevance minus a penalty for similarity to picks and to cards listed higher */
function buildList(scored, picks, size) {
    const m = CONFIG.mmr;
    const ramp = (cosine) => clamp01((cosine - m.cosStart) / (1 - m.cosStart));
    const chosen = [];
    const ingOf = new Map(scored.map((c) => [c.id, meaningful(byId.get(c.id))]));
    const rest = scored.map((c) => ({ ...c, ing: ingOf.get(c.id) }));
    while (chosen.length < size && rest.length) {
        let best = null;
        for (const c of rest) {
            const simPick = picks.length
                ? Math.max(...picks.map((p) => ramp(pairCos(c.id, p.id))))
                : 0;
            const simList = chosen.length
                ? Math.max(...chosen.map((x) => ramp(pairCos(c.id, x.id))))
                : 0;
            const sameArtList = chosen.filter((x) => x.art === c.art).length;
            const jac = chosen.length
                ? Math.max(...chosen.map((x) => jaccard(c.ing, ingOf.get(x.id))))
                : 0;
            const penalty =
                m.cosWeightPick * simPick +
                m.cosWeightList * simList +
                (picks.some((p) => artOf(p) === c.art) ? m.artPick : 0) +
                m.artList * Math.min(m.artListCap, sameArtList) +
                m.jaccardWeight * clamp01((jac - m.jaccardStart) / (1 - m.jaccardStart));
            const final = c.relevance - penalty;
            if (!best || final > best.final) best = { c, final, penalty };
        }
        rest.splice(rest.indexOf(best.c), 1);
        const { ing: _ing, ...card } = best.c;
        chosen.push({
            ...card,
            relevance: round(card.relevance, 3),
            penalty: round(best.penalty, 3),
            total: round(best.final, 3),
        });
    }
    return chosen;
}

/** Diversity of a list: dish types, largest group and mean pairwise cosine */
function listMetrics(list, taste) {
    const arts = list.map((x) => artOf(byId.get(x.id)));
    const counts = arts.reduce((m, a) => m.set(a, (m.get(a) ?? 0) + 1), new Map());
    let sum = 0,
        n = 0;
    for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
            sum += pairCos(list[i].id, list[j].id);
            n++;
        }
    return {
        distinctArts: counts.size,
        maxSameArt: Math.max(0, ...counts.values()),
        meanPairCos: n ? round(sum / n, 3) : null,
        meanTasteCos: taste
            ? round(list.reduce((t, x) => t + dot(taste, embedding.get(x.id)), 0) / list.length, 3)
            : null,
        arts: Object.fromEntries(counts),
    };
}

function sideFor(main) {
    const needStarch = !hasStarch(main);
    const needVeg = !hasVeg(main);
    const need = needStarch ? 'Beilage' : needVeg ? 'Salat' : null;
    if (!need) return { need: null };
    const e = embedding.get(main.id);
    const fits = (s) =>
        need === 'Beilage'
            ? hasStarch(s)
            : hasVeg(s) && !['Nudeln', 'Reis', 'Kartoffel'].includes(artOf(s));
    const best = sides(need)
        .filter(fits)
        .map((s) => ({ s, v: dot(e, embedding.get(s.id)) * 0.7 + ((bayes(s) - 1) / 4) * 0.3 }))
        .sort((a, b) => b.v - a.v)[0];
    return { need, suggestion: best ? `${best.s.title} (${round(best.v)})` : null };
}

async function probe(userId, mode) {
    const legacy = mode === 'legacy';
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
            ? norm(profile.taste.map(Number))
            : null;
    const out = { user: profile?.nickname ?? '(ohne Profil)', hasTaste: !!taste, rounds: [] };
    const picks = [];
    for (let round_ = 0; round_ <= rounds; round_++) {
        const blend = Math.min(CONFIG.blendMax, CONFIG.blendPerPick * picks.length);
        let vector = null;
        if (taste && picks.length) {
            const centre = mean(picks.map((p) => embedding.get(p.id)));
            vector = norm(taste.map((x, i) => (1 - blend) * x + blend * centre[i]));
        } else if (taste) vector = taste;
        else if (picks.length) vector = norm(mean(picks.map((p) => embedding.get(p.id))));

        const taken = new Set(picks.map((p) => p.id));
        const open = mains.filter((r) => !taken.has(r.id) && embedding.has(r.id));
        let pool = open;
        let knnStats = null;
        if (vector) {
            // Compare the three ways to get the candidates; the list uses the chosen one
            const plain150 = await knn(vector, 150);
            const plainBig = await knn(vector, CONFIG.knnKPlain);
            const filtered = await knn(
                vector,
                CONFIG.knnK,
                open.map((r) => r.id),
            );
            knnStats = {
                plain150: mainShare(plain150),
                [`plain${CONFIG.knnKPlain}`]: mainShare(plainBig),
                filtered: mainShare(filtered),
            };
            const ids = legacy ? plain150 : CONFIG.knnMode === 'filtered' ? filtered : plainBig;
            if (Array.isArray(ids)) {
                const wanted = new Set(open.map((r) => r.id));
                pool = ids.filter((id) => wanted.has(id)).map((id) => byId.get(id));
            }
        }
        if (pool.length < CONFIG.listSize) {
            const extra = open.filter((r) => !pool.includes(r)).sort((a, b) => bayes(b) - bayes(a));
            pool = [...pool, ...extra.slice(0, CONFIG.listSize * 3)];
        }
        let list;
        if (legacy) {
            list = scoreLegacy(pool, taste ?? vector, picks)
                .sort((a, b) => b.total - a.total)
                .slice(0, CONFIG.listSize);
        } else {
            list = buildList(scoreRelevance(pool, taste ?? vector, picks), picks, CONFIG.listSize);
        }
        out.rounds.push({
            picks: picks.map((p) => p.title),
            knn: knnStats,
            poolSize: pool.length,
            metrics: listMetrics(list, taste),
            list: legacy ? list.map((x) => `${x.title} [${artOf(byId.get(x.id))}]`) : list,
        });
        if (round_ < rounds && list[0]) picks.push(byId.get(list[0].id));
    }
    if (legacy) return out;

    // Probier auch mal: decent rating, farthest from the taste (or the picks), one per dish type
    const anchor =
        taste ?? (picks.length ? norm(mean(picks.map((p) => embedding.get(p.id)))) : null);
    const inLists = new Set(out.rounds.flatMap((r) => r.list.map((x) => x.id)));
    const candidates = mains
        .filter((r) => embedding.has(r.id) && !inLists.has(r.id) && bayes(r) >= globalMean)
        .map((r) => ({ r, d: anchor ? dot(anchor, embedding.get(r.id)) : Math.random() }))
        .sort((a, b) => a.d - b.d);
    const usedKeys = new Set();
    out.tryAlso = [];
    for (const { r, d } of candidates) {
        const key = artOf(r);
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        out.tryAlso.push({
            title: r.title,
            art: key,
            cos: round(d, 3),
            reason: `Mal was anderes: ${styleOf(r)[0] ?? key}`,
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
const legacyResults = [];
for (const user of [...users, null]) {
    results.push(await probe(user, 'new'));
    legacyResults.push(await probe(user, 'legacy'));
}

// ── Statistics: rules, dish types, cosine spread, before/after ──────────────────
const legacyStarch = (r) => [...r.roots].some((x) => STARCH_ROOTS.has(x));
const allSides = (cat) =>
    [...byId.values()].filter((r) => r.categories.includes(cat) && !isMain(r));
const sideSuggestions = mains.map(sideFor);
const sampleIds = mains.slice(0, 120).map((r) => r.id);
const pairVals = [];
for (let i = 0; i < sampleIds.length; i++)
    for (let j = i + 1; j < sampleIds.length; j++)
        pairVals.push(pairCos(sampleIds[i], sampleIds[j]));
pairVals.sort((a, b) => a - b);
const pct = (p) => round(pairVals[Math.floor((pairVals.length - 1) * p)], 3);

const ruleStats = {
    mains: mains.length,
    mainsWithEmbedding: mains.filter((r) => embedding.has(r.id)).length,
    withoutIngredients: mains.filter((r) => r.ingredients.length === 0).length,
    beilagen: allSides('Beilage').length,
    salate: allSides('Salat').length,
    beilagenWithoutSauces: sides('Beilage').length,
    salateWithoutDressings: sides('Salat').length,
    globalMeanRating: round(globalMean),
    recipesWithRatings: rated.length,
    before: {
        lackStarch: mains.filter((r) => !legacyStarch(r)).length,
        lackVeg: mains.filter((r) => !r.roots.has('gemuese')).length,
    },
    after: {
        lackStarch: mains.filter((r) => !hasStarch(r)).length,
        lackVeg: mains.filter((r) => !hasVeg(r)).length,
        rule: {
            needSide: sideSuggestions.filter((x) => x.need === 'Beilage').length,
            needSalad: sideSuggestions.filter((x) => x.need === 'Salat').length,
            needNothing: sideSuggestions.filter((x) => !x.need).length,
            withoutSuggestion: sideSuggestions.filter((x) => x.need && !x.suggestion).length,
        },
    },
};
const artHistogram = mains.reduce((m, r) => ({ ...m, [artOf(r)]: (m[artOf(r)] ?? 0) + 1 }), {});
const avg = (xs) => (xs.length ? round(xs.reduce((s, x) => s + x, 0) / xs.length, 3) : null);
const summarize = (res, knnKey) =>
    res.map((r) => ({
        user: r.user,
        distinctArtsTop12: avg(r.rounds.map((x) => x.metrics.distinctArts)),
        maxSameArtTop12: avg(r.rounds.map((x) => x.metrics.maxSameArt)),
        meanPairCosTop12: avg(r.rounds.map((x) => x.metrics.meanPairCos)),
        meanTasteCosTop12: avg(
            r.rounds.map((x) => x.metrics.meanTasteCos).filter((x) => x !== null),
        ),
        mainsShareInKnn: avg(
            r.rounds
                .filter((x) => x.knn)
                .map((x) => {
                    const k = x.knn[knnKey];
                    return k?.hits ? k.mains / k.hits : 0;
                }),
        ),
    }));
const knnComparison = results.map((r) => ({
    user: r.user,
    rounds: r.rounds.filter((x) => x.knn).map((x) => x.knn),
}));
console.log(
    JSON.stringify(
        {
            config: CONFIG,
            ruleStats,
            artHistogram,
            cosStats: {
                sample: sampleIds.length,
                p10: pct(0.1),
                p50: pct(0.5),
                p90: pct(0.9),
                p99: pct(0.99),
            },
            summary: {
                before: summarize(legacyResults, 'plain150'),
                after: summarize(
                    results,
                    CONFIG.knnMode === 'filtered' ? 'filtered' : `plain${CONFIG.knnKPlain}`,
                ),
            },
            knnComparison,
            results,
            legacy: legacyResults,
        },
        null,
        1,
    ),
);
await db.end();
os.close?.();
