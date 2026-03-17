/**
 * Smart ingredient input parser.
 * Extracts amount, unit, and ingredient name from free-text input like
 * "200g Spaghetti", "Spaghetti 200g", "3 Eier", or "Apfel".
 */

export interface ParsedIngredientInput {
    /** Ingredient name with amount/unit stripped */
    name: string;
    /** Extracted amount string, e.g. "200", "1/2", "" */
    amount: string;
    /** Matched unit shortName, or null if none matched */
    unit: string | null;
}

export interface UnitEntry {
    shortName: string;
    longName: string;
}

export function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a cached parser from a list of known units.
 * Returns a parse function that extracts amount+unit+name from raw input.
 */
export function buildIngredientParser(units: UnitEntry[]) {
    // Build lookup: lowercase → canonical shortName
    const unitLookup = new Map<string, string>();
    for (const u of units) {
        unitLookup.set(u.shortName.toLowerCase(), u.shortName);
        unitLookup.set(u.longName.toLowerCase(), u.shortName);
    }

    // Build alternation pattern, longest first to avoid partial matches
    const allNames = units.flatMap((u) => [u.shortName, u.longName]);
    allNames.sort((a, b) => b.length - a.length);
    const unitPattern = allNames.map(escapeRegex).join('|');

    // Amount pattern: digits, optionally with decimals, commas, fractions, ranges
    const amountPattern = '(\\d+[\\d.,/\\-]*)';

    // "200g Spaghetti" or "200 g Spaghetti"
    const frontRegex = new RegExp(`^${amountPattern}\\s*(${unitPattern})\\b\\s*(.+)$`, 'i');

    // "Spaghetti 200g" or "Spaghetti 200 g"
    const endRegex = new RegExp(`^(.+?)\\s+${amountPattern}\\s*(${unitPattern})$`, 'i');

    // "3 Eier" — amount without unit
    const amountOnlyRegex = new RegExp(`^${amountPattern}\\s+(.+)$`);

    return function parseIngredientInput(raw: string): ParsedIngredientInput {
        const trimmed = raw.trim();
        if (!trimmed) return { name: '', amount: '', unit: null };

        // Try front-anchored: "200g Spaghetti"
        let m = frontRegex.exec(trimmed);
        if (m) {
            const matchedUnit = unitLookup.get(m[2].toLowerCase()) ?? m[2];
            return {
                name: m[3].trim(),
                amount: m[1],
                unit: matchedUnit,
            };
        }

        // Try end-anchored: "Spaghetti 200g"
        m = endRegex.exec(trimmed);
        if (m) {
            const matchedUnit = unitLookup.get(m[3].toLowerCase()) ?? m[3];
            return {
                name: m[1].trim(),
                amount: m[2],
                unit: matchedUnit,
            };
        }

        // Amount only, no unit: "3 Eier" → default to Stk
        m = amountOnlyRegex.exec(trimmed);
        if (m) {
            return {
                name: m[2].trim(),
                amount: m[1],
                unit: 'Stk',
            };
        }

        // No amount/unit found: just a name
        return { name: trimmed, amount: '', unit: null };
    };
}
