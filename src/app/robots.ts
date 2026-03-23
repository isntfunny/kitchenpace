import type { MetadataRoute } from 'next';

import { APP_URL } from '@app/lib/url';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/admin/',
                '/profile/',
                '/recipe/create',
                '/recipe/*/edit',
                '/notifications',
                '/banned',
            ],
        },
        sitemap: `${APP_URL}/sitemap.xml`,
    };
}
