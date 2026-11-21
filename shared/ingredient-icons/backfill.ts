// One-off icon backfill for existing ingredients (KUC-125): a small request per
// chunk of ingredients, answered with one allowed icon name each. No web search.
// Names and rules are the same as in the enrichment of new ingredients.

import { buildIconPromptRules, getIconSchemaProperty, parseIconAnswer } from './enrichment';
import type { IngredientIconName } from './names';

export const ICON_PROMPT_VERSION = 'v1';

export const ICON_BACKFILL_PROMPT = `Du wählst für eine deutsche Koch-App zu jeder übergebenen Zutat ein Icon für die Einkaufsliste.

${buildIconPromptRules()}

Gib für JEDE übergebene id genau einen Eintrag zurück, unverändert.`;

export function getIconBackfillResponseFormat() {
    return {
        type: 'json_schema' as const,
        name: 'ingredient_icons',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { id: { type: 'string' }, icon: getIconSchemaProperty() },
                        required: ['id', 'icon'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['items'],
            additionalProperties: false,
        },
    };
}

/** Input text for one request: the ingredients as compact JSON. */
export function buildIconBackfillInput(ingredients: Array<{ id: string; name: string }>): string {
    return `Zutaten (JSON):\n${JSON.stringify(ingredients.map(({ id, name }) => ({ id, name })))}`;
}

export interface IconAnswer {
    id: string;
    /** Allowed name, or null if the model chose none or an unknown name */
    icon: IngredientIconName | null;
}

/** Entries of a parsed answer with a string id; icons not on the list become null. */
export function extractIconAnswers(parsed: unknown): IconAnswer[] {
    const items = (parsed as { items?: unknown } | null)?.items;
    if (!Array.isArray(items)) throw new Error('Antwort ohne items-Liste');
    return items.flatMap((item): IconAnswer[] => {
        const id = (item as { id?: unknown } | null)?.id;
        if (typeof id !== 'string' || id === '') return [];
        return [{ id, icon: parseIconAnswer((item as { icon?: unknown }).icon) }];
    });
}
