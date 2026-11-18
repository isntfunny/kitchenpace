import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findDuplicateGroups } from './duplicate-groups';
import { mergedAliases } from './merge-group';

test('groups by normalized name, case- and space-insensitive', () => {
    const groups = findDuplicateGroups([
        { id: 'a', name: 'Butterkeks(e)', normalizedName: 'Butterkeks', recipeCount: 1 },
        { id: 'b', name: 'Butterkekse', normalizedName: 'butterkeks ', recipeCount: 4 },
        { id: 'c', name: 'Butterkeks', normalizedName: 'Butterkeks', recipeCount: 0 },
        { id: 'd', name: 'Ei', normalizedName: 'Ei', recipeCount: 9 },
        { id: 'e', name: 'Mehl', normalizedName: null, recipeCount: 2 },
    ]);
    assert.equal(groups.length, 1);
    assert.deepEqual(
        groups[0].members.map((m) => m.id),
        ['b', 'a', 'c'],
    );
    assert.equal(groups[0].suggestedKeepId, 'b');
});

test('suggestion prefers more recipes, then MANUAL, then Swiss Food DB', () => {
    const [group] = findDuplicateGroups([
        { id: 'x', name: 'Hühnerei, ganz', normalizedName: 'Ei', recipeCount: 3, swissFoodId: 1 },
        { id: 'y', name: 'Ei', normalizedName: 'Ei', recipeCount: 3, shelfLifeSource: 'MANUAL' },
    ]);
    assert.equal(group.suggestedKeepId, 'y');
    const [swiss] = findDuplicateGroups([
        { id: 'x', name: 'Hühnerei, ganz', normalizedName: 'Ei', recipeCount: 3, swissFoodId: 1 },
        { id: 'y', name: 'Ei', normalizedName: 'Ei', recipeCount: 3 },
    ]);
    assert.equal(swiss.suggestedKeepId, 'x');
});

test('merged names become lower-case aliases without the kept name', () => {
    assert.deepEqual(
        mergedAliases({ name: 'Ei', aliases: ['eier'] }, [
            { name: 'Hühnerei, ganz', aliases: ['ei', 'Hühnerei'] },
        ]),
        ['eier', 'hühnerei, ganz', 'hühnerei'],
    );
});
