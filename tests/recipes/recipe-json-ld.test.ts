import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mentionsToPlainText } from '../../src/app/recipe/[id]/RecipeJsonLd';
import { isIndexableLanding } from '../../src/lib/keyword-landing';

test('mentions become plain ingredient names in structured data', () => {
    assert.equal(
        mentionsToPlainText('@[Mehl](cmm1), Wasser und @[Salz](cmm2) verkneten.'),
        'Mehl, Wasser und Salz verkneten.',
    );
});

test('a mention with an amount override keeps the amount', () => {
    assert.equal(mentionsToPlainText('@[Butter|50 g](cmm3) schmelzen'), 'Butter (50 g) schmelzen');
});

test('landing pages need five recipes to be indexed', () => {
    assert.equal(isIndexableLanding(4), false);
    assert.equal(isIndexableLanding(5), true);
});
