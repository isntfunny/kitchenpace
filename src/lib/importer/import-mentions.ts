/**
 * Ingredient mentions written by the AI (KUC-115).
 *
 * The model writes `@[Anzeigetext](ingredient-N)` or `@[Anzeigetext|Teilmenge](ingredient-N)`
 * with the temporary ids of its ingredient list. The code only maps those ids
 * to real ones; there is no name search. The display text stays as the model
 * wrote it (inflected, plural), the partial amount stays as written: numbers
 * scale with the portions, free text ("etwas", "Rest") is shown unchanged.
 */

export interface ParsedMention {
    full: string;
    text: string;
    part: string | undefined;
    id: string;
}

/** Same syntax as DescriptionEditor / viewerUtils / recipe-mentions (mentionPattern). */
const mentionRegex = () => /@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g;

export function parseMentions(description: string): ParsedMention[] {
    return [...description.matchAll(mentionRegex())].map((m) => ({
        full: m[0],
        text: m[1],
        part: m[2],
        id: m[3],
    }));
}

/** `@[` that is not the start of a valid mention, e.g. a missing id or bracket. */
export function malformedMentions(description: string): string[] {
    const rest = description.replace(mentionRegex(), '');
    return [...rest.matchAll(/@\[[^\n]{0,40}/g)].map((m) => m[0]);
}

export interface BindMentionsOptions {
    /**
     * What happens with an id that is not in the map:
     * 'text' — the mention becomes plain text (import result), with a warning;
     * 'keep' — left untouched for a later check (save path).
     */
    unknown: 'text' | 'keep';
}

/**
 * Maps the mention ids of every node with `idMap` and derives `ingredientIds`
 * from the mentions (order of first appearance). Display text and partial
 * amount are kept as written.
 */
export function bindMentions<T extends { id: string; description: string }>(
    nodes: T[],
    idMap: ReadonlyMap<string, string>,
    options: BindMentionsOptions,
): { nodes: (T & { ingredientIds: string[] })[]; warnings: string[] } {
    const warnings: string[] = [];
    const bound = nodes.map((node) => {
        const ids: string[] = [];
        const description = node.description.replace(
            mentionRegex(),
            (full, text: string, part: string | undefined, id: string) => {
                const mapped = idMap.get(id);
                if (mapped) {
                    ids.push(mapped);
                    return `@[${text}${part !== undefined ? `|${part}` : ''}](${mapped})`;
                }
                if (options.unknown === 'keep') {
                    ids.push(id);
                    return full;
                }
                warnings.push(
                    `Schritt "${node.id}": Erwähnung "${text}" verweist auf unbekannte Zutat "${id}" und wurde zu Text`,
                );
                return part ? `${text} (${part})` : text;
            },
        );
        return { ...node, description, ingredientIds: [...new Set(ids)] };
    });
    return { nodes: bound, warnings };
}
