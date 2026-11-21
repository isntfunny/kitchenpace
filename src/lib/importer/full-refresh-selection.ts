/**
 * Fixed selection of the full re-import (KUC-115): `select --full` writes the
 * recipe ids once to selection.json, `submit --full --chunk N/M` or
 * `--ids-file` takes its part of exactly that list. Recipes imported or
 * deleted in between cannot shift the parts. Pure; the CLI does the I/O.
 */

export interface FullSelection {
    kind: 'full-selection';
    createdAt: string;
    /** In submit order */
    ids: string[];
    /** For reading the file; submit only uses ids */
    recipes: { id: string; title: string; sourceUrl: string }[];
}

export function isFullSelection(value: unknown): value is FullSelection {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { kind?: unknown }).kind === 'full-selection' &&
        Array.isArray((value as { ids?: unknown }).ids)
    );
}

export interface Chunk {
    /** 1-based */
    index: number;
    total: number;
}

/** "2/5" → part 2 of 5. */
export function parseChunk(text: string): Chunk {
    const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
    const index = match ? Number(match[1]) : NaN;
    const total = match ? Number(match[2]) : NaN;
    if (!match || total < 1 || index < 1 || index > total)
        throw new Error(`--chunk erwartet N/M mit 1 ≤ N ≤ M, nicht "${text}"`);
    return { index, total };
}

/** Part `index` of `total` contiguous parts; sizes differ by at most one. */
export function chunkIds(ids: readonly string[], chunk: Chunk): string[] {
    const base = Math.floor(ids.length / chunk.total);
    const extra = ids.length % chunk.total;
    const start = (chunk.index - 1) * base + Math.min(chunk.index - 1, extra);
    const size = base + (chunk.index <= extra ? 1 : 0);
    return ids.slice(start, start + size);
}

/**
 * Ids from an --ids-file: a selection.json, a JSON array of ids, or one id
 * per line (blank lines and # comments ignored). Duplicates removed, order kept.
 */
export function parseIdsFile(text: string): string[] {
    const trimmed = text.trim();
    let ids: unknown[];
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed: unknown = JSON.parse(trimmed);
        if (isFullSelection(parsed)) ids = parsed.ids;
        else if (Array.isArray(parsed)) ids = parsed;
        else
            throw new Error(
                '--ids-file: JSON muss eine Auswahl (selection.json) oder eine Liste sein',
            );
    } else
        ids = trimmed
            .split('\n')
            .map((line) => line.replace(/#.*$/, '').trim())
            .filter(Boolean);
    if (!ids.every((id) => typeof id === 'string' && id.trim() !== ''))
        throw new Error('--ids-file: jede ID muss ein nicht leerer Text sein');
    return [...new Set((ids as string[]).map((id) => id.trim()))];
}
