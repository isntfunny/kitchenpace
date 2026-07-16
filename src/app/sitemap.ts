import path from 'path';

import { glob } from 'glob';
import type { MetadataRoute } from 'next';

import {
    fetchIngredientSlugsWithRecipes,
    fetchTagSlugsWithRecipes,
} from '@app/lib/keyword-landing';
import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

// Render at request time, not build time. The prod container runs the *beta*
// image promoted unchanged to :latest (see .github/workflows/app-image-live.yml
// and the APP_URL note in lib/url.ts), so anything baked at build carries the
// beta domain. ISR froze the beta APP_URL into every <loc>, making the prod
// sitemap point at beta.* URLs. force-dynamic resolves APP_URL from the
// runtime SERVICE_URL on each request — exactly what robots.ts already does,
// which is why robots.txt correctly shows the kochtakt.de host. Only the
// abandoned /sitemap.xml index route is affected by force-dynamic; robots.ts
// lists each /sitemap/[id].xml directly, so that index is never used.
export const dynamic = 'force-dynamic';

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
        .filter((route) => !route.includes('['))
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

export async function generateSitemaps() {
    return [
        { id: 'static' as const },
        { id: 'recipes' as const },
        { id: 'categories' as const },
        { id: 'users' as const },
        { id: 'collections' as const },
        { id: 'tags' as const },
        { id: 'ingredients' as const },
    ];
}

// Next.js 16 changed the sitemap `id` param: it is now a Promise<string>
// that must be awaited (see the sitemap.ts version history — v16.0.0).
// Destructuring it as a plain string made `switch (id)` compare a Promise
// object against the string cases, so nothing ever matched and every sitemap
// fell through to `default` and rendered empty.
export default async function sitemap({
    id,
}: {
    id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
    const sitemapId = await id;
    switch (sitemapId) {
        case 'static':
            return discoverStaticRoutes();

        case 'recipes': {
            try {
                const recipes = await prisma.recipe.findMany({
                    where: { publishedAt: { not: null } },
                    select: { slug: true, updatedAt: true },
                    orderBy: { updatedAt: 'desc' },
                });
                return recipes.map((r) => ({
                    url: `${APP_URL}/recipe/${r.slug}`,
                    lastModified: r.updatedAt,
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                }));
            } catch (error) {
                console.error('[sitemap:recipes] Failed:', error);
                return [];
            }
        }

        case 'categories': {
            try {
                const categories = await prisma.category.findMany({
                    select: { slug: true, createdAt: true },
                });
                return categories.map((c) => ({
                    url: `${APP_URL}/category/${c.slug}`,
                    lastModified: c.createdAt,
                    changeFrequency: 'monthly' as const,
                    priority: 0.7,
                }));
            } catch (error) {
                console.error('[sitemap:categories] Failed:', error);
                return [];
            }
        }

        case 'users': {
            try {
                const users = await prisma.profile.findMany({
                    where: { user: { banned: false } },
                    select: { slug: true, updatedAt: true },
                });
                return users.map((u) => ({
                    url: `${APP_URL}/user/${u.slug}`,
                    lastModified: u.updatedAt,
                    changeFrequency: 'monthly' as const,
                    priority: 0.5,
                }));
            } catch (error) {
                console.error('[sitemap:users] Failed:', error);
                return [];
            }
        }

        case 'collections': {
            try {
                const collections = await prisma.collection.findMany({
                    where: {
                        published: true,
                        moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
                    },
                    select: { slug: true, updatedAt: true },
                });
                return collections.map((c) => ({
                    url: `${APP_URL}/collection/${c.slug}`,
                    lastModified: c.updatedAt,
                    changeFrequency: 'weekly' as const,
                    priority: 0.7,
                }));
            } catch (error) {
                console.error('[sitemap:collections] Failed:', error);
                return [];
            }
        }

        case 'tags': {
            try {
                const tagSlugs = await fetchTagSlugsWithRecipes();
                return tagSlugs.map((slug) => ({
                    url: `${APP_URL}/tag/${slug}`,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                }));
            } catch (error) {
                console.error('[sitemap:tags] Failed:', error);
                return [];
            }
        }

        case 'ingredients': {
            try {
                const ingredientSlugs = await fetchIngredientSlugsWithRecipes();
                return ingredientSlugs.map((slug) => ({
                    url: `${APP_URL}/zutat/${slug}`,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                }));
            } catch (error) {
                console.error('[sitemap:ingredients] Failed:', error);
                return [];
            }
        }

        default:
            return [];
    }
}
