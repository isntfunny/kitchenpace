import assert from 'node:assert/strict';
import { test } from 'node:test';

import { keyInputSchema, permissionsForScopes } from '../../src/lib/api/permissions';
import { isPublicAddress, validateImportUrl } from '../../src/lib/api/safe-fetch';

test('new keys default to read-only and cannot request arbitrary permissions', () => {
    assert.deepEqual(keyInputSchema.parse({ name: 'Kitchen' }).scopes, ['recipes:read']);
    assert.equal(keyInputSchema.safeParse({ name: 'x', scopes: ['admin:write'] }).success, false);
    assert.equal(keyInputSchema.safeParse({ name: 'x', days: 0 }).success, false);
    assert.deepEqual(permissionsForScopes(['recipes:read', 'cooks:write']), {
        recipes: ['read'],
        cooks: ['write'],
    });
});

test('URL imports deny private, mapped, loopback and special network addresses', () => {
    for (const ip of [
        '127.0.0.1',
        '10.0.0.1',
        '169.254.169.254',
        '100.64.0.1',
        '::1',
        '::ffff:127.0.0.1',
        'fc00::1',
        '224.0.0.1',
        '192.0.2.1',
    ]) {
        assert.equal(isPublicAddress(ip), false, ip);
    }
    assert.equal(isPublicAddress('8.8.8.8'), true);
    assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('URL imports reject credentials, alternate protocols and internal ports', () => {
    for (const url of [
        'file:///etc/passwd',
        'http://localhost/x',
        'https://u:p@example.com',
        'https://example.com:9200/x',
        'http://2130706433/x',
    ]) {
        assert.throws(() => validateImportUrl(url), url);
    }
    assert.equal(validateImportUrl('https://example.com/recipe').hostname, 'example.com');
});
