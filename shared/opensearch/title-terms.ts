// Search terms of a recipe title (KUC-144): compound words are split into known parts,
// parts that are ingredients bring their synonyms and generic words ("Pilzcremesuppe"
// finds "Champignon-Cremesuppe", "Erdäpfel" finds "Kartoffelsuppe"). The index side gets
// parts plus synonyms; a query is only split, never expanded. Pure, no I/O.
import { createHash } from 'node:crypto';

const MIN = 4;
const lower = (s: string) => s.toLocaleLowerCase('de-DE').trim();

/** Words that make up dish names but are no ingredient (split targets only) */
const DISH_WORDS = `suppe creme cremesuppe eintopf auflauf gratin kuchen torte salat braten pfanne
 soße sosse sauce kekse plätzchen brot brötchen knödel klöße kloß püree brei mus curry gulasch
 ragout pfannkuchen waffeln muffins schnitte schnitten taler sterne herzen stollen strudel
 tarte quiche lasagne risotto bowl wrap burger spieße spieß röllchen rouladen roulade frikadellen
 frikadelle bällchen happen häppchen dip aufstrich mousse parfait pudding grütze kompott hack
 schnitzel steak filet keule keulen brust geschnetzeltes ofen blech nudeln schmarrn kipferl
 makronen ecken stangen schnecken zopf kranz gugelhupf rolle tasche taschen füllung puffer
 gefüllt gefüllte gebacken gebackene überbacken knusprig cremig scharf süß sauer`
    .split(/\s+/)
    .filter(Boolean);

/** Dish synonyms no ingredient row knows */
const DISH_SYNONYMS: string[][] = [
    ['frikadelle', 'frikadellen', 'bulette', 'buletten', 'fleischpflanzerl', 'fleischküchle'],
    ['pfannkuchen', 'eierkuchen', 'palatschinken', 'crêpes'],
    ['püree', 'brei', 'stampf'],
    ['soße', 'sosse', 'sauce'],
    ['plätzchen', 'kekse'],
    ['klöße', 'knödel', 'kloß'],
    ['eintopf', 'suppe'],
];

/** Sub-categories that give a generic word, one way only ("pilz" finds Champignon) */
const HYPERNYMS: Record<string, string> = {
    Pilze: 'pilz',
    Kräuter: 'kräuter',
    Geflügel: 'geflügel',
    Rind: 'rind',
    Schwein: 'schwein',
    Kalb: 'kalb',
    Lamm: 'lamm',
    Wild: 'wild',
    Hülsenfrüchte: 'hülsenfrüchte',
    'Meeresfrüchte, Krusten- und Schalentiere': 'meeresfrüchte',
    Meeresfische: 'fisch',
    Süsswasserfische: 'fisch',
};

export type DictionaryIngredient = {
    name: string;
    normalizedName: string | null;
    pluralName: string | null;
    aliases: string[];
    /** rootSlug = slug of the main category */
    categories: { name: string; rootSlug: string }[];
};

export type TitleDictionary = {
    /** whole word → group ids */
    word: Map<string, Set<string>>;
    /** group id → words of the group (synonyms and generic words) */
    group: Map<string, Set<string>>;
    /** Changes whenever the dictionary changes (triggers a full re-sync) */
    hash: string;
};

function stems(word: string): string[] {
    const out = new Set([word]);
    for (const suffix of ['en', 'n', 'e', 's', 'er']) {
        if (word.endsWith(suffix) && word.length - suffix.length >= MIN) out.add(word.slice(0, -suffix.length));
    }
    return [...out];
}

/** Only one-word names count: "Apfel" names the thing, "geschälter Apfel" does not */
const oneWord = (s: string | null | undefined) => {
    const w = lower(s ?? '');
    return w.length >= MIN && /^[\p{L}]+$/u.test(w) ? w : null;
};

export function buildTitleDictionary(ingredients: readonly DictionaryIngredient[]): TitleDictionary {
    const dict: TitleDictionary = { word: new Map(), group: new Map(), hash: '' };
    // Keys are whole words only; lookups try the stems of the looked-up word
    const link = (w: string, id: string) => {
        if (!dict.word.has(w)) dict.word.set(w, new Set());
        dict.word.get(w)!.add(id);
    };
    const add = (w: string, id: string) => {
        link(w, id);
        if (!dict.group.has(id)) dict.group.set(id, new Set());
        dict.group.get(id)!.add(w);
    };
    ingredients.forEach((ing, index) => {
        if (ing.categories.some((c) => c.rootSlug === 'gerichte')) return;
        const display = ing.normalizedName ?? (ing.name.includes(',') ? null : ing.name);
        const base = oneWord(display);
        if (!base) return;
        const id = `i${index}`;
        // Aliases with a comma or bracket are nutrient-table variants ("Champignon, roh")
        const aliases = ing.aliases.filter((a) => !/[,(]/.test(a)).map(oneWord);
        for (const w of new Set([base, oneWord(ing.pluralName), ...aliases])) if (w) add(w, id);
        for (const cat of ing.categories) {
            const h = HYPERNYMS[cat.name];
            if (!h) continue;
            dict.group.get(id)!.add(h);
            add(h, `h:${h}`);
        }
    });
    DISH_SYNONYMS.forEach((g, i) => g.forEach((w) => add(w, `d${i}`)));
    for (const w of DISH_WORDS) if (!dict.word.has(w)) dict.word.set(w, new Set());

    const fingerprint = [...dict.group.values()].map((g) => [...g].sort().join(',')).sort().join('|');
    dict.hash = createHash('sha1').update(`${fingerprint}#${[...dict.word.keys()].sort().join(',')}`).digest('hex');
    return dict;
}

const known = (dict: TitleDictionary, part: string) => stems(part).some((s) => dict.word.has(s));

/** Split with the most known parts (each ≥ 4 letters, linking s/n/en/e/es); null = none */
function splitWord(dict: TitleDictionary, word: string): string[] | null {
    const n = word.length;
    const best: (string[] | null)[] = Array(n + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < n; i++) {
        if (!best[i]) continue;
        for (let j = i + MIN; j <= n; j++) {
            const part = word.slice(i, j);
            if (!known(dict, part)) continue;
            for (const link of ['', 's', 'n', 'en', 'e', 'es']) {
                const k = j + link.length;
                if (k > n || (link && k === n) || word.slice(j, k) !== link) continue;
                const cand = [...best[i]!, part];
                if (!best[k] || cand.length > best[k]!.length) best[k] = cand;
            }
        }
    }
    return best[n];
}

function tokens(text: string): string[] {
    return lower(text)
        .replace(/[^\p{L}\s-]/gu, ' ')
        .split(/[\s-]+/)
        .filter((t) => t.length >= 2);
}

/** A word and its parts if it splits into two or more */
function leaves(dict: TitleDictionary, word: string): string[] {
    const split = word.length >= 2 * MIN ? splitWord(dict, word) : null;
    return split && split.length > 1 ? split : [word];
}

/** Index terms of a title: words, their parts, synonyms and generic words, each with its stems. */
export function titleTerms(dict: TitleDictionary, title: string): string[] {
    const parts = new Set<string>();
    for (const t of tokens(title)) {
        parts.add(t);
        for (const p of leaves(dict, t)) parts.add(p);
    }
    const out = new Set<string>();
    for (const p of parts) {
        out.add(p);
        for (const s of stems(p)) {
            out.add(s);
            for (const id of dict.word.get(s) ?? []) for (const w of dict.group.get(id) ?? []) out.add(w);
        }
    }
    for (const w of [...out]) for (const s of stems(w)) out.add(s);
    return [...out].sort();
}

/** Query leaves, each as the word plus its stems that are dictionary words. */
export function queryLeaves(dict: TitleDictionary, query: string): string[][] {
    return tokens(query)
        .flatMap((t) => leaves(dict, t))
        .map((leaf) => [leaf, ...stems(leaf).slice(1).filter((s) => dict.word.has(s))]);
}

/** Clause for the recipe text query: every leaf must be among the title terms. */
export function titleTermsClause(leafStems: string[][]): Record<string, unknown> | null {
    if (leafStems.length === 0) return null;
    return {
        constant_score: {
            filter: { bool: { must: leafStems.map((s) => ({ terms: { titleTerms: s } })) } },
            boost: 4,
        },
    };
}
