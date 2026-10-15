import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { createImportProcessor } from '../../src/lib/api/import-processor';
const url = process.env.API_TEST_DATABASE_URL;
if (!url?.includes('127.0.0.1:55492/kuc90')) throw new Error('Disposable test DB required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
let userId = '';
let keyId = '';
before(async () => {
    userId = (
        await db.user.create({
            data: {
                email: `processor-${Date.now()}@example.test`,
                name: 'Processor',
                emailVerified: true,
            },
        })
    ).id;
    keyId = (
        await db.apikey.create({
            data: {
                id: `key-${userId}`,
                referenceId: userId,
                key: `fake-${userId}`,
                permissions: JSON.stringify({ imports: ['create'] }),
            },
        })
    ).id;
});
after(async () => {
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
});
const recipe = {
    title: 'Private import',
    description: 'test',
    categoryIds: [],
    tags: [],
    ingredients: [],
    flowNodes: [],
    flowEdges: [],
    imageUrl: 'http://127.0.0.1/image',
};
let analyses = 0;
const processImport = createImportProcessor(db, {
    analyze: async () => {
        analyses++;
        return recipe;
    },
    moderate: async () => ({
        decision: 'AUTO_APPROVED' as const,
        score: 0,
        flags: {},
        flagged: false,
        raw: {},
    }),
    save: async (tx, input, authorId) => {
        assert.equal(input.imageUrl, undefined);
        const row = await tx.recipe.create({
            data: { authorId, slug: `processed-${Math.random()}`, title: input.title },
        });
        return { id: row.id, slug: row.slug };
    },
    fetchText: async () => 'A sufficiently long recipe text.',
});
async function request(token: string) {
    return db.apiImport.create({
        data: {
            userId,
            keyId,
            idempotencyKey: token,
            requestHash: token,
            input: { text: 'A sufficiently long recipe text.' },
            deadline: new Date(Date.now() + 60000),
        },
    });
}
test('completed jobs replay without another analysis or recipe; private input is cleared', async () => {
    const job = await request('once');
    await processImport(job.id);
    await processImport(job.id);
    assert.equal(analyses, 1);
    assert.equal(await db.recipe.count({ where: { authorId: userId } }), 1);
    const row = await db.apiImport.findUniqueOrThrow({ where: { id: job.id } });
    assert.equal(row.status, 'completed');
    assert.deepEqual(row.input, {});
    const saved = await db.recipe.findUniqueOrThrow({ where: { id: row.recipeId! } });
    assert.equal(saved.status, 'DRAFT');
    assert.equal(saved.publishedAt, null);
    assert.equal(saved.imageKey, null);
});
test('expired and revoked jobs fail before external analysis', async () => {
    const expired = await request('expired');
    await db.apiImport.update({ where: { id: expired.id }, data: { deadline: new Date(0) } });
    await processImport(expired.id);
    const revoked = await request('revoked');
    await db.apikey.delete({ where: { id: keyId } });
    await processImport(revoked.id);
    assert.equal(analyses, 1);
    assert.equal(
        (await db.apiImport.findUniqueOrThrow({ where: { id: revoked.id } })).status,
        'failed',
    );
});
