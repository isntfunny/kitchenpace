/**
 * Graceful stop for long bulk runs (KUC-115): the first SIGINT, SIGTERM or
 * SIGHUP only sets a flag, so the loop finishes the recipe in hand and then
 * leaves through its normal path (sync, result file). A second signal ends
 * the process at once.
 */

export const STOP_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

type SignalTarget = Pick<NodeJS.Process, 'on' | 'off' | 'exit'>;

export interface StopSignal {
    /** true once a stop signal arrived */
    readonly requested: boolean;
    /** Which signal arrived first (for the log) */
    readonly signal: string | null;
    /** Removes the handlers again */
    dispose(): void;
}

export function stopOnSignal(
    onFirst: (signal: string) => void,
    target: SignalTarget = process,
): StopSignal {
    let signal: string | null = null;
    const handler = (received: NodeJS.Signals) => {
        if (signal !== null) {
            target.exit(130);
            return;
        }
        signal = received;
        onFirst(received);
    };
    for (const name of STOP_SIGNALS) target.on(name, handler);
    return {
        get requested() {
            return signal !== null;
        },
        get signal() {
            return signal;
        },
        dispose() {
            for (const name of STOP_SIGNALS) target.off(name, handler);
        },
    };
}
