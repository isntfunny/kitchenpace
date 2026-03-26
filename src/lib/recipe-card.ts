import type { Prisma } from '@prisma/client';

import { PALETTE } from '@app/lib/palette';

export interface RecipeCardData {
    id: string;
    slug: string;
    title: string;
    category: string;
    categorySlug?: string;
    categoryColor?: string;
    rating: number;
    time: string;
    image: string | null;
    imageKey?: string | null;
    description?: string;
    stepCount?: number;
    difficulty?: string;
    cookCount?: number;
    ratingCount?: number;
    viewCount?: number;
}

export type RecipeWithCategory = Prisma.RecipeGetPayload<{
    include: { categories: { include: { category: true } } };
}>;

export type FavoriteRecipeCard = Pick<
    RecipeCardData,
    'id' | 'slug' | 'title' | 'category' | 'rating' | 'time' | 'image' | 'description'
> & { savedAt: Date | string };

export function toRecipeCardData(recipe: RecipeWithCategory): RecipeCardData {
    const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
    const cat = recipe.categories[0]?.category;

    return {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        category: cat?.name || 'Hauptgericht',
        categorySlug: cat?.slug ?? undefined,
        categoryColor: PALETTE[cat?.color as keyof typeof PALETTE] ?? PALETTE.orange,
        rating: recipe.rating ?? 0,
        time: `${totalTime ?? 0} Min.`,
        image: recipe.imageKey
            ? `/api/thumbnail?type=recipe&id=${encodeURIComponent(recipe.id)}`
            : null,
        imageKey: recipe.imageKey ?? null,
        description: recipe.description ?? '',
        difficulty:
            recipe.difficulty === 'EASY'
                ? 'Einfach'
                : recipe.difficulty === 'HARD'
                  ? 'Schwer'
                  : 'Mittel',
        cookCount: recipe.cookCount ?? undefined,
        ratingCount: recipe.ratingCount ?? undefined,
        viewCount: recipe.viewCount ?? undefined,
    };
}
