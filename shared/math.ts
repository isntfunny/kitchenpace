/** Small numeric helpers shared by ranking, planning and theme clusters (KUC-139). */

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Jaccard similarity |A ∩ B| / |A ∪ B|. Two empty sets have no defined overlap, so the caller
 * says what they count as: `bothEmpty: 1` ("nothing changed", theme cluster labels) or
 * `bothEmpty: 0` ("nothing in common", MMR penalty).
 */
export function jaccard(
    a: Iterable<string>,
    b: Iterable<string>,
    options: { bothEmpty: 0 | 1 },
): number {
    const setA: ReadonlySet<string> = a instanceof Set ? a : new Set(a);
    const setB: ReadonlySet<string> = b instanceof Set ? b : new Set(b);
    let intersection = 0;
    for (const value of setA) if (setB.has(value)) intersection++;
    const union = setA.size + setB.size - intersection;
    return union ? intersection / union : options.bothEmpty;
}
