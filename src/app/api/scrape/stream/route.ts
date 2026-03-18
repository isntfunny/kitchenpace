import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';

const SCRAPLER_BASE_URL = process.env.SCRAPLER_URL || 'http://localhost:64001';

/**
 * POST /api/scrape/stream
 *
 * Proxies streaming requests to the scraper service.
 * Uses Server-Sent Events (SSE) for real-time progress updates.
 */
export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/scrape/stream');
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { url, mode = 'stealthy-fetch', timeout = 60, wait_for_network_idle = true } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        // Make request to scraper service
        const scraperResponse = await fetch(`${SCRAPLER_BASE_URL}/api/scrape/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                mode,
                timeout,
                wait_for_network_idle,
            }),
        });

        if (!scraperResponse.ok) {
            const error = await scraperResponse.text();
            return NextResponse.json(
                { error: `Scraper service error: ${error}` },
                { status: scraperResponse.status },
            );
        }

        // Stream the response back to the client
        const headers = new Headers({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        return new NextResponse(scraperResponse.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Scrape stream error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
