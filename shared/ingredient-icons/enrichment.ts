// Icon part of the ingredient enrichment (KUC-125). The model may only answer
// with a name from the allowed list (strict JSON schema enum); an answer that is
// not on it, or null, stores no icon, so the fallback chain applies
// (shared/ingredient-icons/resolve.ts). Used by the nutrition request (new
// ingredients and the daily batch) and the one-off icon backfill.

import { ENRICHMENT_ICON_NAMES, type IngredientIconName } from './names';

const ENRICHMENT_SET = new Set<string>(ENRICHMENT_ICON_NAMES);

/** JSON schema property: an allowed name, or null if none fits. */
export function getIconSchemaProperty() {
    return {
        type: ['string', 'null'],
        enum: [...ENRICHMENT_ICON_NAMES, null],
        description:
            'Icon-Name aus der Liste; das Icon, das die Zutat auf einer Einkaufsliste am besten zeigt. null, wenn kein Icon wirklich passt.',
    };
}

/** Prompt section: rules plus the list of names. */
export function buildIconPromptRules(): string {
    return `ICON-REGELN:
- Wähle für die Zutat GENAU EIN Icon aus der Liste der erlaubten Namen oder null.
- Wähle das Icon, das ein Mensch auf einer Einkaufsliste sofort mit dieser Zutat verbindet. Bevorzuge das konkrete Lebensmittel (Karotte → carrot, Vollmilch → milk, Gouda → cheese) vor einem allgemeinen Icon.
- Passt kein Icon wirklich, antworte null (die App nimmt dann das Icon der Kategorie). Rate nicht.
- Erfinde keine Namen; nur Namen aus der Liste sind erlaubt.

ERLAUBTE ICON-NAMEN:
${ENRICHMENT_ICON_NAMES.join(', ')}`;
}

/** The icon of a model answer if it is an allowed name; otherwise null. */
export function parseIconAnswer(value: unknown): IngredientIconName | null {
    return typeof value === 'string' && ENRICHMENT_SET.has(value)
        ? (value as IngredientIconName)
        : null;
}
