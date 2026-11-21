import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    expiryHint,
    formatPantryAmount,
    groupPantryItems,
    type PantryViewInput,
} from '../../src/lib/pantry/view';

const NOW = new Date('2026-03-10T10:00:00+01:00');
const at = (day: string) => new Date(`${day}T12:00:00+01:00`);

describe('formatPantryAmount', () => {
    const base = { quantityText: null, approximate: false };
    it('formats units and marks uncertain amounts with ~', () => {
        assert.equal(formatPantryAmount({ ...base, quantity: 100, baseUnit: 'ML' }), '100 ml');
        assert.equal(
            formatPantryAmount({ ...base, quantity: 100, baseUnit: 'ML', approximate: true }),
            '~100 ml',
        );
        assert.equal(formatPantryAmount({ ...base, quantity: 1500, baseUnit: 'G' }), '1,5 kg');
        assert.equal(formatPantryAmount({ ...base, quantity: 2.5, baseUnit: 'PIECE' }), '2,5 Stk');
        assert.equal(formatPantryAmount({ ...base, quantity: 1000, baseUnit: 'ML' }), '1 l');
    });
    it('falls back to the text, or nothing', () => {
        assert.equal(
            formatPantryAmount({
                quantity: null,
                baseUnit: null,
                quantityText: '1 Bund',
                approximate: false,
            }),
            '1 Bund',
        );
        assert.equal(formatPantryAmount({ ...base, quantity: null, baseUnit: null }), null);
    });
});

describe('expiryHint', () => {
    it('words the days left', () => {
        assert.equal(expiryHint(null, NOW), null);
        assert.equal(expiryHint(at('2026-03-09'), NOW)?.label, 'seit gestern abgelaufen');
        assert.equal(expiryHint(at('2026-03-07'), NOW)?.label, 'seit 3 T. abgelaufen');
        assert.equal(expiryHint(at('2026-03-10'), NOW)?.label, 'läuft heute ab');
        assert.equal(expiryHint(at('2026-03-11'), NOW)?.label, 'läuft morgen ab');
        assert.equal(expiryHint(at('2026-03-13'), NOW)?.label, 'läuft in 3 T. ab');
        assert.deepEqual(expiryHint(at('2026-03-20'), NOW), {
            label: 'bis 20.03.',
            tone: 'ok',
            days: 10,
        });
    });
});

describe('groupPantryItems', () => {
    const item = (
        id: string,
        name: string,
        extra: Partial<PantryViewInput> = {},
    ): PantryViewInput => ({
        id,
        name,
        quantity: null,
        baseUnit: null,
        quantityText: null,
        approximate: false,
        openedAt: null,
        expiresAt: null,
        ...extra,
    });

    it('groups into expiring, opened and the rest, skipping empty groups', () => {
        const groups = groupPantryItems(
            [
                item('1', 'Mehl'),
                item('2', 'Butter', { openedAt: at('2026-03-05'), expiresAt: at('2026-03-30') }),
                item('3', 'Sahne', { openedAt: at('2026-03-09'), expiresAt: at('2026-03-12') }),
                item('4', 'Joghurt', { expiresAt: at('2026-03-09') }),
            ],
            NOW,
        );
        assert.deepEqual(
            groups.map((g) => [g.key, g.items.map((i) => i.name)]),
            [
                ['expiring', ['Joghurt', 'Sahne']],
                ['opened', ['Butter']],
                ['other', ['Mehl']],
            ],
        );
        assert.deepEqual(groupPantryItems([], NOW), []);
    });
});
