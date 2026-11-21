import { z } from 'zod';

import { RELEASE } from '@shared/telemetry/release';
import { recordError } from '@shared/telemetry/tracing';

export const runtime = 'nodejs';

const ReportSchema = z.object({
    source: z.enum(['global', 'route', 'window', 'promise', 'boundary']),
    name: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
    stack: z.string().max(4000).optional(),
    digest: z.string().max(200).optional(),
    path: z.string().max(500).optional(),
    release: z.string().max(100).optional(),
    context: z.record(z.string(), z.union([z.string().max(200), z.boolean()])).optional(),
});

const MAX_BODY_BYTES = 16_384;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

let windowStart = 0;
let countInWindow = 0;

function allowRequest(now: number): boolean {
    if (now - windowStart > WINDOW_MS) {
        windowStart = now;
        countInWindow = 0;
    }
    return ++countInWindow <= MAX_PER_WINDOW;
}

function noContent(): Response {
    return new Response(null, { status: 204 });
}

function sanitizePath(raw?: string): string | undefined {
    if (!raw || !raw.startsWith('/')) return undefined;
    return raw.split(/[?#]/)[0]?.slice(0, 500);
}

export async function POST(request: Request): Promise<Response> {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
        return noContent();
    }
    if (!allowRequest(Date.now())) {
        return noContent();
    }

    let parsed: z.infer<typeof ReportSchema>;
    try {
        if (!request.body) return noContent();

        const reader = request.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                bytes += value.byteLength;
                if (bytes > MAX_BODY_BYTES) {
                    await reader.cancel();
                    return noContent();
                }
                chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }

        const rawText = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        parsed = ReportSchema.parse(JSON.parse(rawText));
    } catch {
        return noContent();
    }

    const clientRelease =
        parsed.release && /^[a-zA-Z0-9._-]{1,100}$/.test(parsed.release)
            ? parsed.release
            : undefined;
    const digest =
        parsed.digest && /^[a-zA-Z0-9._-]{1,200}$/.test(parsed.digest) ? parsed.digest : undefined;

    recordError(
        'client.error',
        {
            name: parsed.name ?? 'Error',
            message: parsed.message ?? 'Client error',
            stack: parsed.stack,
        },
        {
            source: parsed.source,
            route: sanitizePath(parsed.path),
            ...(digest ? { digest } : {}),
            ...(clientRelease ? { clientRelease } : {}),
            serverRelease: RELEASE,
            ...(parsed.context ?? {}),
        },
        { ownSpan: true, module: 'client' },
    );

    return noContent();
}
