import assert from 'node:assert/strict';
import { test } from 'node:test';

import { columnsForWidth } from '../../src/app/recipes/components/grid-columns';

test('columns follow the container width', () => {
    assert.equal(columnsForWidth(320, 'grid'), 1);
    assert.equal(columnsForWidth(520, 'grid'), 2);
    assert.equal(columnsForWidth(900, 'grid'), 3);
    assert.equal(columnsForWidth(900, 'list'), 1);
    assert.equal(columnsForWidth(0, 'grid'), 1);
});
