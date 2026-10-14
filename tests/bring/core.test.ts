import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BringClient, BringError } from '../../src/lib/bring/client';
import { encryptCredentials, decryptCredentials } from '../../src/lib/bring/crypto';
import { scaleQuantity, resolveCatalogItem } from '../../src/lib/bring/items';

test('quantities preserve meaning for fractions, ranges, commas and free text', () => {
    for (const [raw, scale, expected] of [
        ['1/2', 3, '1,5'],
        ['1,5', 2, '3'],
        ['2–3', 2, '4–6'],
        ['nach Geschmack', 2, 'nach Geschmack'],
        ['1 1/2', 2, '3'],
        ['½', 2, '1'],
        ['', 2, ''],
        ['0', 2, '0'],
        ['1/0', 2, '1/0'],
    ] as const)
        assert.equal(scaleQuantity(raw, scale), expected);
});

test('catalog resolves localized exact names without substituting unrelated foods', () => {
    const entries = [
        { itemId: 'Peperoni', name: 'Paprika' },
        { itemId: 'Eier', name: 'Eier' },
    ];
    assert.equal(resolveCatalogItem('paprika', entries), 'Peperoni');
    assert.equal(resolveCatalogItem('Eierlikör', entries), 'Eierlikör');
    assert.equal(resolveCatalogItem('Paprikapulver', entries), 'Paprikapulver');
});

test('credentials are authenticated, randomized and bound to the local user', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const credentials = { email: 'test@example.org', password: 'secret & = +' };
    const encrypted = encryptCredentials('user-a', credentials, key);
    assert.ok(!encrypted.includes('secret'));
    assert.notEqual(encrypted, encryptCredentials('user-a', credentials, key));
    assert.deepEqual(decryptCredentials('user-a', encrypted, key), credentials);
    assert.throws(() => decryptCredentials('user-b', encrypted, key));
    assert.throws(() => encryptCredentials('user-a', credentials, 'bad-key'));
});

test('adapter encodes form fields and rejects failed writes without exposing remote content', async () => {
    const requests: Request[] = [];
    let fail = false;
    const fakeFetch: typeof fetch = async (url, init) => {
        const request = new Request(url, init);
        requests.push(request);
        if (request.url.endsWith('/bringauth'))
            return Response.json({ uuid: 'user-1', access_token: 'token' });
        return fail
            ? new Response('secret upstream error', { status: 401 })
            : new Response(null, { status: 204 });
    };
    const client = await BringClient.login({ email: 'me@example.org', password: 'a&b' }, fakeFetch);
    await client.write('list-1', 'add', 'Salz & Pfeffer', '50% + 2=3');
    const body = new URLSearchParams(await requests[1].text());
    assert.equal(body.get('purchase'), 'Salz & Pfeffer');
    assert.equal(body.get('specification'), '50% + 2=3');
    assert.equal(body.get('remove'), '');
    fail = true;
    await assert.rejects(client.write('list-1', 'complete', 'Milch', ''), (error: unknown) => {
        assert.ok(error instanceof BringError);
        assert.equal(error.code, 'AUTH');
        assert.ok(!error.message.includes('secret'));
        return true;
    });
});

test('adapter rejects malformed success responses instead of inventing an empty list', async () => {
    const fakeFetch: typeof fetch = async (url) =>
        String(url).endsWith('/bringauth')
            ? Response.json({ uuid: 'user-1', access_token: 'token' })
            : Response.json({ unexpected: [] });
    const client = await BringClient.login(
        { email: 'me@example.org', password: 'secret' },
        fakeFetch,
    );
    await assert.rejects(client.lists());
    await assert.rejects(client.items('list-1'));
});
