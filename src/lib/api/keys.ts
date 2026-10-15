import type { PrismaClient } from '@prisma/client';

import type { auth } from '../auth-server';

import { ApiError } from './errors';
import { keyInputSchema, permissionsForScopes } from './permissions';

export function createKeyManager(db: PrismaClient, create: typeof auth.api.createApiKey) {
    async function activeUser(userId: string) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { banned: true, emailVerified: true },
        });
        if (!user || user.banned || !user.emailVerified)
            throw new ApiError(403, 'ACCOUNT_UNAVAILABLE');
    }
    return {
        async create(userId: string, input: unknown) {
            await activeUser(userId);
            const data = keyInputSchema.parse(input);
            const result = await create({
                body: {
                    userId,
                    name: data.name,
                    expiresIn: data.days === null ? null : data.days * 86400,
                    permissions: permissionsForScopes(data.scopes),
                },
            });
            return { id: result.id, key: result.key };
        },
        async list(userId: string) {
            await activeUser(userId);
            return db.apikey.findMany({
                where: { referenceId: userId, configId: 'default' },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    start: true,
                    createdAt: true,
                    expiresAt: true,
                    lastRequest: true,
                    permissions: true,
                },
            });
        },
        async revoke(userId: string, id: string) {
            await activeUser(userId);
            // Deletion also prevents a concurrent plugin usage update from re-enabling a key.
            await db.apikey.deleteMany({ where: { id, referenceId: userId, configId: 'default' } });
        },
        async rename(userId: string, id: string, name: string) {
            await activeUser(userId);
            const parsed = keyInputSchema.shape.name.parse(name);
            await db.apikey.updateMany({
                where: { id, referenceId: userId, configId: 'default' },
                data: { name: parsed },
            });
        },
    };
}
