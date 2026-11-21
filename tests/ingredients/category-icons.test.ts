import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planCategoryIconUpdates } from '../../shared/ingredient-icons/category-sync';
import { MAIN_CATEGORY_ICONS } from '../../shared/ingredient-icons/resolve';

const row = (
    slug: string,
    extra: Partial<{ parentId: string | null; icon: string | null }> = {},
) => ({
    id: `id-${slug}`,
    slug,
    parentId: null,
    icon: null,
    ...extra,
});

test('all 19 main categories without icon are planned', () => {
    const rows = Object.keys(MAIN_CATEGORY_ICONS).map((slug) => row(slug));
    assert.equal(planCategoryIconUpdates(rows).length, 19);
});

test('categories that already have an icon are kept', () => {
    const plan = planCategoryIconUpdates([row('gemuese', { icon: 'corn' }), row('fisch')]);
    assert.deepEqual(plan, [{ id: 'id-fisch', slug: 'fisch', icon: 'fish' }]);
});

test('subcategories and unknown slugs are skipped', () => {
    const plan = planCategoryIconUpdates([row('gemuese', { parentId: 'p' }), row('etwas-anderes')]);
    assert.deepEqual(plan, []);
});

test('a second run after applying plans nothing', () => {
    const rows = [row('eier'), row('fisch')];
    const applied = rows.map((r) => ({
        ...r,
        icon: planCategoryIconUpdates([r])[0]?.icon ?? null,
    }));
    assert.deepEqual(planCategoryIconUpdates(applied), []);
});
