'use server';

import { prisma } from '@/lib/prisma';

export interface IngredientSearchResult {
    id: string;
    name: string;
    category: string | null;
    units: string[];
}

export async function searchIngredients(query: string): Promise<IngredientSearchResult[]> {
    if (!query || query.length < 2) {
        return [];
    }

    const ingredients = await prisma.ingredient.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive',
            },
        },
        take: 10,
    });

    return ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
        units: ing.units || [],
    }));
}

export async function getAllCategories() {
    return prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
}

export async function getAllTags() {
    const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { recipes: true },
            },
        },
    });

    return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        count: tag._count.recipes,
    }));
}
