'use server';

import { prisma } from '@/lib/prisma';

export type CategoryOption = {
    slug: string;
    name: string;
};

const unique = (values: string[]) => Array.from(new Set(values));

export async function fetchFilterTags(limit = 24): Promise<string[]> {
    const groups = await prisma.recipeTag.groupBy({
        by: ['tagId'],
        _count: { tagId: true },
        orderBy: { _count: { tagId: 'desc' } },
        take: limit * 2,
    });

    if (groups.length === 0) {
        return [];
    }

    const tags = await prisma.tag.findMany({
        where: { id: { in: groups.map((item) => item.tagId) } },
        select: { id: true, name: true },
    });

    const map = new Map(tags.map((tag) => [tag.id, tag.name]));

    return unique(
        groups
            .map((item) => map.get(item.tagId))
            .filter((name): name is string => Boolean(name))
            .slice(0, limit),
    );
}

export async function fetchFilterIngredients(limit = 24): Promise<string[]> {
    const groups = await prisma.recipeIngredient.groupBy({
        by: ['ingredientId'],
        _count: { ingredientId: true },
        orderBy: { _count: { ingredientId: 'desc' } },
        take: limit * 2,
    });

    if (groups.length === 0) {
        return [];
    }

    const ingredients = await prisma.ingredient.findMany({
        where: { id: { in: groups.map((item) => item.ingredientId) } },
        select: { id: true, name: true },
    });

    const map = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.name]));

    return unique(
        groups
            .map((item) => map.get(item.ingredientId))
            .filter((name): name is string => Boolean(name))
            .slice(0, limit),
    );
}

export async function fetchFilterCategories(): Promise<CategoryOption[]> {
    const categories = await prisma.category.findMany({
        where: { recipes: { some: { publishedAt: { not: null } } } },
        orderBy: { name: 'asc' },
        select: { slug: true, name: true },
    });

    return categories;
}
