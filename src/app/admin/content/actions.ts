'use server';

import { revalidatePath } from 'next/cache';

import { ensureAdminSession } from '@app/lib/admin/ensure-admin';
import { prisma } from '@shared/prisma';

export async function setFeaturedRecipe(recipeId: string | null) {
    await ensureAdminSession('set-featured-recipe');

    if (recipeId === null) {
        await prisma.siteSettings.delete({
            where: { key: 'featuredRecipe' },
        });
    } else {
        await prisma.siteSettings.upsert({
            where: { key: 'featuredRecipe' },
            create: {
                key: 'featuredRecipe',
                value: { recipeId },
            },
            update: {
                value: { recipeId },
            },
        });
    }

    revalidatePath('/');
    revalidatePath('/admin/content');
    return { success: true };
}

export async function setTopUser(userId: string | null) {
    await ensureAdminSession('set-top-user');

    if (userId === null) {
        await prisma.siteSettings.delete({
            where: { key: 'topUser' },
        });
    } else {
        await prisma.siteSettings.upsert({
            where: { key: 'topUser' },
            create: {
                key: 'topUser',
                value: { userId },
            },
            update: {
                value: { userId },
            },
        });
    }

    revalidatePath('/');
    revalidatePath('/admin/content');
    return { success: true };
}

export async function getContentSettings() {
    const [featuredSetting, topUserSetting] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'featuredRecipe' } }),
        prisma.siteSettings.findUnique({ where: { key: 'topUser' } }),
    ]);

    const featuredRecipeId = featuredSetting?.value as { recipeId: string } | null;
    const topUserId = topUserSetting?.value as { userId: string } | null;

    const [featuredRecipe, topUser] = await Promise.all([
        featuredRecipeId?.recipeId
            ? prisma.recipe.findUnique({
                  where: { id: featuredRecipeId.recipeId },
                  select: { id: true, title: true, slug: true, imageKey: true },
              })
            : null,
        topUserId?.userId
            ? prisma.user.findUnique({
                  where: { id: topUserId.userId },
                  select: {
                      id: true,
                      name: true,
                      image: true,
                      profile: { select: { id: true, nickname: true, photoUrl: true } },
                  },
              })
            : null,
    ]);

    return {
        featuredRecipe: featuredRecipe ?? null,
        topUser: topUser
            ? {
                  id: topUser.id,
                  name: topUser.name ?? topUser.profile?.nickname ?? 'Unbekannt',
                  avatar: topUser.profile?.photoUrl ?? topUser.image,
              }
            : null,
    };
}

export async function getSelectableRecipes() {
    return prisma.recipe.findMany({
        where: { status: 'PUBLISHED', publishedAt: { not: null } },
        select: { id: true, title: true, slug: true, imageKey: true, rating: true },
        orderBy: { title: 'asc' },
        take: 100,
    });
}

export async function getSelectableUsers() {
    return prisma.user.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { id: true, nickname: true, photoUrl: true, recipeCount: true } },
        },
        orderBy: { name: 'asc' },
    });
}
