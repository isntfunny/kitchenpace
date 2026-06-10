import path from 'path';

import { glob } from 'glob';
import type { MetadataRoute } from 'next';

import {
    fetchIngredientSlugsWithRecipes,
    fetchTagSlugsWithRecipes,
} from '@app/lib/keyword-landing';
import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

/** Routes excluded from sitemap (must match robots.ts disallow list) */
const EXCLUDED_PREFIXES = [
    '/api',
    '/admin',
    '/profile',
    '/recipe/create',
    '/collection/create',
    '/notifications',
    '/banned',
    '/auth',
    '/cast',
    '/qrupload',
    '/lane-view-mock',
    '/lane-wizard-mock',
];

/** Routes with custom priority/frequency overrides */
const ROUTE_OVERRIDES: Record<
    string,
    { priority?: number; changeFrequency?: MetadataRoute.Sitemap[0]['changeFrequency'] }
> = {
    '/': { priority: 1, changeFrequency: 'daily' },
    '/recipes': { priority: 0.9, changeFrequency: 'daily' },
};

async function discoverStaticRoutes(): Promise<MetadataRoute.Sitemap> {
    const appDir = path.join(process.cwd(), 'src/app');
    const pages = await glob('**/page.tsx', { cwd: appDir });

    return pages
        .map((p) => {
            const dir = path.dirname(p);
            return dir === '.' ? '/' : '/' + dir;
        })
        .filter((route) => !route.includes('[')) // skip dynamic segments
        .filter(
            (route) =>
                !EXCLUDED_PREFIXES.some(
                    (prefix) => route === prefix || route.startsWith(prefix + '/'),
                ),
        )
        .map((route) => ({
            url: `${APP_URL}${route === '/' ? '' : route}`,
            changeFrequency: ROUTE_OVERRIDES[route]?.changeFrequency ?? ('monthly' as const),
            priority: ROUTE_OVERRIDES[route]?.priority ?? 0.6,
        }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes = await discoverStaticRoutes();

    try {
        const [
            recipesResult,
            categoriesResult,
            usersResult,
            collectionsResult,
            tagSlugsResult,
            ingredientSlugsResult,
        ] = await Promise.allSettled([
            prisma.recipe.findMany({
                where: { publishedAt: { not: null } },
                select: { slug: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma.category.findMany({
                select: { slug: true, createdAt: true },
            }),
            prisma.profile.findMany({
                where: { user: { banned: false } },
                select: { slug: true, updatedAt: true },
            }),
            prisma.collection.findMany({
                where: {
                    published: true,
                    moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
                },
                select: { slug: true, updatedAt: true },
            }),
            fetchTagSlugsWithRecipes(),
            fetchIngredientSlugsWithRecipes(),
        ]);

        const recipes = recipesResult.status === 'fulfilled' ? recipesResult.value : [];
        const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
        const collections = collectionsResult.status === 'fulfilled' ? collectionsResult.value : [];
        const tagSlugs = tagSlugsResult.status === 'fulfilled' ? tagSlugsResult.value : [];
        const ingredientSlugs =
            ingredientSlugsResult.status === 'fulfilled' ? ingredientSlugsResult.value : [];

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

        const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
            url: `${APP_URL}/collection/${c.slug}`,
            lastModified: c.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.7,
        }));

        const tagRoutes: MetadataRoute.Sitemap = tagSlugs.map((slug) => ({
            url: `${APP_URL}/tag/${slug}`,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));

        const ingredientRoutes: MetadataRoute.Sitemap = ingredientSlugs.map((slug) => ({
            url: `${APP_URL}/zutat/${slug}`,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));

        return [
            ...staticRoutes,
            ...recipeRoutes,
            ...categoryRoutes,
            ...userRoutes,
            ...collectionRoutes,
            ...tagRoutes,
            ...ingredientRoutes,
        ];
    } catch (error) {
        console.error('[sitemap] Failed to fetch dynamic routes:', error);
        return staticRoutes;
    }
}
