'use server';

import { DateResolveType } from '@prisma/client';
import { revalidateTag } from 'next/cache';

import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpsertTimeSeasonData {
    timeSlot: string;
    season: string;
    displayLabel?: string;
    maxTotalTime?: number | null;
    tagIds: string[];
    categoryIds: string[];
    ingredientIds: string[];
}

interface FoodPeriodData {
    label: string;
    slug: string;
    description?: string;
    override: boolean;
    resolveType: DateResolveType;
    startMonth?: number | null;
    startDay?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
    startOffsetDays?: number | null;
    endOffsetDays?: number | null;
    leadDays?: number;
    trailDays?: number;
    maxTotalTime?: number | null;
    sortOrder?: number;
    tagIds: string[];
    categoryIds: string[];
    ingredientIds: string[];
}

// ---------------------------------------------------------------------------
// Shared helper – replace all join rows for a FilterSet (atomic)
// ---------------------------------------------------------------------------

async function replaceJoinRows(
    filterSetId: string,
    tagIds: string[],
    categoryIds: string[],
    ingredientIds: string[],
) {
    await prisma.$transaction([
        prisma.filterSetTag.deleteMany({ where: { filterSetId } }),
        prisma.filterSetCategory.deleteMany({ where: { filterSetId } }),
        prisma.filterSetIngredient.deleteMany({ where: { filterSetId } }),
        ...(tagIds.length > 0
            ? [
                  prisma.filterSetTag.createMany({
                      data: tagIds.map((tagId) => ({ filterSetId, tagId })),
                  }),
              ]
            : []),
        ...(categoryIds.length > 0
            ? [
                  prisma.filterSetCategory.createMany({
                      data: categoryIds.map((categoryId) => ({ filterSetId, categoryId })),
                  }),
              ]
            : []),
        ...(ingredientIds.length > 0
            ? [
                  prisma.filterSetIngredient.createMany({
                      data: ingredientIds.map((ingredientId) => ({ filterSetId, ingredientId })),
                  }),
              ]
            : []),
    ]);
}

// ---------------------------------------------------------------------------
// TIME_SEASON mutations
// ---------------------------------------------------------------------------

export async function upsertTimeSeasonFilterSet(data: UpsertTimeSeasonData) {
    await ensureModeratorSession();

    const { tagIds, categoryIds, ingredientIds, ...scalar } = data;

    const existing = await prisma.filterSet.findFirst({
        where: { type: 'TIME_SEASON', timeSlot: scalar.timeSlot, season: scalar.season },
        select: { id: true },
    });

    let record;
    if (existing) {
        record = await prisma.filterSet.update({
            where: { id: existing.id },
            data: { displayLabel: scalar.displayLabel, maxTotalTime: scalar.maxTotalTime },
        });
        await replaceJoinRows(existing.id, tagIds, categoryIds, ingredientIds);
    } else {
        record = await prisma.filterSet.create({
            data: {
                type: 'TIME_SEASON',
                timeSlot: scalar.timeSlot,
                season: scalar.season,
                displayLabel: scalar.displayLabel,
                maxTotalTime: scalar.maxTotalTime,
                tags: { createMany: { data: tagIds.map((tagId) => ({ tagId })) } },
                categories: {
                    createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) },
                },
                ingredients: {
                    createMany: { data: ingredientIds.map((ingredientId) => ({ ingredientId })) },
                },
            },
        });
    }

    revalidateTag('fits-now');
    return record;
}

export async function deleteTimeSeasonFilterSet(id: string) {
    await ensureModeratorSession();
    await prisma.filterSet.delete({ where: { id } });
    revalidateTag('fits-now');
}

// ---------------------------------------------------------------------------
// FOOD_PERIOD mutations
// ---------------------------------------------------------------------------

export async function createFoodPeriod(data: FoodPeriodData) {
    await ensureModeratorSession();

    const { tagIds, categoryIds, ingredientIds, ...scalar } = data;

    const record = await prisma.filterSet.create({
        data: {
            type: 'FOOD_PERIOD',
            label: scalar.label,
            slug: scalar.slug,
            description: scalar.description,
            override: scalar.override,
            resolveType: scalar.resolveType,
            startMonth: scalar.startMonth,
            startDay: scalar.startDay,
            endMonth: scalar.endMonth,
            endDay: scalar.endDay,
            startOffsetDays: scalar.startOffsetDays,
            endOffsetDays: scalar.endOffsetDays,
            leadDays: scalar.leadDays ?? 0,
            trailDays: scalar.trailDays ?? 0,
            maxTotalTime: scalar.maxTotalTime,
            sortOrder: scalar.sortOrder ?? 0,
            tags: { createMany: { data: tagIds.map((tagId) => ({ tagId })) } },
            categories: { createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) } },
            ingredients: {
                createMany: { data: ingredientIds.map((ingredientId) => ({ ingredientId })) },
            },
        },
    });

    revalidateTag('fits-now');
    return record;
}

export async function updateFoodPeriod(id: string, data: FoodPeriodData) {
    await ensureModeratorSession();

    const { tagIds, categoryIds, ingredientIds, ...scalar } = data;

    const record = await prisma.filterSet.update({
        where: { id },
        data: {
            label: scalar.label,
            slug: scalar.slug,
            description: scalar.description,
            override: scalar.override,
            resolveType: scalar.resolveType,
            startMonth: scalar.startMonth,
            startDay: scalar.startDay,
            endMonth: scalar.endMonth,
            endDay: scalar.endDay,
            startOffsetDays: scalar.startOffsetDays,
            endOffsetDays: scalar.endOffsetDays,
            leadDays: scalar.leadDays ?? 0,
            trailDays: scalar.trailDays ?? 0,
            maxTotalTime: scalar.maxTotalTime,
            sortOrder: scalar.sortOrder ?? 0,
        },
    });

    await replaceJoinRows(id, tagIds, categoryIds, ingredientIds);

    revalidateTag('fits-now');
    return record;
}

export async function deleteFoodPeriod(id: string) {
    await ensureModeratorSession();
    await prisma.filterSet.delete({ where: { id } });
    revalidateTag('fits-now');
}

// ---------------------------------------------------------------------------
// Search helpers (read-only, moderator-only)
// ---------------------------------------------------------------------------

export async function searchTags(query: string) {
    await ensureModeratorSession();
    if (query.length < 1) return [];
    return prisma.tag.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: 20,
    });
}

export async function searchIngredients(query: string) {
    await ensureModeratorSession();
    if (query.length < 1) return [];
    return prisma.ingredient.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: 20,
    });
}
