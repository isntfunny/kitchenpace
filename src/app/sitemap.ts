import type { MetadataRoute } from 'next';

import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [recipes, categories, users] = await Promise.all([
        prisma.recipe.findMany({
            where: { publishedAt: { not: null } },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.category.findMany({
            select: { slug: true, createdAt: true },
        }),
        prisma.profile.findMany({
            where: { user: { banReason: null } },
            select: { slug: true, updatedAt: true },
        }),
    ]);

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: APP_URL, changeFrequency: 'daily', priority: 1 },
        { url: `${APP_URL}/recipes`, changeFrequency: 'daily', priority: 0.9 },
    ];

    const recipeRoutes: MetadataRoute.Sitemap = recipes.map((r) => ({
        url: `${APP_URL}/recipe/${r.slug}`,
        lastModified: r.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
        url: `${APP_URL}/category/${c.slug}`,
        lastModified: c.createdAt,
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    const userRoutes: MetadataRoute.Sitemap = users.map((u) => ({
        url: `${APP_URL}/user/${u.slug}`,
        lastModified: u.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.5,
    }));

    return [...staticRoutes, ...recipeRoutes, ...categoryRoutes, ...userRoutes];
}
