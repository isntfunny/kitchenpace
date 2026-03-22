import { unstable_cache } from 'next/cache';

import { prisma } from '@shared/prisma';

// ── Types ───────────────────────────────────────────────────────────────────

const FILTER_SET_INCLUDE = {
    tags: { include: { tag: true } },
    categories: { include: { category: true } },
    ingredients: { include: { ingredient: true } },
} as const;

export type FilterSetWithRelations = NonNullable<
    Awaited<ReturnType<typeof prisma.filterSet.findFirst<{ include: typeof FILTER_SET_INCLUDE }>>>
>;

// ── Cached Queries ──────────────────────────────────────────────────────────

export const getTimeSeasonFilterSets = unstable_cache(
    async () => {
        return prisma.filterSet.findMany({
            where: { type: 'TIME_SEASON' },
            include: FILTER_SET_INCLUDE,
        });
    },
    ['fits-now-time-season'],
    { revalidate: 300, tags: ['fits-now'] },
);

export const getFoodPeriodFilterSets = unstable_cache(
    async () => {
        return prisma.filterSet.findMany({
            where: { type: 'FOOD_PERIOD' },
            include: FILTER_SET_INCLUDE,
            orderBy: { sortOrder: 'asc' },
        });
    },
    ['fits-now-food-periods'],
    { revalidate: 300, tags: ['fits-now'] },
);
