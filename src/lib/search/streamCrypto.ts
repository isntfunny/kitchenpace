import { createCipheriv, createHmac, randomBytes } from 'node:crypto';

/**
 * Generate a random 16-byte salt for per-stream key derivation.
 */
export function generateSalt(): Buffer {
    return randomBytes(16);
}

/**
 * Derive a 256-bit AES key from a session token and salt.
 * Uses HMAC-SHA256 — the output is exactly 32 bytes (256 bits).
 */
export function deriveKey(sessionToken: string, salt: Buffer): Buffer {
    return createHmac('sha256', sessionToken).update(salt).digest();
}

/**
 * Encrypt a JSON-Lines chunk using AES-256-GCM.
 *
 * Returns: `base64(iv):base64(ciphertext):base64(authTag)`
 *
 * Each chunk gets a unique 12-byte IV.
 */
export function encryptChunk(plaintext: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}
