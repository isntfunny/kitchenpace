export interface ExportResultLike {
    code: number;
    error?: Error;
}

export interface ExporterLike<T> {
    export(items: T, resultCallback: (result: ExportResultLike) => void): void;
}

export type HealthReporter = (line: string) => void;

const SUMMARY_EVERY_MS = 60_000;

export interface ExporterHealth {
    /** Consecutive failed batches since the last success. */
    readonly failing: number;
    /** Failed batches since start. */
    readonly failedTotal: number;
}

/**
 * Wraps an OTLP exporter to report export failures and recoveries to stderr
 * without re-entering the application logger.
 */
export function observeExporter<T, E extends ExporterLike<T>>(
    signal: string,
    exporter: E,
    report: HealthReporter = (line) => console.error(line),
    now: () => number = Date.now,
): E & { health: ExporterHealth } {
    let failing = 0;
    let failedTotal = 0;
    let lastSummary = 0;
    const original = exporter.export.bind(exporter);

    const observed = exporter as E & { health: ExporterHealth };
    observed.export = (items: T, resultCallback: (result: ExportResultLike) => void) => {
        let completed = false;
        const finish = (result: ExportResultLike) => {
            if (completed) return;
            completed = true;
            const status =
                result.error?.message.match(/\bHTTP\s+[45]\d{2}\b/i)?.[0] ??
                result.error?.message ??
                'export error';
            try {
                if (result.code !== 0) {
                    failing++;
                    failedTotal++;
                    const t = now();
                    if (failing === 1) {
                        lastSummary = t;
                        report(`[otel] ${signal} export failed, data dropped: ${status}`);
                    } else if (t - lastSummary >= SUMMARY_EVERY_MS) {
                        lastSummary = t;
                        report(
                            `[otel] ${signal} export still failing: ${failing} batches dropped so far (${status})`,
                        );
                    }
                } else if (failing > 0) {
                    report(`[otel] ${signal} export recovered after ${failing} failed batches`);
                    failing = 0;
                }
            } catch {
                // Never interrupt the export callback when stderr reporting fails.
            } finally {
                resultCallback(result);
            }
        };

        try {
            original(items, finish);
        } catch (error) {
            finish({ code: 1, error: error instanceof Error ? error : undefined });
        }
    };

    Object.defineProperty(observed, 'health', {
        get: (): ExporterHealth => ({ failing, failedTotal }),
    });

    return observed;
}
