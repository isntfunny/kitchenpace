import { NextRequest, NextResponse } from 'next/server';

const SCRAPLER_BASE_URL = process.env.SCRAPLER_URL || 'http://localhost:64001';

/**
 * POST /api/scrape
 *
 * Non-streaming scrape endpoint. Returns complete markdown.
 */
export async function POST(request: NextRequest) {
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
        const scraperResponse = await fetch(`${SCRAPLER_BASE_URL}/api/scrape`, {
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

        const data = await scraperResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Scrape error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
