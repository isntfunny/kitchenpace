export const REDACTED = '[redacted]';

const SENSITIVE_KEY_PARTS = [
    'password',
    'passwort',
    'secret',
    'token',
    'authorization',
    'cookie',
    'apikey',
    'api_key',
    'credential',
    'privatekey',
    'private_key',
    'sessiontoken',
    'set-cookie',
];

const MAX_DEPTH = 4;
const MAX_ARRAY_LENGTH = 50;
const MAX_STRING_LENGTH = 2000;
const MAX_STACK_LENGTH = 4000;
const MAX_STACK_FRAMES = 25;

function isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeString(value: string, maxLength = MAX_STRING_LENGTH): string {
    return value
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, `Bearer ${REDACTED}`)
        .replace(/([a-z][a-z0-9+.-]*:\/\/[^:/\s]*:)[^@\s]+@/gi, `$1${REDACTED}@`)
        .replace(/((?:password|passwort|secret|token|api[_-]?key)=)([^\s&;,]+)/gi, `$1${REDACTED}`)
        .slice(0, maxLength);
}

export function sanitizeStack(stack: unknown): string | undefined {
    if (typeof stack !== 'string' || stack.length === 0) return undefined;
    const lines = stack.slice(0, MAX_STACK_LENGTH * 2).split('\n');
    const kept = lines.slice(0, MAX_STACK_FRAMES + 1).map((line) => sanitizeString(line, 400));
    const joined = kept.join('\n').slice(0, MAX_STACK_LENGTH);
    return joined || undefined;
}

export interface SanitizedError {
    name: string;
    message: string;
    stack?: string;
}

export function sanitizeError(error: unknown): SanitizedError {
    if (error instanceof Error) {
        return {
            name: sanitizeString(error.name || 'Error', 200),
            message: sanitizeString(error.message || 'Unknown error', 1000),
            ...(error.stack ? { stack: sanitizeStack(error.stack) } : {}),
        };
    }

    if (typeof error === 'object' && error !== null) {
        const record = error as { name?: unknown; message?: unknown; stack?: unknown };
        const name = typeof record.name === 'string' && record.name ? record.name : 'Error';
        const message =
            typeof record.message === 'string' && record.message ? record.message : 'Unknown error';
        const stack = sanitizeStack(record.stack);
        return {
            name: sanitizeString(name, 200),
            message: sanitizeString(message, 1000),
            ...(stack ? { stack } : {}),
        };
    }

    return {
        name: 'Error',
        message: typeof error === 'string' ? sanitizeString(error, 1000) : 'Unknown error',
    };
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return sanitizeString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) return sanitizeError(value);

    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[circular]';
    if (depth >= MAX_DEPTH) return '[truncated]';

    seen.add(value);

    if (Array.isArray(value)) {
        return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1, seen));
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v === undefined) continue;
        if (isSensitiveKey(k)) {
            out[k] = REDACTED;
        } else {
            out[k] = sanitizeValue(v, depth + 1, seen);
        }
    }
    return out;
}

export function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    if (!meta) return {};
    const sanitized = sanitizeValue(meta, 0, new WeakSet<object>());
    return typeof sanitized === 'object' && sanitized !== null && !Array.isArray(sanitized)
        ? (sanitized as Record<string, unknown>)
        : {};
}

export function isNextControlFlowError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    const digest = (err as { digest?: unknown }).digest;
    if (
        typeof digest === 'string' &&
        /^(NEXT_REDIRECT;|NEXT_HTTP_ERROR_FALLBACK;|NEXT_PRERENDER_INTERRUPTED$|DYNAMIC_SERVER_USAGE$|BAILOUT_TO_CLIENT_SIDE_RENDERING$|HANGING_PROMISE)/.test(
            digest,
        )
    ) {
        return true;
    }
    return (err as { $$typeof?: unknown }).$$typeof === Symbol.for('react.postpone');
}
