import { createLogger } from '@shared/logger';

type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

const AUTH_DEBUG_ENABLED = process.env.AUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production';
const logger = createLogger('auth');

const shouldLog = (level: AuthLogLevel) => level !== 'debug' || AUTH_DEBUG_ENABLED;

export const authDebugEnabled = AUTH_DEBUG_ENABLED;

export function logAuth(level: AuthLogLevel, message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(level)) {
        return;
    }

    logger[level](message, meta);
}
