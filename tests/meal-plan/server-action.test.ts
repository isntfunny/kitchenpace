import assert from 'node:assert/strict';
import { test } from 'node:test';

import { z } from 'zod';

import { DataAccessError } from '../../src/lib/meal-plan/db';
import {
    ActionError,
    createActionRunnerWith,
    type ActionRunnerDeps,
    type ActionSession,
} from '../../src/lib/server-action';

function deps(session: ActionSession | null, allowed = true) {
    const calls: string[] = [];
    const value: ActionRunnerDeps = {
        getSession: async (scope) => {
            calls.push(`session:${scope}`);
            return session;
        },
        checkRateLimit: async (bucket, userId) => {
            calls.push(`limit:${bucket}:${userId}`);
            return { allowed };
        },
    };
    return { value, calls };
}

const USER = { user: { id: 'u1', role: 'user', banned: false } };
const BASE = {
    scope: 'pantry',
    rateLimit: 'shopping' as const,
    logLabel: '[test] failed',
    invalidCode: 'VALIDATION' as const,
    failedMessage: 'Kaputt.',
};

test('no session or a banned user gets SIGN_IN; the work never runs', async () => {
    for (const session of [
        null,
        { user: null },
        { user: { id: 'u1', role: 'banned' } },
        { user: { id: 'u1', banned: true } },
    ]) {
        let ran = false;
        const run = createActionRunnerWith(deps(session).value, BASE);
        const result = await run(async () => {
            ran = true;
        });
        assert.deepEqual(result, { ok: false, code: 'SIGN_IN', error: 'Bitte melde dich an.' });
        assert.equal(ran, false);
    }
});

test('rate limit uses the configured bucket and stops the work', async () => {
    const d = deps(USER, false);
    const run = createActionRunnerWith(d.value, BASE);
    const result = await run(async () => 1);
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.code, 'RATE_LIMIT');
    assert.deepEqual(d.calls, ['session:pantry', 'limit:shopping:u1']);
});

test('success returns the data and runs the after hook; a call can replace or skip it', async () => {
    const after: string[] = [];
    const run = createActionRunnerWith(deps(USER).value, {
        ...BASE,
        after: (userId) => {
            after.push(`default:${userId}`);
        },
    });
    assert.deepEqual(await run(async (userId) => `hi ${userId}`), { ok: true, data: 'hi u1' });
    await run(async () => null, { after: (userId) => void after.push(`own:${userId}`) });
    await run(async () => null, { after: false });
    assert.deepEqual(after, ['default:u1', 'own:u1']);
});

test('the after hook does not run when the work fails', async () => {
    let after = false;
    const run = createActionRunnerWith(deps(USER).value, {
        ...BASE,
        after: () => void (after = true),
    });
    const result = await run(async () => {
        throw new ActionError('STALE', 'Veraltet.');
    });
    assert.deepEqual(result, { ok: false, code: 'STALE', error: 'Veraltet.' });
    assert.equal(after, false);
});

test('default mapping: zod → invalid code, data errors keep their message', async () => {
    const run = createActionRunnerWith(deps(USER).value, BASE);
    const invalid = await run(async () => z.string().parse(1));
    assert.deepEqual(invalid, {
        ok: false,
        code: 'VALIDATION',
        error: 'Bitte prüfe deine Eingaben.',
    });
    const missing = await run(async () => {
        throw new DataAccessError('NOT_FOUND', 'Nicht gefunden.');
    });
    assert.deepEqual(missing, { ok: false, code: 'NOT_FOUND', error: 'Nicht gefunden.' });
    const conflict = await run(async () => {
        throw new DataAccessError('CONFLICT', 'Schon da.');
    });
    assert.deepEqual(conflict, { ok: false, code: 'FAILED', error: 'Schon da.' });
});

test('unexpected errors are logged and get the configured message', async (t) => {
    const logged = t.mock.method(console, 'error', () => {});
    const run = createActionRunnerWith(deps(USER).value, BASE);
    const result = await run(async () => {
        throw new Error('boom');
    });
    assert.deepEqual(result, { ok: false, code: 'FAILED', error: 'Kaputt.' });
    assert.equal(logged.mock.callCount(), 1);
    assert.equal(logged.mock.calls[0].arguments[0], '[test] failed');
});

test('mapError comes first and can declare an error unexpected', async (t) => {
    t.mock.method(console, 'error', () => {});
    const plan = createActionRunnerWith(deps(USER).value, {
        ...BASE,
        invalidCode: 'INVALID' as const,
        mapError: (error) =>
            error instanceof DataAccessError && error.code !== 'NOT_FOUND'
                ? { ok: false as const, code: 'INVALID' as const, error: error.message }
                : undefined,
    });
    assert.deepEqual(
        await plan(async () => {
            throw new DataAccessError('CONFLICT', 'Schon belegt.');
        }),
        { ok: false, code: 'INVALID', error: 'Schon belegt.' },
    );

    const helper = createActionRunnerWith(deps(USER).value, {
        ...BASE,
        mapError: (error, unexpected) =>
            error instanceof DataAccessError && error.code !== 'NOT_FOUND'
                ? unexpected(error)
                : undefined,
    });
    assert.deepEqual(
        await helper(async () => {
            throw new DataAccessError('INVALID', 'Ungültig.');
        }),
        { ok: false, code: 'FAILED', error: 'Kaputt.' },
    );
});
