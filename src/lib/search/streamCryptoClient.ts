/**
 * Client-side stream decryption using Web Crypto API.
 *
 * Mirrors the server-side HMAC-SHA256 + AES-256-GCM encryption
 * from streamCrypto.ts.
 */

/**
 * Derive a CryptoKey from a session token and hex-encoded salt.
 * Uses HMAC-SHA256 (matching server-side deriveKey).
 */
export async function deriveKeyClient(sessionToken: string, saltHex: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const saltBytes = hexToBytes(saltHex);

    // Import the session token as an HMAC key
    const hmacKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(sessionToken),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );

    // Sign the salt to produce the derived key material (32 bytes)
    const keyMaterial = await crypto.subtle.sign('HMAC', hmacKey, saltBytes.buffer as ArrayBuffer);

    // Import the derived key material as an AES-GCM key
    return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['decrypt']);
}

/**
 * Decrypt a chunk encrypted with AES-256-GCM.
 *
 * Input format: `base64(iv):base64(ciphertext):base64(authTag)`
 */
export async function decryptChunk(encrypted: string, key: CryptoKey): Promise<string> {
    const [ivB64, ciphertextB64, authTagB64] = encrypted.split(':');

    const iv = base64ToBytes(ivB64);
    const ciphertext = base64ToBytes(ciphertextB64);
    const authTag = base64ToBytes(authTagB64);

    // AES-GCM expects ciphertext + authTag concatenated
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, tagLength: 128 },
        key,
        combined.buffer as ArrayBuffer,
    );

    return new TextDecoder().decode(decrypted);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
