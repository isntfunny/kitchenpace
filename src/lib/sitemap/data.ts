import path from 'path';

import { glob } from 'glob';

import {
    fetchIngredientSlugsWithRecipes,
    fetchTagSlugsWithRecipes,
} from '@app/lib/keyword-landing';
import { APP_URL } from '@app/lib/url';
import { prisma } from '@shared/prisma';

// Central sitemap logic, shared by the /sitemap.xml index route and the
// per-type /sitemap/[type].xml child routes. Implemented as plain route
// handlers rather than Next's `sitemap.ts` metadata convention because that
// convention does not emit a working /sitemap.xml index in Next 16 standalone
// builds (it 404s). All routes are force-dynamic so APP_URL resolves from the
// runtime SERVICE_URL — the prod container runs the promoted beta image, so
// anything baked at build time carries the beta domain (see lib/url.ts).

export const SITEMAP_TYPES = [
    'static',
    'recipes',
    'categories',
    'users',
    'collections',
    'tags',
    'ingredients',
] as const;

export type SitemapType = (typeof SITEMAP_TYPES)[number];

export function isSitemapType(value: string): value is SitemapType {
    return (SITEMAP_TYPES as readonly string[]).includes(value);
}

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export type SitemapEntry = {
    url: string;
    lastModified?: Date;
    changeFrequency?: ChangeFrequency;
    priority?: number;
};

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

const ROUTE_OVERRIDES: Record<string, { priority?: number; changeFrequency?: ChangeFrequency }> = {
    '/': { priority: 1, changeFrequency: 'daily' },
    '/recipes': { priority: 0.9, changeFrequency: 'daily' },
};

async function discoverStaticRoutes(): Promise<SitemapEntry[]> {
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
            changeFrequency: ROUTE_OVERRIDES[route]?.changeFrequency ?? 'monthly',
            priority: ROUTE_OVERRIDES[route]?.priority ?? 0.6,
        }));
}

export async function getSitemapEntries(type: SitemapType): Promise<SitemapEntry[]> {
    switch (type) {
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
                    changeFrequency: 'weekly',
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
                    changeFrequency: 'monthly',
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
                    changeFrequency: 'monthly',
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
                    changeFrequency: 'weekly',
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
                    changeFrequency: 'weekly',
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
                    changeFrequency: 'weekly',
                    priority: 0.6,
                }));
            } catch (error) {
                console.error('[sitemap:ingredients] Failed:', error);
                return [];
            }
        }
    }
}

function xmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function renderUrlset(entries: SitemapEntry[]): string {
    const urls = entries
        .map((e) => {
            const parts = [`    <loc>${xmlEscape(e.url)}</loc>`];
            if (e.lastModified)
                parts.push(`    <lastmod>${e.lastModified.toISOString()}</lastmod>`);
            if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
            if (e.priority !== undefined) parts.push(`    <priority>${e.priority}</priority>`);
            return `  <url>\n${parts.join('\n')}\n  </url>`;
        })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderSitemapIndex(locs: string[]): string {
    const items = locs
        .map((loc) => `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`)
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}
