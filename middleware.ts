import { NextRequest, NextResponse } from 'next/server';

const OPENPANEL_ID = process.env.OPENPANEL_ID;
const OPENPANEL_TOKEN = process.env.OPENPANEL_TOKEN;
const OPENPANEL_API_URL = process.env.OPENPANEL_API_URL || 'https://panel.tretz.dev/api/v1/ingest';

export async function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    if (!OPENPANEL_ID || !OPENPANEL_TOKEN) {
        return NextResponse.next();
    }

    if (pathname === '/api/thumbnail' || pathname === '/api/filter') {
        const startTime = Date.now();

        const response = NextResponse.next();

        response.headers.set('x-openpanel-track', '1');

        setTimeout(() => {
            trackApiRequest(request, response, startTime, pathname, searchParams);
        }, 0);

        return response;
    }

    return NextResponse.next();
}

async function trackApiRequest(
    request: NextRequest,
    response: NextResponse,
    startTime: number,
    pathname: string,
    searchParams: URLSearchParams,
) {
    const duration = Date.now() - startTime;
    const isThumbnailRoute = pathname === '/api/thumbnail';
    const isFilterRoute = pathname === '/api/filter';

    const eventData = {
        url: pathname,
        method: request.method,
        referrer: request.headers.get('referer') || '',
        user_agent: request.headers.get('user-agent') || '',
        status_code: response.status,
        response_time_ms: duration,
        timestamp: new Date().toISOString(),
    };

    let eventName = 'api_request';
    let additionalProperties = {};

    if (isThumbnailRoute) {
        eventName =
            response.headers.get('x-cache') === 'HIT'
                ? 'thumbnail_cache_hit'
                : 'thumbnail_generate';
        additionalProperties = {
            width: searchParams.get('width') || '400',
            height: searchParams.get('height') || '300',
            quality: searchParams.get('quality') || '80',
            fit: searchParams.get('fit') || 'cover',
            image_key: searchParams.get('key') || '',
            cache_status: response.headers.get('x-cache') || 'unknown',
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

    const payload = {
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
    };

    try {
        await fetch(OPENPANEL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENPANEL_TOKEN}`,
            },
            body: JSON.stringify({
                client_id: OPENPANEL_ID,
                ...payload,
            }),
        });
    } catch (error) {
        console.error('OpenPanel tracking error:', error);
    }
}

export const config = {
    matcher: ['/api/thumbnail', '/api/filter'],
};
