/**
 * Main ingredients of a recipe (KUC-131): what a dish "is made of", for the quick filters
 * "Mit Zutaten aus meinem Wochenplan" / "Ohne Hauptzutaten aus meinem Wochenplan".
 *
 * - every required meat, fish or legume line (unless it is only a small amount)
 * - plus the largest vegetable or filling side (pasta, rice, potatoes …), by amount in the
 *   base unit
 *
 * Spices, oils, baking ingredients, kitchen basics (onion, garlic …) and small amounts never
 * count. Ingredients without a category (many on Beta until the enrichment) are classified by
 * name; this fallback is rule based only, no AI. Pure: the index sync and the plan side
 * build the lines from the DB.
 */
import type { BaseUnit } from './types';

export interface MainIngredientLine {
    /** Name as stored in the index (`ingredients`) */
    name: string;
    /** Slugs of the ingredient's categories and their parents; empty = uncategorised */
    categorySlugs: readonly string[];
    optional: boolean;
    /** Amount for the whole recipe in `unit`; missing = unknown */
    amount?: number;
    unit?: BaseUnit;
}

export type MainIngredientKind = 'protein' | 'bulk' | 'other';

/** Below this many grams/millilitres an ingredient only adds flavour */
export const SMALL_AMOUNT_GRAMS = 50;
/** Weight assumed for one piece when the ingredient has no piece weight */
export const PIECE_FALLBACK_GRAMS = 100;

const MEAT_ROOTS = new Set(['fleisch-und-innereien', 'fleisch-und-wurstwaren']);
const FISH_ROOTS = new Set(['fisch']);
const VEG_ROOTS = new Set(['gemuese']);
/** Grain, legume and potato root: legumes are told apart by sub-category or name */
const STARCH_ROOT = 'getreideprodukte-huelsenfruechte-und-kartoffeln';
const LEGUME_SLUG = /huelsenfr/;
const EXCLUDED_ROOTS = new Set(['verschiedenes', 'fette-und-oele']);

const MEAT_NAME =
    /fleisch|hack|rind|schwein|kalb|lamm|hähnchen|haehnchen|hühnchen|huhn|hendl|pute|truthahn|ente$|entenbrust|gans|wildschwein|wildfleisch|^reh|rehrücken|rehkeule|hirsch|kaninchen|speck|schinken|bacon|pancetta|guanciale|salami|wurst|würstchen|chorizo|filet|steak|schnitzel|kotelett|gulasch|geschnetzeltes|leber|frikadelle|bratwurst|mett/;
const FISH_NAME =
    /fisch|lachs|forelle|thunfisch|kabeljau|dorsch|seelachs|zander|hering|makrele|sardine|sardelle|anchovi|garnele|shrimp|scampi|krabbe|muschel|tintenfisch|calamari|oktopus|hummer|scholle|pangasius|tilapia|rotbarsch|karpfen|^aal/;
const LEGUME_NAME =
    /linse|kichererbse|kidney|bohnenkern|weiße bohne|weisse bohne|schwarze bohne|borlotti|cannellini|wachtelbohne|dicke bohne|saubohne|mungbohne|azuki|sojabohne|edamame|lupine|spalterbse|gelbe erbse|^bohnen \(dose\)/;
const STARCH_NAME =
    /nudel|spaghetti|penne|tagliatelle|linguine|makkaroni|maccaroni|fusilli|farfalle|rigatoni|orecchiette|pappardelle|lasagne|cannelloni|tortellini|ravioli|spätzle|schupfnudel|gnocchi|pasta|maultasche|(^|\s)reis\b|reis$|risotto|basmati|kartoffel|süßkartoffel|couscous|bulgur|quinoa|hirse|polenta|graupen|knödel|klöße|kloß|tortilla|wrap/;
const VEG_NAME =
    /tomate|paprika|zucchini|karotte|möhre|mohrrübe|brokkoli|broccoli|spinat|kürbis|gurke|aubergine|lauch|porree|pilz|champignon|kohl|rucola|salat|mangold|fenchel|sellerie|spargel|radieschen|rote bete|pastinake|kohlrabi|erbsen|mais\b|artischocke|rübe|wirsing|chicorée|endivie|bohnen|zuckerschote|feldsalat|blattsalat|eisberg|romana|kopfsalat/;
/** Basics and seasonings that never define a dish, whatever their category; citrus only adds flavour */
const BASIC_NAME =
    /^(salz|pfeffer|wasser|zucker|knoblauch.*|zwiebel.*|schalotte.*|frühlingszwiebel.*|lauchzwiebel.*|ingwer|chili.*|.*öl|essig.*|.*essig|.*brühe|.*fond|tomatenmark|senf|ketchup|sojasauce|sojasoße|honig|zitronensaft|limettensaft)$|zitrone|limette/;
/** Spices, dried herbs, pastes, powders */
const SPICE_NAME =
    /pulver|gewürz|paprikapulver|currypulver|kreuzkümmel|kümmel|zimt|muskat|nelke|lorbeer|kardamom|kurkuma|oregano|thymian|rosmarin|basilikum|petersilie|schnittlauch|dill|koriander|majoran|salbei|minze|estragon|vanille|paste\b|flocken$/;
/** Baking ingredients and binders */
const BAKING_NAME =
    /mehl|stärke|backpulver|natron|hefe|^zucker$|puderzucker|rohrzucker|paniermehl|semmelbrösel|gelatine|kakao|schokolade|marzipan|^butter|margarine|sahne|milch|^eier?$|eigelb|eiweiß/;

const lower = (s: string) => s.toLocaleLowerCase('de-DE').trim();

function isExcludedByName(name: string): boolean {
    return BASIC_NAME.test(name) || SPICE_NAME.test(name) || BAKING_NAME.test(name);
}

/** Protein, vegetable/filling side or neither; uncategorised lines go by name. */
export function classifyIngredient(line: Pick<MainIngredientLine, 'name' | 'categorySlugs'>) {
    const name = lower(line.name);
    if (isExcludedByName(name)) return 'other' as const;
    const slugs = new Set(line.categorySlugs);
    const has = (roots: Set<string>) => [...roots].some((root) => slugs.has(root));

    if (slugs.size > 0) {
        if (has(EXCLUDED_ROOTS)) return 'other' as const;
        if (has(MEAT_ROOTS) || has(FISH_ROOTS)) return 'protein' as const;
        if (slugs.has(STARCH_ROOT)) {
            const legume =
                [...slugs].some((slug) => slug !== STARCH_ROOT && LEGUME_SLUG.test(slug)) ||
                LEGUME_NAME.test(name);
            return legume ? ('protein' as const) : ('bulk' as const);
        }
        if (has(VEG_ROOTS)) return 'bulk' as const;
        return 'other' as const;
    }

    // Rule-based fallback for ingredients without a category
    if (LEGUME_NAME.test(name) || FISH_NAME.test(name) || MEAT_NAME.test(name)) {
        return 'protein' as const;
    }
    if (STARCH_NAME.test(name) || VEG_NAME.test(name)) return 'bulk' as const;
    return 'other' as const;
}

/** Amount in grams (ml count as grams, pieces with the fallback weight); unknown = null. */
function gramsOf(line: MainIngredientLine): number | null {
    if (line.amount === undefined || !line.unit || !(line.amount > 0)) return null;
    return line.unit === 'Stk' ? line.amount * PIECE_FALLBACK_GRAMS : line.amount;
}

const isSmall = (line: MainIngredientLine) => {
    const grams = gramsOf(line);
    return grams !== null && grams < SMALL_AMOUNT_GRAMS;
};

/** Main ingredient names of a recipe, in recipe order, without duplicates. */
export function deriveMainIngredients(lines: readonly MainIngredientLine[]): string[] {
    const required = lines.filter((line) => !line.optional && line.name.trim());
    const kinds = required.map((line) => ({ line, kind: classifyIngredient(line) }));

    const proteins = kinds.filter(({ line, kind }) => kind === 'protein' && !isSmall(line));

    // Largest vegetable or filling side; without any amount the first one in the recipe
    const bulk = kinds.filter(({ line, kind }) => kind === 'bulk' && !isSmall(line));
    let largest: MainIngredientLine | undefined;
    let largestGrams = -1;
    for (const { line } of bulk) {
        const grams = gramsOf(line) ?? 0;
        if (grams > largestGrams) {
            largest = line;
            largestGrams = grams;
        }
    }

    const picked = new Set([...proteins.map(({ line }) => line), ...(largest ? [largest] : [])]);
    const names = required.filter((line) => picked.has(line)).map((line) => line.name.trim());
    return [...new Set(names)];
}
