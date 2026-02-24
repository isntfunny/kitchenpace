import type { Prisma } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server';


import { prisma } from '@/lib/prisma';

const DEFAULT_LIMIT = 24;
const DEFAULT_PAGE = 1;

const TOTAL_TIME_MAX = 180;

const TIME_OF_DAY_RANGES: Record<string, Partial<{ min: number; max: number }>> = {
    morgen: { min: 0, max: 25 },
    mittag: { min: 20, max: 45 },
    nachmittag: { min: 25, max: 60 },
    abend: { min: 30, max: 90 },
    snack: { min: 0, max: 20 },
};

const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

type RecipeCard = {
    id: string;
    slug: string;
    title: string;
    category: string;
    rating: number;
    time: string;
    image: string;
    description: string;
};

function parseList(params: URLSearchParams, key: string): string[] {
    return params
        .getAll(key)
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

function parseNumber(params: URLSearchParams, key: string): number | undefined {
    const value = params.get(key);
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function mapRecipeToCard(
    recipe: Prisma.RecipeGetPayload<{ include: { category: true } }>,
): RecipeCard {
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

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const params = url.searchParams;
        const query = params.get('query')?.trim();

        const tags = parseList(params, 'tags');
        const mealTypes = parseList(params, 'mealTypes');
        const cuisines = parseList(params, 'cuisines');
        const ingredients = parseList(params, 'ingredients');
        const excludeIngredients = parseList(params, 'excludeIngredients');
        const difficulties = parseList(params, 'difficulty')
            .map((value) => value.toUpperCase())
            .filter((value) => VALID_DIFFICULTIES.includes(value));

        const minTotalTime = parseNumber(params, 'minTotalTime');
        const maxTotalTime = parseNumber(params, 'maxTotalTime');
        const minPrepTime = parseNumber(params, 'minPrepTime');
        const maxPrepTime = parseNumber(params, 'maxPrepTime');
        const minCookTime = parseNumber(params, 'minCookTime');
        const maxCookTime = parseNumber(params, 'maxCookTime');

        const timeOfDay = parseList(params, 'timeOfDay');

        const rawPage = Number(params.get('page'));
        const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : DEFAULT_PAGE;
        const rawLimit = Number(params.get('limit'));
        const limit = Number.isFinite(rawLimit)
            ? Math.min(Math.max(1, rawLimit), 48)
            : DEFAULT_LIMIT;
        const filterModeParam = params.get('mode')?.toLowerCase();
        const filterMode: 'and' | 'or' = filterModeParam === 'or' ? 'or' : 'and';

        const tagFilters = Array.from(new Set([...tags, ...mealTypes, ...cuisines]));

        const clauses: Prisma.RecipeWhereInput[] = [];

        if (query) {
            clauses.push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            });
        }

        if (tagFilters.length > 0) {
            clauses.push({
                tags: {
                    some: {
                        tag: {
                            name: {
                                in: tagFilters,
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

        if (difficulties.length > 0) {
            clauses.push({ difficulty: { in: difficulties as Array<'EASY' | 'MEDIUM' | 'HARD'> } });
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

        return NextResponse.json(payload);
    } catch (error) {
        console.error('recipe filter api error', error);
        return NextResponse.json({ error: 'Fehler beim Laden der Rezepte' }, { status: 500 });
    }
}
