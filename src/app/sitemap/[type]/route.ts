import { getSitemapEntries, isSitemapType, renderUrlset } from '@app/lib/sitemap/data';

// Per-type child sitemap at /sitemap/<type>.xml (e.g. /sitemap/recipes.xml).
// force-dynamic so APP_URL comes from the runtime SERVICE_URL.
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
    const { type: raw } = await params;
    const type = raw.replace(/\.xml$/, '');

    if (!isSitemapType(type)) {
        return new Response('Not found', { status: 404 });
    }

    const entries = await getSitemapEntries(type);
    return new Response(renderUrlset(entries), {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
}
