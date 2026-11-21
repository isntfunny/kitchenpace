import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeShelfLife, formatShelfLifeDays } from './describe';

test('formatShelfLifeDays rounds to days, weeks, months and years', () => {
    assert.equal(formatShelfLifeDays(1), '1 Tag');
    assert.equal(formatShelfLifeDays(3), '3 Tage');
    assert.equal(formatShelfLifeDays(13), '13 Tage');
    assert.equal(formatShelfLifeDays(14), 'etwa 2 Wochen');
    assert.equal(formatShelfLifeDays(28), 'etwa 4 Wochen');
    assert.equal(formatShelfLifeDays(90), 'etwa 3 Monate');
    assert.equal(formatShelfLifeDays(61), 'etwa 2 Monate');
    assert.equal(formatShelfLifeDays(365), 'etwa 1 Jahr');
    assert.equal(formatShelfLifeDays(730), 'etwa 2 Jahre');
    assert.equal(formatShelfLifeDays(3650), 'praktisch unbegrenzt');
});

test('not assessed or not applicable shows nothing', () => {
    const base = { defaultStorage: null, openedShelfLifeDays: null };
    assert.equal(describeShelfLife({ ...base, shelfLifeSource: null, storageLives: [] }), null);
    assert.equal(describeShelfLife({ ...base, shelfLifeSource: 'AI', storageLives: [] }), null);
    assert.equal(
        describeShelfLife({
            ...base,
            shelfLifeSource: null,
            storageLives: [{ storage: 'FRIDGE', days: 3 }],
        }),
        null,
    );
});

test('minced meat: default storage first, opened same day, immediate', () => {
    const summary = describeShelfLife({
        shelfLifeSource: 'AI',
        defaultStorage: 'FRIDGE',
        openedShelfLifeDays: 0,
        storageLives: [
            { storage: 'FREEZER', days: 90 },
            { storage: 'FRIDGE', days: 2 },
        ],
    });
    assert.deepEqual(
        summary?.entries.map((e) => [e.label, e.duration, e.isDefault]),
        [
            ['Kühlschrank', '2 Tage', true],
            ['Tiefkühler', 'etwa 3 Monate', false],
        ],
    );
    assert.equal(summary?.opened, 'am selben Tag verbrauchen');
    assert.equal(summary?.perishability, 'IMMEDIATE');
});

test('opening that changes nothing is not shown', () => {
    const summary = describeShelfLife({
        shelfLifeSource: 'AI',
        defaultStorage: 'PANTRY',
        openedShelfLifeDays: 3650,
        storageLives: [{ storage: 'PANTRY', days: 3650 }],
    });
    assert.equal(summary?.opened, null);
    assert.equal(summary?.perishability, 'LOW');
});

test('frozen peas keep the freezer as the usual storage', () => {
    const summary = describeShelfLife({
        shelfLifeSource: 'MANUAL',
        defaultStorage: 'FREEZER',
        openedShelfLifeDays: 2,
        storageLives: [
            { storage: 'FRIDGE', days: 2 },
            { storage: 'FREEZER', days: 270 },
        ],
    });
    assert.deepEqual(
        summary?.entries.map((e) => e.storage),
        ['FREEZER', 'FRIDGE'],
    );
    assert.equal(summary?.opened, '2 Tage');
});
