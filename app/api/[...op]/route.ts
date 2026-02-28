import { createRouteHandler } from '@openpanel/nextjs/server';

export const { GET, POST } = createRouteHandler({
    apiUrl: process.env.OPENPANEL_API_URL,
});
