import winston from 'winston';

const { NODE_ENV } = process.env;

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
                return `${timestamp} [${level}] ${message} ${metaStr}`;
            }),
        ),
        level: NODE_ENV === 'production' ? 'info' : 'debug',
    }),
];

// TODO: SeqTransport loading disabled to avoid Turbopack build issues
// This should be re-enabled with a proper ESM-compatible approach

export const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports,
    exitOnError: false,
});

export const createLogger = (module: string) => {
    return {
        debug: (message: string, meta?: Record<string, unknown>) =>
            logger.debug(`[${module}] ${message}`, meta),
        info: (message: string, meta?: Record<string, unknown>) =>
            logger.info(`[${module}] ${message}`, meta),
        warn: (message: string, meta?: Record<string, unknown>) =>
            logger.warn(`[${module}] ${message}`, meta),
        error: (message: string, meta?: Record<string, unknown>) =>
            logger.error(`[${module}] ${message}`, meta),
    };
};
