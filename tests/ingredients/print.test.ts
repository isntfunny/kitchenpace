import assert from 'node:assert/strict';
import { test } from 'node:test';

import { printRecipe } from '../../src/app/recipe/[id]/components/PrintRecipe';

test('print uses original quantities and resolves partial mentions without injecting recipe HTML', () => {
    let html = '';
    const original = globalThis.window;
    (globalThis as any).window = {
        open: () => ({
            document: {
                write: (s: string) => {
                    html = s;
                },
                close() {},
            },
            setTimeout() {},
        }),
    };
    try {
        printRecipe(
            {
                title: '<script>bad</script>',
                prepTime: 1,
                cookTime: 2,
                servings: 5,
                category: 'Test',
                difficulty: 'Einfach',
                ingredients: [
                    {
                        id: 'a',
                        ingredientId: 'milk',
                        name: 'Milch',
                        amount: 0,
                        rawAmount: '1/2',
                        unit: 'l',
                    },
                    {
                        id: 'b',
                        ingredientId: 'eggs',
                        name: 'Ei',
                        amount: 2,
                        rawAmount: '2–3',
                        unit: 'Stück',
                    },
                    {
                        id: 'c',
                        ingredientId: 'salt',
                        name: 'Salz',
                        amount: 0,
                        rawAmount: '',
                        unit: '',
                        notes: 'nach Geschmack',
                    },
                ],
                flow: {
                    nodes: [
                        {
                            id: 'step',
                            type: 'mixen',
                            position: { x: 0, y: 0 },
                            label: 'Mischen',
                            description: '@[Milch|100 ml](a) mit @[Ei](b) und @[Salz](c) mischen.',
                        },
                    ],
                    edges: [],
                },
            } as any,
            10,
        );
        assert.match(html, /1 l/);
        assert.match(html, /4–6 Stück/);
        assert.match(html, /Milch \(200 ml\)/);
        assert.match(html, /Ei \(4–6 Stück\)/);
        assert.ok(!html.includes('@['));
        assert.ok(!html.includes('<script>bad</script>'));
        assert.match(html, /&lt;script&gt;bad/);
        assert.ok(!html.includes('0 l'));
    } finally {
        (globalThis as any).window = original;
    }
});
