/**
 * "Dazu passt": a main dish that lacks something filling or vegetables gets at most one
 * side (KUC-126). Constants and regexes come from `scripts/probe-week-selection.mjs`.
 */
import { requiredIngredients, rootsOf, type RankingRecipe } from '../recipe-ranking/features';
import { bayesRating, dot } from '../recipe-ranking/vector';
import { RANKING_CONFIG } from '../recipe-ranking/config';

export type SideNeed = 'starch' | 'veg' | null;

const STARCH_ROOTS = new Set([
    'getreideprodukte-huelsenfruechte-und-kartoffeln',
    'brote-flocken-und-fruehstueckscerealien',
]);

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

export const isSauceTitle = (title: string): boolean => SAUCE_TITLE.test(title.toLowerCase());

/** What the main dish lacks. Something filling wins over vegetables. */
export function sideNeedOf(main: RankingRecipe): SideNeed {
    const names = requiredIngredients(main).map((i) => i.name.toLowerCase());
    const roots = rootsOf(main);
    const hasStarch =
        names.some((n) => STARCH_NAME.test(n)) || [...roots].some((x) => STARCH_ROOTS.has(x));
    if (!hasStarch) return 'starch';
    const hasVeg =
        names.some((n) => VEG_NAME.test(n) && !NOT_VEG_NAME.test(n)) || roots.has('gemuese');
    return hasVeg ? null : 'veg';
}

/**
 * Best side for the main dish among `candidates` (already filtered by the caller's filters;
 * remove a taken side before asking for the next main to avoid duplicates). Starch → category
 * `beilage`, vegetables → `salat`; never a main dish, never a sauce. Rank = 0.7 · cosine to the
 * main + 0.3 · damped rating on 0..1.
 */
export function pickSide(
    main: RankingRecipe,
    candidates: RankingRecipe[],
): { id: string; need: Exclude<SideNeed, null> } | null {
    const need = sideNeedOf(main);
    if (!need) return null;
    const category = need === 'starch' ? 'beilage' : 'salat';
    let best: { id: string; value: number } | null = null;
    for (const c of candidates) {
        if (!c.categorySlugs.includes(category) || c.categorySlugs.includes('hauptgericht'))
            continue;
        if (isSauceTitle(c.title)) continue;
        const cos = main.embedding && c.embedding ? dot(main.embedding, c.embedding) : 0;
        const ratingPart =
            (bayesRating(c.rating, c.ratingCount, 3.5, RANKING_CONFIG.bayesM) - 1) / 4;
        const value = cos * 0.7 + ratingPart * 0.3;
        if (!best || value > best.value) best = { id: c.id, value };
    }
    return best ? { id: best.id, need } : null;
}
