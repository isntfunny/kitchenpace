import { SignJWT, jwtVerify } from 'jose';

import type { QRUploadTokenPayload } from './types';

const TTL = '15m';

function getSecret(): Uint8Array {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('NEXTAUTH_SECRET not set');
    return new TextEncoder().encode(secret);
}

export async function signQRToken(payload: Omit<QRUploadTokenPayload, 'exp'>): Promise<string> {
    return new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TTL)
        .sign(getSecret());
}

export async function verifyQRToken(token: string): Promise<QRUploadTokenPayload> {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as QRUploadTokenPayload;
}
