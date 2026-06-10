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
        sitemap: `${APP_URL}/sitemap.xml`,
    };
}
