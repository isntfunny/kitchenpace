import type { NextRequest } from 'next/server';

const OPENPANEL_ID = process.env.OPENPANEL_ID;
const OPENPANEL_TOKEN = process.env.OPENPANEL_TOKEN;
const OPENPANEL_API_URL = process.env.OPENPANEL_API_URL;

export function isTrackingEnabled(): boolean {
    return Boolean(OPENPANEL_ID && OPENPANEL_TOKEN && OPENPANEL_API_URL);
}

/**
 * Fire-and-forget OpenPanel event tracking for API routes.
 * Designed to be called via `event.waitUntil(trackApiRequest(request))` in proxy.ts.
 */
export async function trackApiRequest(request: NextRequest): Promise<void> {
    const { pathname, searchParams } = request.nextUrl;

    const isThumbnailRoute = pathname === '/api/thumbnail';
    const isFilterRoute = pathname.startsWith('/api/filter');

    if (!isThumbnailRoute && !isFilterRoute) return;

    const eventData = {
        url: pathname,
        method: request.method,
        referrer: request.headers.get('referer') || '',
        user_agent: request.headers.get('user-agent') || '',
        timestamp: new Date().toISOString(),
    };

    let eventName = 'api_request';
    let additionalProperties: Record<string, string> = {};

    if (isThumbnailRoute) {
        eventName = 'thumbnail_generate';
        additionalProperties = {
            width: searchParams.get('width') || '400',
            height: searchParams.get('height') || '300',
            quality: searchParams.get('quality') || '80',
            fit: searchParams.get('fit') || 'cover',
            image_key: searchParams.get('key') || '',
        };
    } else if (isFilterRoute) {
        eventName = 'filter_api_call';
        additionalProperties = {
            category: searchParams.get('category') || '',
            search: searchParams.get('search') || '',
            difficulty: searchParams.get('difficulty') || '',
            max_time: searchParams.get('maxTime') || '',
            tags: searchParams.get('tags') || '',
        };
    }

    await fetch(OPENPANEL_API_URL!, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENPANEL_TOKEN}`,
        },
        body: JSON.stringify({
            client_id: OPENPANEL_ID,
            events: [
                {
                    name: eventName,
                    timestamp: new Date().toISOString(),
                    properties: {
                        ...eventData,
                        ...additionalProperties,
                    },
                },
            ],
        }),
    }).catch(() => {});
}
