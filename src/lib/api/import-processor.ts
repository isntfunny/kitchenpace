import type { Prisma, PrismaClient } from '@prisma/client';

import type { AnalyzedRecipe } from '../importer/transform';
import type { ModerationResult } from '../moderation/types';

import { ApiError } from './errors';
import { importInput } from './schemas';
import { lockUser } from './services';

interface ImportDependencies {
    analyze: (text: string, sourceUrl: string, userId: string) => Promise<AnalyzedRecipe>;
    moderate: (text: string) => Promise<ModerationResult>;
    save: (
        tx: Prisma.TransactionClient,
        recipe: AnalyzedRecipe,
        userId: string,
    ) => Promise<{ id: string; slug: string }>;
    fetchText: (url: string) => Promise<string>;
}
async function authorized(db: Prisma.TransactionClient, userId: string, keyId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { banned: true, emailVerified: true },
    });
    const key = await db.apikey.findFirst({
        where: {
            id: keyId,
            referenceId: userId,
            enabled: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { permissions: true },
    });
    if (
        !user ||
        user.banned ||
        !user.emailVerified ||
        !key ||
        !JSON.parse(key.permissions ?? '{}').imports?.includes('create')
    )
        throw new ApiError(403, 'IMPORT_ACCESS_REVOKED');
}
export function createImportProcessor(db: PrismaClient, deps: ImportDependencies) {
    return async (id: string) => {
        const job = await db.apiImport.findUnique({ where: { id } });
        if (!job || !['queued', 'processing'].includes(job.status)) return;
        try {
            if (job.deadline <= new Date()) throw new ApiError(400, 'IMPORT_EXPIRED');
            await authorized(db, job.userId, job.keyId);
            await db.apiImport.updateMany({
                where: { id, status: { in: ['queued', 'processing'] } },
                data: { status: 'processing' },
            });
            const input = importInput.parse(job.input);
            const text = input.text ?? (await deps.fetchText(input.url!));
            const analyzed = await deps.analyze(text, input.url ?? '', job.userId);
            const content = [
                analyzed.title,
                analyzed.description,
                ...analyzed.flowNodes.map((n) => `${n.label} ${n.description ?? ''}`),
            ].join('\n');
            const moderation = await deps.moderate(content);
            if (moderation.decision === 'REJECTED') throw new ApiError(400, 'CONTENT_REJECTED');
            await db.$transaction(
                async (tx) => {
                    await lockUser(tx, job.userId);
                    const current = await tx.apiImport.findUniqueOrThrow({ where: { id } });
                    if (!['queued', 'processing'].includes(current.status)) return;
                    if (current.deadline <= new Date()) throw new ApiError(400, 'IMPORT_EXPIRED');
                    await authorized(tx, job.userId, job.keyId);
                    const saved = await deps.save(
                        tx,
                        { ...analyzed, imageUrl: undefined, sourceUrl: input.url },
                        job.userId,
                    );
                    // Enforce private state even if a shared importer changes its defaults later.
                    await tx.recipe.update({
                        where: { id: saved.id },
                        data: {
                            status: 'DRAFT',
                            publishedAt: null,
                            imageKey: null,
                            moderationStatus: moderation.decision,
                            aiModerationScore: moderation.score,
                        },
                    });
                    await tx.moderationQueue.create({
                        data: {
                            contentType: 'recipe',
                            contentId: saved.id,
                            authorId: job.userId,
                            status: moderation.decision,
                            aiScore: moderation.score,
                            aiFlags: moderation.flags,
                            aiRawResponse: moderation.raw as Prisma.InputJsonValue,
                            contentSnapshot: { title: analyzed.title },
                        },
                    });
                    await tx.apiImport.update({
                        where: { id },
                        data: {
                            status: 'completed',
                            recipeId: saved.id,
                            input: {},
                            errorCode: null,
                        },
                    });
                },
                { timeout: 60_000 },
            );
        } catch (error) {
            // Never expose raw upstream responses or recipe text in public job errors.
            await db.apiImport.updateMany({
                where: { id, status: { in: ['queued', 'processing'] } },
                data: {
                    status: 'failed',
                    input: {},
                    errorCode: error instanceof ApiError ? error.code : 'IMPORT_FAILED',
                },
            });
        }
    };
}
