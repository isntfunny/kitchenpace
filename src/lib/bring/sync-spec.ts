// Bring! "specification" ⇄ KochTakt amount and note (KUC-106). Bring! knows only one free
// text per item, so amount and note share it: "400 g · Bio". The first part counts as the
// amount when it starts with a number; everything else is the note.
import {
    addToQuantity,
    EMPTY_QUANTITY,
    formatQuantity,
    type StoredQuantity,
} from '@app/lib/shopping/quantity';

export const SPEC_SEPARATOR = ' · ';
const MAX_SPEC = 500;

export interface SpecSource extends StoredQuantity {
    note: string | null;
}

export interface ParsedSpec extends StoredQuantity {
    note: string | null;
}

/** What KochTakt writes to Bring! for an item. */
export function specFromItem(item: SpecSource): string {
    return [formatQuantity(item), item.note?.trim()]
        .filter((part): part is string => !!part)
        .join(SPEC_SEPARATOR)
        .slice(0, MAX_SPEC);
}

const AMOUNT = /^(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*(\D.{0,19})?$/;

/** Reads what Bring! shows back into amount and note. Unknown units stay as text. */
export function parseSpec(spec: string | null | undefined): ParsedSpec {
    const text = (spec ?? '').trim();
    if (!text) return { ...EMPTY_QUANTITY, note: null };
    const [first, ...rest] = text.split(SPEC_SEPARATOR);
    if (!/^\d/.test(first)) return { ...EMPTY_QUANTITY, note: text.slice(0, 500) };
    let quantity: StoredQuantity = { ...EMPTY_QUANTITY };
    for (const chunk of first.split(' + ')) {
        const match = AMOUNT.exec(chunk.trim());
        if (match && !match[1].includes('/')) {
            quantity = addToQuantity(quantity, match[1], match[2]?.trim() || null);
        } else {
            // Fractions and anything unusual stay as the user wrote them
            const text = chunk.trim();
            quantity = {
                ...quantity,
                quantityText: quantity.quantityText ? `${quantity.quantityText} + ${text}` : text,
            };
        }
    }
    const note = rest.join(SPEC_SEPARATOR).trim();
    return { ...quantity, note: note ? note.slice(0, 500) : null };
}
