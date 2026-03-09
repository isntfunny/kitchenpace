import winston from 'winston';
import TransportStream from 'winston-transport';

const { NODE_ENV } = process.env;

// ── Minimal Seq transport (CLEF over fetch) ──────────────────────────────────
// Replaces winston-seq-updated which had ESM/Turbopack interop issues.
// Seq's CLEF endpoint: POST /api/events/raw, Content-Type: application/vnd.serilog.clef
const SEQ_LEVELS: Record<string, string> = {
    error: 'Error',
    warn: 'Warning',
    info: 'Information',
    http: 'Debug',
    verbose: 'Verbose',
    debug: 'Debug',
    silly: 'Verbose',
};

class SeqFetchTransport extends TransportStream {
    private endpoint: string;
    private apiKey: string;

    constructor(opts: { serverUrl: string; apiKey: string } & TransportStream.TransportStreamOptions) {
        const { serverUrl, apiKey, ...rest } = opts;
        super(rest);
        this.endpoint = `${serverUrl.replace(/\/$/, '')}/api/events/raw`;
        this.apiKey = apiKey;
    }

    log(info: Record<string, unknown>, callback: () => void) {
        setImmediate(() => this.emit('logged', info));

        const { level, message, timestamp, ...meta } = info;
        const event = {
            '@t': timestamp ?? new Date().toISOString(),
            '@l': SEQ_LEVELS[level as string] ?? 'Information',
            '@m': message,
            ...meta,
        };

        // fire-and-forget — never blocks the caller
        fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.serilog.clef',
                ...(this.apiKey ? { 'X-Seq-ApiKey': this.apiKey } : {}),
            },
            body: JSON.stringify(event),
        }).catch((e) => console.error('[seq]', e));

        callback();
    }
}
// ─────────────────────────────────────────────────────────────────────────────

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

if (process.env.SEQ_URL && process.env.SEQ_API_KEY) {
    transports.push(
        new SeqFetchTransport({
            serverUrl: process.env.SEQ_URL,
            apiKey: process.env.SEQ_API_KEY,
            level: 'debug',
        }),
    );
}

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
