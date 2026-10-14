import type { PrismaClient } from '@prisma/client';

import type { auth } from '../auth-server';

import { ApiError } from './errors';
import { type Scope } from './permissions';

export interface ApiPrincipal {
    userId: string;
    keyId: string;
}
export function createApiAuthenticator(verify: typeof auth.api.verifyApiKey, db: PrismaClient) {
    return async (request: Request, scope: Scope): Promise<ApiPrincipal> => {
        const key = request.headers.get('x-api-key');
        if (!key || key.length > 512) throw new ApiError(401, 'INVALID_API_KEY');
        const result = await verify({ body: { key } });
        if (!result.valid || !result.key) {
            const code = result.error?.code ?? '';
            if (code.includes('RATE_LIMIT')) throw new ApiError(429, 'RATE_LIMITED');
            if (code.includes('PERMISSION')) throw new ApiError(403, 'INSUFFICIENT_SCOPE');
            throw new ApiError(401, 'INVALID_API_KEY');
        }
        const [resource, action] = scope.split(':');
        if (!result.key.permissions?.[resource]?.includes(action))
            throw new ApiError(403, 'INSUFFICIENT_SCOPE');
        const user = await db.user.findUnique({
            where: { id: result.key.referenceId },
            select: { id: true, banned: true, emailVerified: true },
        });
        if (!user || user.banned || !user.emailVerified)
            throw new ApiError(403, 'ACCOUNT_UNAVAILABLE');
        return { userId: user.id, keyId: result.key.id };
    };
}
