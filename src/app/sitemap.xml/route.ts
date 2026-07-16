import { SITEMAP_TYPES, renderSitemapIndex } from '@app/lib/sitemap/data';
import { APP_URL } from '@app/lib/url';

// Sitemap index at /sitemap.xml — references each per-type child sitemap.
// force-dynamic so APP_URL comes from the runtime SERVICE_URL (see
// lib/sitemap/data.ts for why the metadata sitemap convention is not used).
export const dynamic = 'force-dynamic';

export function GET() {
    const xml = renderSitemapIndex(SITEMAP_TYPES.map((type) => `${APP_URL}/sitemap/${type}.xml`));
    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
}
