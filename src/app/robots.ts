import type { MetadataRoute } from 'next';

import { APP_URL } from '@app/lib/url';

// Resolve APP_URL at request time — a statically built robots.txt would
// freeze the sitemap URL with the build-time domain (see lib/sitemap/data.ts)
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            // Thumbnails and OG images live under /api — they must stay
            // crawlable (longest-match wins over the /api/ disallow) or
            // Google cannot index recipe images / rich-result previews
            allow: ['/', '/api/thumbnail', '/api/og/'],
            disallow: [
                '/api/',
                '/admin/',
                '/auth/',
                '/profile/',
                '/recipe/create',
                '/recipe/*/edit',
                '/collection/create',
                '/collection/*/edit',
                '/notifications',
                '/banned',
                '/cast/',
                '/qrupload',
                '/lane-view-mock',
                '/lane-wizard-mock',
            ],
        },
        // Single sitemap index; it references each per-type child sitemap
        // (/sitemap/<type>.xml). Google follows the index to the children.
        sitemap: `${APP_URL}/sitemap.xml`,
    };
}
