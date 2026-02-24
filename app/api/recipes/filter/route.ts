import { Prisma } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server';

import type { RecipeCardData } from '@/app/actions/recipes';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { parseRecipeFilterParams, RECIPE_FILTER_DEFAULT_LIMIT } from '@/lib/recipeFilters';

const log = createLogger('filter');

const TOTAL_TIME_MAX = 180;

const TIME_OF_DAY_RANGES: Record<string, Partial<{ min: number; max: number }>> = {
    morgen: { min: 0, max: 25 },
    mittag: { min: 20, max: 45 },
    nachmittag: { min: 25, max: 60 },
    abend: { min: 30, max: 90 },
    snack: { min: 0, max: 20 },
};

function mapRecipeToCard(
    recipe: Prisma.RecipeGetPayload<{ include: { category: true } }>,
): RecipeCardData {
    const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

    return {
        id: recipe.id,
        slug: recipe.slug,
        title: recipe.title,
        category: recipe.category?.name ?? 'Hauptgericht',
        rating: recipe.rating ?? 0,
        time: `${totalTime ?? 0} Min.`,
        image:
            recipe.imageUrl ??
            'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
        description: recipe.description ?? '',
    };
}

function ensureValidDifficulty(value: string): value is 'EASY' | 'MEDIUM' | 'HARD' {
    return ['EASY', 'MEDIUM', 'HARD'].includes(value);
}

export async function GET(request: NextRequest) {
    log.debug('Filter request received', { url: request.url });

    try {
        const filters = parseRecipeFilterParams(new URL(request.url).searchParams);
        log.debug('Parsed filters', { filters });

        const sampleRecipes = await prisma.recipe.findMany({
            where: { publishedAt: { not: null } },
            take: 5,
            select: { title: true, category: { select: { name: true } } },
        });
        log.debug('Sample recipe categories', {
            recipes: sampleRecipes.map((r) => ({ title: r.title, category: r.category?.name })),
        });

        const {
            query,
            tags = [],
            mealTypes = [],
            ingredients = [],
            excludeIngredients = [],
            difficulty = [],
            timeOfDay = [],
            minTotalTime,
            maxTotalTime,
            minPrepTime,
            maxPrepTime,
            minCookTime,
            maxCookTime,
            minRating,
            minCookCount,
            page = 1,
            limit = RECIPE_FILTER_DEFAULT_LIMIT,
            filterMode = 'and',
        } = filters;

        const clauses: Prisma.RecipeWhereInput[] = [];

        if (query) {
            clauses.push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            });
        }

        if (mealTypes.length > 0) {
            clauses.push({
                category: {
                    name: {
                        in: mealTypes,
                        mode: 'insensitive',
                    },
                },
            });
        }

        if (tags.length > 0) {
            clauses.push({
                tags: {
                    some: {
                        tag: {
                            name: {
                                in: tags,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            });
        }

        if (ingredients.length > 0) {
            clauses.push({
                recipeIngredients: {
                    some: {
                        ingredient: {
                            name: { in: ingredients, mode: 'insensitive' },
                        },
                    },
                },
            });
        }

        if (excludeIngredients.length > 0) {
            clauses.push({
                recipeIngredients: {
                    none: {
                        ingredient: {
                            name: { in: excludeIngredients, mode: 'insensitive' },
                        },
                    },
                },
            });
        }

        const validDifficulties = difficulty.filter(ensureValidDifficulty);
        if (validDifficulties.length > 0) {
            clauses.push({ difficulty: { in: validDifficulties } });
        }

        if (typeof minTotalTime === 'number') {
            clauses.push({ totalTime: { gte: minTotalTime } });
        }

        if (typeof maxTotalTime === 'number') {
            clauses.push({ totalTime: { lte: maxTotalTime } });
        }

        if (typeof minPrepTime === 'number') {
            clauses.push({ prepTime: { gte: minPrepTime } });
        }

        if (typeof maxPrepTime === 'number') {
            clauses.push({ prepTime: { lte: maxPrepTime } });
        }

        if (typeof minCookTime === 'number') {
            clauses.push({ cookTime: { gte: minCookTime } });
        }

        if (typeof maxCookTime === 'number') {
            clauses.push({ cookTime: { lte: maxCookTime } });
        }

        if (typeof minRating === 'number') {
            clauses.push({ rating: { gte: minRating } });
        }

        if (typeof minCookCount === 'number') {
            clauses.push({ cookCount: { gte: minCookCount } });
        }

        const ranges = timeOfDay
            .map((slot) => TIME_OF_DAY_RANGES[slot.toLowerCase()])
            .filter(Boolean)
            .map((range) => ({
                totalTime: {
                    gte: range.min ?? 0,
                    lte: range.max ?? TOTAL_TIME_MAX,
                },
            }));

        if (ranges.length > 0) {
            clauses.push({ OR: ranges });
        }

        const baseClause: Prisma.RecipeWhereInput = { publishedAt: { not: null } };
        let where: Prisma.RecipeWhereInput = baseClause;

        if (clauses.length > 0) {
            if (filterMode === 'or') {
                where = {
                    AND: [baseClause, { OR: clauses }],
                };
            } else {
                where = {
                    AND: [baseClause, ...clauses],
                };
            }
        }

        const skip = Math.max(0, page - 1) * limit;

        log.debug('Executing query', { where: JSON.stringify(where), skip, limit });

        const rawQuery =
            await prisma.$queryRaw`SELECT r.id, r.title, c.name as cat_name FROM "Recipe" r LEFT JOIN "Category" c ON r."categoryId" = c.id WHERE r."publishedAt" IS NOT NULL AND c.name ILIKE ANY(ARRAY[${mealTypes[0]}]) LIMIT 5`;
        log.debug('Raw SQL test', { rawQuery });

        const [recipes, total] = await Promise.all([
            prisma.recipe.findMany({
                where,
                include: { category: true },
                orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
                take: limit,
                skip,
            }),
            prisma.recipe.count({ where }),
        ]);

        const payload = {
            data: recipes.map(mapRecipeToCard),
            meta: {
                total,
                page,
                limit,
            },
        };

        log.debug('Filter response', { recipeCount: recipes.length, total, page, limit });

        return NextResponse.json(payload);
    } catch (error) {
        log.error('Filter request failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Fehler beim Laden der Rezepte' }, { status: 500 });
    }
}
