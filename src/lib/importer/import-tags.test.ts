// Import tags come only from the fixed tag list (KUC-116).
// The save test needs a throwaway database with all migrations (TAGS_TEST_DATABASE_URL).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { TAG_NAMES_SORTED } from '../../../shared/tags/tag-list';

const url = process.env.TAGS_TEST_DATABASE_URL;
// shared/prisma reads DATABASE_URL on first import (pipeline imports it)
if (url) process.env.DATABASE_URL = url;

test('prompt context holds the whole tag list alphabetically, not the database tags', async () => {
    const { fetchImportContext } = await import('./pipeline');
    const db = {
        tag: {
            findMany: () => {
                throw new Error('database tags must not be used');
            },
        },
        ingredient: { findMany: async () => [{ name: 'Salz' }] },
    } as unknown as PrismaClient;

    const context = await fetchImportContext(db);
    assert.deepEqual(context.availableTags, [...TAG_NAMES_SORTED]);
    assert.deepEqual(context.topIngredients, ['Salz']);
});

test('saving an import keeps list tags and discards unknown ones', { skip: !url }, async () => {
    const { prisma } = await import('../../../shared/prisma');
    const { saveImportedRecipe } = await import('./pipeline');
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `${key}@example.invalid` } });
    const salt = await prisma.ingredient.create({
        data: { name: `Salz ${key}`, slug: `salz-${key}` },
    });
    const unit = await prisma.unit.create({
        data: { shortName: `TL-${key}`, longName: `Teelöffel ${key}` },
    });
    const invented = `Erfunden ${key.slice(0, 8)}`;
    let recipeId: string | undefined;
    try {
        const saved = await saveImportedRecipe(
            prisma,
            {
                title: `Tagtest ${key}`,
                description: '',
                servings: 2,
                prepTime: 5,
                cookTime: 5,
                categoryIds: [],
                tags: ['vegetarisch', 'Kaffee & Kuchen', 'BBQ', 'Einfach', invented],
                ingredients: [
                    {
                        id: 'imported_salt',
                        name: salt.name,
                        amount: '1',
                        unit: unit.shortName,
                        notes: '',
                        isOptional: false,
                    },
                ],
                flowNodes: [
                    {
                        id: 'mix',
                        type: 'mixen',
                        label: 'Mischen',
                        description: `@[${salt.name}](imported_salt)`,
                        ingredientIds: ['imported_salt'],
                    },
                ],
                flowEdges: [],
            },
            user.id,
        );
        recipeId = saved.id;

        const tags = await prisma.recipeTag.findMany({
            where: { recipeId },
            select: { tag: { select: { name: true, slug: true } } },
        });
        assert.deepEqual(tags.map((t) => t.tag.name).sort(), ['Kaffee & Kuchen', 'Vegetarisch']);
        assert.equal(await prisma.tag.count({ where: { name: invented } }), 0);
        assert.equal(await prisma.tag.count({ where: { name: 'BBQ' } }), 0);
    } finally {
        if (recipeId) await prisma.recipe.delete({ where: { id: recipeId } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.ingredient.delete({ where: { id: salt.id } });
        await prisma.unit.delete({ where: { id: unit.id } });
        await prisma.$disconnect();
    }
});
