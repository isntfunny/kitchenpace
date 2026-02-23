type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

const AUTH_DEBUG_ENABLED = process.env.AUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production';

const levelToConsole: Record<AuthLogLevel, (...args: unknown[]) => void> = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
};

const shouldLog = (level: AuthLogLevel) => level !== 'debug' || AUTH_DEBUG_ENABLED;

export const authDebugEnabled = AUTH_DEBUG_ENABLED;

export function logAuth(level: AuthLogLevel, message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(level)) {
        return;
    }

    const prefix = `[auth] ${message}`;

    if (meta && Object.keys(meta).length > 0) {
        levelToConsole[level](prefix, meta);
    } else {
        levelToConsole[level](prefix);
    }
}
