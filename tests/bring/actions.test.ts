import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

const boundary = { session: null as any, allowed: true, userId: '' };
(globalThis as any).__bringActionBoundary = boundary;
const bundle = await build({
    entryPoints: ['src/lib/bring/actions.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
        {
            name: 'action-boundaries',
            setup(build) {
                build.onResolve({ filter: /^@app\/lib\/(auth|rate-limit)$/ }, ({ path }) => ({
                    path,
                    namespace: 'test',
                }));
                build.onResolve({ filter: /^\.\/service$/ }, () => ({
                    path: 'service',
                    namespace: 'test',
                }));
                build.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({
                    contents: path.endsWith('/auth')
                        ? 'export async function getServerAuthSession() { return globalThis.__bringActionBoundary.session; }'
                        : path.endsWith('/rate-limit')
                          ? 'export async function checkRateLimit() { return {allowed:globalThis.__bringActionBoundary.allowed}; }'
                          : `export async function connectionStatus(userId) { globalThis.__bringActionBoundary.userId = userId; return {connected:false,defaultListUuid:null}; }
             export const previewConnection=connectionStatus,connectAccount=connectionStatus,disconnectAccount=connectionStatus,availableLists=connectionStatus,chooseDefault=connectionStatus,readList=connectionStatus,mutateItem=connectionStatus,transfer=connectionStatus;`,
                    loader: 'js',
                }));
            },
        },
    ],
});
const actions = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

test('anonymous and banned accounts cannot access Bring actions', async () => {
    for (const session of [
        null,
        { user: { id: 'a', banned: true, role: 'user' } },
        { user: { id: 'a', role: 'banned' } },
    ]) {
        boundary.session = session;
        const result = await actions.getBringStatus();
        assert.equal(result.ok, false);
        assert.equal(result.code, 'SIGN_IN');
    }
});

test('actions derive owner from the authenticated session and validate list IDs', async () => {
    boundary.session = { user: { id: 'real-owner', role: 'user' } };
    boundary.allowed = true;
    assert.equal((await actions.getBringStatus()).ok, true);
    assert.equal(boundary.userId, 'real-owner');
    assert.equal((await actions.getBringItems('')).code, 'VALIDATION');
    assert.equal((await actions.transferToBring({ operationId: 'bad' })).code, 'VALIDATION');
});

test('rate-limited requests return a retryable error', async () => {
    boundary.session = { user: { id: 'real-owner', role: 'user' } };
    boundary.allowed = false;
    assert.equal((await actions.getBringStatus()).code, 'RATE_LIMIT');
});
