import path from 'path';

import { glob } from 'glob';
import type { MetadataRoute } from 'next';

import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

/** Routes excluded from sitemap (must match robots.ts disallow list) */
const EXCLUDED_PREFIXES = [
    '/api',
    '/moderation',
    '/admin',
    '/profile',
    '/recipe/create',
    '/notifications',
    '/banned',
    '/auth',
    '/cast',
    '/qrupload',
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
        const [recipesResult, categoriesResult, usersResult] = await Promise.allSettled([
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

        const recipes = recipesResult.status === 'fulfilled' ? recipesResult.value : [];
        const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        const users = usersResult.status === 'fulfilled' ? usersResult.value : [];

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
    } catch (error) {
        console.error('[sitemap] Failed to fetch dynamic routes:', error);
        return staticRoutes;
    }
}
