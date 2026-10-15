import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

let session: { user: { id: string; role: string } } | null = null;
let queried = false;
let published: boolean | undefined;
(globalThis as any).__collectionPrivacy = {
    session: () => session,
    db: {
        user: { findUnique: async () => ({ role: 'moderator' }) },
        collection: {
            findFirst: async ({ where }: any) => {
                queried = true;
                assert.equal(
                    where.authorId,
                    'owner',
                    'draft read must be scoped to actual session owner',
                );
                return null;
            },
            findMany: async ({ where }: any) => {
                queried = true;
                assert.equal(where.authorId, 'owner');
                return [];
            },
            update: async ({ data }: any) => {
                published = data.published;
            },
        },
        moderationQueue: {
            findUnique: async () => ({
                id: 'queue',
                authorId: 'owner',
                contentType: 'collection',
                contentId: 'draft',
                contentSnapshot: { intendedPublished: false },
            }),
            update: async () => ({}),
        },
        moderationLog: { create: async () => ({}) },
    },
};
async function bundled(entry: string) {
    const output = await build({
        entryPoints: [entry],
        bundle: true,
        platform: 'node',
        format: 'esm',
        write: false,
        plugins: [
            {
                name: 'boundaries',
                setup(b) {
                    b.onResolve(
                        { filter: /^(?:@app\/|@shared\/|@prisma\/client$|next\/cache$)/ },
                        (args) => ({ path: args.path, namespace: 'boundary' }),
                    );
                    b.onLoad({ filter: /.*/, namespace: 'boundary' }, () => ({
                        loader: 'js',
                        contents: `
                export const prisma = globalThis.__collectionPrivacy.db;
                export const getServerAuthSession = globalThis.__collectionPrivacy.session;
                export const Prisma = { JsonNull: null };
                export const revalidatePath = () => {};
                export const createUserNotification = async () => {};
                export const createActivityLog = async () => {};
                export const publishAdminInboxRemoved = async () => {};
                export const extractTextFromBlocks = () => '';
                export const syncCollectionRecipes = async () => {};
                export const moderateContent = async () => {};
                export const persistModerationResult = async () => {};
                export const generateUniqueSlug = async () => 'slug';
                ${['approveRecipeImage', 'approveRecipeImageByKey', 'approveCommentImage', 'approveCookImage', 'approveStepImage', 'approveProfileImage', 'rejectRecipeImageByKey', 'rejectCommentImage', 'rejectCookImage', 'rejectStepImage', 'rejectProfileImage'].map((n) => `export const ${n} = async () => {};`).join('\n')}
            `,
                    }));
                },
            },
        ],
    });
    return import(
        `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
    );
}
const actions = await bundled('src/app/actions/collections.ts');
const moderation = await bundled('src/app/admin/moderation/actions.ts');
test('forged collection viewer and includeDrafts arguments cannot bypass the session', async () => {
    session = null;
    queried = false;
    assert.equal(await actions.fetchCollectionBySlug('draft', 'owner', true), null);
    assert.equal(queried, false);
    assert.deepEqual(await actions.fetchUserCollections('owner'), []);
    assert.equal(queried, false);
    session = { user: { id: 'owner', role: 'user' } };
    await actions.fetchCollectionBySlug('draft', 'forged-user', true);
    assert.equal(queried, true);
    queried = false;
    assert.deepEqual(await actions.fetchUserCollections('forged-user'), []);
    assert.equal(queried, false);
});
test('moderator approval does not publish an API-created private collection', async () => {
    session = { user: { id: 'moderator', role: 'moderator' } };
    await moderation.approveContent('queue');
    assert.equal(published, false);
});
