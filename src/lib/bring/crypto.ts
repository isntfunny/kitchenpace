import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { z } from 'zod';

import { BringError } from './client';
import type { BringCredentials } from './types';

function encryptionKey(value = process.env.BRING_ENCRYPTION_KEY): Buffer {
    if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value))
        throw new BringError('CONFIG', 'Die Bring!-Verknüpfung ist noch nicht eingerichtet.');
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32)
        throw new BringError('CONFIG', 'Die Bring!-Verknüpfung ist noch nicht eingerichtet.');
    return key;
}

export function encryptCredentials(
    userId: string,
    credentials: BringCredentials,
    key?: string,
): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv);
    cipher.setAAD(Buffer.from(`bring:v1:${userId}`));
    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(credentials), 'utf8'),
        cipher.final(),
    ]);
    return [
        'v1',
        iv.toString('base64'),
        cipher.getAuthTag().toString('base64'),
        ciphertext.toString('base64'),
    ].join('.');
}

export function decryptCredentials(
    userId: string,
    encrypted: string,
    key?: string,
): BringCredentials {
    const secret = encryptionKey(key);
    try {
        const [version, iv, tag, ciphertext] = encrypted.split('.');
        if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid envelope');
        const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(iv, 'base64'));
        decipher.setAAD(Buffer.from(`bring:v1:${userId}`));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        const text = Buffer.concat([
            decipher.update(Buffer.from(ciphertext, 'base64')),
            decipher.final(),
        ]).toString('utf8');
        return z.object({ email: z.string(), password: z.string() }).parse(JSON.parse(text));
    } catch {
        throw new BringError('AUTH', 'Bitte verbinde dein Bring!-Konto erneut.');
    }
}
