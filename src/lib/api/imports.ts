import type { ApiImport, PrismaClient } from '@prisma/client';

import type { ApiPrincipal } from './auth';
import { ApiError } from './errors';
import { validateImportUrl } from './safe-fetch';
import type { ImportInput } from './schemas';
import { hashRequest, lockUser } from './services';

export function importDto(row: ApiImport) {
    return {
        id: row.id,
        status: row.status,
        recipeId: row.recipeId,
        errorCode: row.errorCode,
        createdAt: row.createdAt.toISOString(),
    };
}
export function createImportServices(db: PrismaClient) {
    return {
        async createImport(p: ApiPrincipal, token: string, input: ImportInput) {
            if (input.url) validateImportUrl(input.url);
            return db.$transaction(async (tx) => {
                await lockUser(tx, p.userId);
                const requestHash = hashRequest(input);
                const existing = await tx.apiImport.findUnique({
                    where: { userId_idempotencyKey: { userId: p.userId, idempotencyKey: token } },
                });
                if (existing) {
                    if (existing.requestHash !== requestHash)
                        throw new ApiError(409, 'IDEMPOTENCY_CONFLICT');
                    return importDto(existing);
                }
                const now = new Date();
                await tx.apiImport.updateMany({
                    where: {
                        userId: p.userId,
                        status: { in: ['queued', 'processing'] },
                        deadline: { lte: now },
                    },
                    data: { status: 'failed', errorCode: 'IMPORT_EXPIRED', input: {} },
                });
                const today = new Date(now);
                today.setUTCHours(0, 0, 0, 0);
                const daily = await tx.apiImport.count({
                    where: { userId: p.userId, createdAt: { gte: today } },
                });
                const pending = await tx.apiImport.count({
                    where: { userId: p.userId, status: { in: ['queued', 'processing'] } },
                });
                if (daily >= 10) throw new ApiError(429, 'IMPORT_DAILY_LIMIT');
                if (pending >= 2) throw new ApiError(429, 'IMPORT_CONCURRENCY_LIMIT');
                return importDto(
                    await tx.apiImport.create({
                        data: {
                            userId: p.userId,
                            keyId: p.keyId,
                            idempotencyKey: token,
                            requestHash,
                            input,
                            deadline: new Date(now.getTime() + 30 * 60_000),
                        },
                    }),
                );
            });
        },
        async importStatus(p: ApiPrincipal, id: string) {
            await db.apiImport.updateMany({
                where: {
                    id,
                    userId: p.userId,
                    status: { in: ['queued', 'processing'] },
                    deadline: { lte: new Date() },
                },
                data: { status: 'failed', errorCode: 'IMPORT_EXPIRED', input: {} },
            });
            const row = await db.apiImport.findFirst({ where: { id, userId: p.userId } });
            if (!row) throw new ApiError(404, 'NOT_FOUND');
            return importDto(row);
        },
    };
}
