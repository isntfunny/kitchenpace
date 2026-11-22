import { proteinRootsOf, requiredIngredients, type RankingRecipe } from './features';

export type DishType =
    | 'Suppe/Eintopf'
    | 'Salat'
    | 'Nudeln'
    | 'Reis'
    | 'Brot/Teig'
    | 'Kartoffel'
    | 'Hülsenfrüchte'
    | 'Fisch'
    | 'Fleisch'
    | 'Gemüse/Sonstiges';

// Dish type by ingredient names and title keywords, not by ingredient categories (many
// ingredients have none, among them Spaghetti, Reis, Gnocchi, Spätzle). Title hit = 3 points,
// each ingredient hit 1 (max 2); ties follow the order of this list. `ingMin`: ingredient name
// hits needed before the ingredients count at all (a single potato does not make a potato dish).
const ARTS: { name: DishType; ingMin?: number; title: RegExp; ing: RegExp | null }[] = [
    {
        name: 'Suppe/Eintopf',
        title: /suppe|eintopf|bauerntopf|topf\b|chili con|gulasch|minestrone|borschtsch|brühe/,
        ing: null,
    },
    { name: 'Salat', title: /salat/, ing: null },
    {
        name: 'Nudeln',
        ingMin: 1,
        title: /nudel|pasta|spaghetti|penne|tagliatelle|makkaroni|lasagne|cannelloni|tortellini|ravioli|spätzle|schupfnudel|gnocchi|rigatoni|fusilli|maultasche/,
        ing: /nudel|spaghetti|penne|tagliatelle|makkaroni|fusilli|farfalle|rigatoni|lasagne|cannelloni|tortellini|ravioli|spätzle|schupfnudel|gnocchi|maultasche|pasta|linguine|orecchiette|tagliolini/,
    },
    {
        name: 'Reis',
        ingMin: 1,
        title: /\breis\b|reis$|risotto|paella|sushi/,
        ing: /(^|\s)reis\b|reis$|risotto|basmati|jasmin|milchreis|sushi/,
    },
    {
        name: 'Brot/Teig',
        ingMin: 2,
        title: /brot|brötchen|pizza|flammkuchen|teig|tarte|quiche|toast|burger|wrap|tortilla|fladen|focaccia|pfannkuchen|waffel|knödel|zwiebelkuchen|crêpe|crepe/,
        ing: /blätterteig|pizzateig|hefeteig|^hefe\b|toastbrot|brötchen|\bbrot\b|baguette|tortilla|wrap|fladenbrot|ciabatta|burgerbr/,
    },
    {
        name: 'Kartoffel',
        ingMin: 2,
        title: /kartoffel|püree|rösti|pommes|kroketten|stampf|reibekuchen|puffer/,
        ing: /kartoffel/,
    },
    {
        name: 'Hülsenfrüchte',
        ingMin: 2,
        title: /linsen|kichererbsen|bohnen|erbsen|\bdal\b|dhal|hummus|falafel|tofu/,
        ing: /linse|kichererbse|bohne|erbsen|tofu|tempeh|falafel/,
    },
];

export function dishTypeOf(r: RankingRecipe): DishType {
    const title = r.title.toLowerCase();
    const names = requiredIngredients(r).map((i) => i.name.toLowerCase());
    let best: DishType | null = null;
    let bestScore = 0;
    for (const def of ARTS) {
        const hits = def.ing ? names.filter((n) => def.ing!.test(n)).length : 0;
        const score =
            (def.title.test(title) ? 3 : 0) + (hits >= (def.ingMin ?? 1) ? Math.min(2, hits) : 0);
        if (score > bestScore) {
            best = def.name;
            bestScore = score;
        }
    }
    if (best) return best;
    const proteins = proteinRootsOf(r);
    if (proteins.includes('fisch')) return 'Fisch';
    if (proteins.some((x) => x.startsWith('fleisch'))) return 'Fleisch';
    return 'Gemüse/Sonstiges';
}
