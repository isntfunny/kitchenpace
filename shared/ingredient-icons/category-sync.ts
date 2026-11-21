// Which category rows get their fixed icon (KUC-125). Pure planning; the CLI
// command and the ingredient seeder apply it.

import { MAIN_CATEGORY_ICONS } from './resolve';

export interface CategoryIconRow {
    id: string;
    slug: string;
    parentId: string | null;
    icon: string | null;
}

export interface CategoryIconUpdate {
    id: string;
    slug: string;
    icon: string;
}

/**
 * Main categories (no parent) with a fixed icon and no stored icon yet. Rows
 * that already have an icon are never touched, so manual changes survive, and
 * a second run finds nothing to do. Subcategories inherit and get none.
 */
export function planCategoryIconUpdates(rows: readonly CategoryIconRow[]): CategoryIconUpdate[] {
    const fixed = MAIN_CATEGORY_ICONS as Record<string, string>;
    return rows.flatMap((row) =>
        row.parentId === null && !row.icon && fixed[row.slug]
            ? [{ id: row.id, slug: row.slug, icon: fixed[row.slug] }]
            : [],
    );
}
