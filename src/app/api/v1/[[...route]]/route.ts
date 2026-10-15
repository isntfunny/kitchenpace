import { handle } from 'hono/vercel';

import { createApiApp } from '@app/lib/api/app';
import { createApiAuthenticator } from '@app/lib/api/auth';
import { createApiServices } from '@app/lib/api/services';
import { auth } from '@app/lib/auth-server';
import { prisma } from '@shared/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const app = createApiApp({
    services: createApiServices(prisma),
    authenticate: createApiAuthenticator(auth.api.verifyApiKey, prisma),
});
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
