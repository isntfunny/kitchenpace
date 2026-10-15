import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';

import ipaddr from 'ipaddr.js';

import { ApiError } from './errors';

export function isPublicAddress(address: string): boolean {
    try {
        return ipaddr.process(address).range() === 'unicast';
    } catch {
        return false;
    }
}
export function validateImportUrl(input: string): URL {
    let url: URL;
    try {
        url = new URL(input);
    } catch {
        throw new ApiError(400, 'INVALID_URL');
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.port ||
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        (!hostname.includes('.') && !isIP(hostname)) ||
        (isIP(hostname) && !isPublicAddress(hostname))
    )
        throw new ApiError(400, 'INVALID_URL');
    return url;
}

/** Resolve every redirect and pin its connection: checking DNS alone permits rebinding. */
export async function fetchImportText(input: string): Promise<string> {
    let url = validateImportUrl(input);
    const deadline = Date.now() + 30_000;
    for (let redirect = 0; redirect <= 3; redirect++) {
        const hostname = url.hostname.replace(/^\[|\]$/g, '');
        const addresses = await lookup(hostname, { all: true });
        if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
            throw new ApiError(400, 'UNSAFE_URL');
        const pinned = addresses[0];
        const response = await new Promise<{ text?: string; location?: string }>(
            (resolve, reject) => {
                const transport = url.protocol === 'https:' ? https : http;
                const request = transport.get(
                    url,
                    {
                        headers: {
                            Accept: 'text/html, text/plain',
                            'User-Agent': 'KuechenTakt-RecipeImport/1.0',
                            'Accept-Encoding': 'identity',
                        },
                        // The original hostname remains in Host and TLS SNI.
                        lookup: ((
                            _hostname: string,
                            _options: unknown,
                            callback: (...args: unknown[]) => void,
                        ) => {
                            callback(null, pinned.address, pinned.family);
                        }) as never,
                        family: pinned.family,
                        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
                    },
                    (res) => {
                        if (
                            [301, 302, 303, 307, 308].includes(res.statusCode ?? 0) &&
                            res.headers.location
                        ) {
                            res.destroy();
                            resolve({ location: res.headers.location });
                            return;
                        }
                        if (
                            res.statusCode !== 200 ||
                            !/^text\/(html|plain)(;|$)/i.test(res.headers['content-type'] ?? '')
                        ) {
                            res.destroy();
                            reject(new ApiError(400, 'UNSUPPORTED_SOURCE'));
                            return;
                        }
                        let size = 0;
                        const chunks: Buffer[] = [];
                        res.on('data', (chunk: Buffer) => {
                            size += chunk.length;
                            if (size > 1_000_000)
                                res.destroy(new ApiError(413, 'SOURCE_TOO_LARGE'));
                            else chunks.push(chunk);
                        });
                        res.on('error', reject);
                        res.on('end', () =>
                            resolve({ text: Buffer.concat(chunks).toString('utf8') }),
                        );
                    },
                );
                request.on('error', reject);
            },
        );
        if (response.location) {
            url = validateImportUrl(new URL(response.location, url).href);
            continue;
        }
        const text = (response.text ?? '')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (text.length < 20 || text.length > 50_000)
            throw new ApiError(400, 'INVALID_SOURCE_LENGTH');
        return text;
    }
    throw new ApiError(400, 'TOO_MANY_REDIRECTS');
}
