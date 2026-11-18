// Duplicate groups by normalized display name (KUC-114). Pure, no database.

export interface DuplicateCandidate {
    id: string;
    name: string;
    normalizedName: string | null;
    recipeCount: number;
    shelfLifeSource?: string | null;
    swissFoodId?: number | null;
}

export interface DuplicateGroup<T extends DuplicateCandidate = DuplicateCandidate> {
    key: string;
    normalizedName: string;
    /** Suggested ingredient to keep */
    suggestedKeepId: string;
    members: T[];
}

export const duplicateKey = (normalizedName: string) =>
    normalizedName.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');

/**
 * Suggests the entry to keep: most recipe uses, then manually maintained
 * shelf life, then Swiss Food DB reference (nutrition), then the shortest name.
 */
export function suggestKeep<T extends DuplicateCandidate>(members: T[]): T {
    return [...members].sort(
        (a, b) =>
            b.recipeCount - a.recipeCount ||
            Number(b.shelfLifeSource === 'MANUAL') - Number(a.shelfLifeSource === 'MANUAL') ||
            Number(b.swissFoodId != null) - Number(a.swissFoodId != null) ||
            a.name.length - b.name.length ||
            a.name.localeCompare(b.name, 'de'),
    )[0];
}

/** Ingredients sharing a normalized name (case-insensitive), largest groups first. */
export function findDuplicateGroups<T extends DuplicateCandidate>(rows: T[]): DuplicateGroup<T>[] {
    const byKey = new Map<string, T[]>();
    for (const row of rows) {
        if (!row.normalizedName?.trim()) continue;
        const key = duplicateKey(row.normalizedName);
        byKey.set(key, [...(byKey.get(key) ?? []), row]);
    }
    return [...byKey.entries()]
        .filter(([, members]) => members.length > 1)
        .map(([key, members]) => {
            const keep = suggestKeep(members);
            return {
                key,
                normalizedName: keep.normalizedName!.trim(),
                suggestedKeepId: keep.id,
                members: [keep, ...members.filter((member) => member !== keep)],
            };
        })
        .sort(
            (a, b) =>
                b.members.reduce((sum, m) => sum + m.recipeCount, 0) -
                    a.members.reduce((sum, m) => sum + m.recipeCount, 0) ||
                a.normalizedName.localeCompare(b.normalizedName, 'de'),
        );
}
