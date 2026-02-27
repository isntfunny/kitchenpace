type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;

        switch (level) {
            case 'debug':
                console.debug(logMessage, context || '');
                break;
            case 'info':
                console.info(logMessage, context || '');
                break;
            case 'warn':
                console.warn(logMessage, context || '');
                break;
            case 'error':
                console.error(logMessage, context || '');
                break;
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }
}

export function createLogger(context: string): Logger {
    return new Logger(context);
}
