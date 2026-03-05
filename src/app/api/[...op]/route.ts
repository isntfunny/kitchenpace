import { createRouteHandler } from '@openpanel/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const OPENPANEL_API_URL = process.env.OPENPANEL_API_URL;
const MOCK_OPENPANEL = process.env.OPENPANEL_MOCK === '1';

const createMockResponse = () => NextResponse.json({ message: 'openpanel mock active' });

let GET: (req: NextRequest) => Promise<NextResponse>;
let POST: (req: NextRequest) => Promise<NextResponse>;

if (MOCK_OPENPANEL || !OPENPANEL_API_URL) {
    const handler = async (_req: NextRequest) => createMockResponse();
    GET = handler;
    POST = handler;
} else {
    const handler = createRouteHandler({ apiUrl: OPENPANEL_API_URL });
    GET = handler.GET;
    POST = handler.POST;
}

export { GET, POST };
