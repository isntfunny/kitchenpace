/**
 * Runtime gating of Sentry Session Replay + PII behind the "monitoring"
 * consent category. instrumentation-client.ts initializes Sentry WITHOUT
 * Replay and with sendDefaultPii:false (plain crash reporting under legitimate
 * interest). These helpers add/remove Replay and toggle PII only when the user
 * grants/revokes the monitoring category. Replay is bundled (not lazy-loaded
 * from Sentry's CDN) to avoid any external request.
 */

import * as Sentry from '@sentry/nextjs';

type ReplayLike = { start?: () => void; stop?: () => void | Promise<void> };

let replay: (ReturnType<typeof Sentry.replayIntegration> & ReplayLike) | null = null;

export function enableReplay(): void {
    const client = Sentry.getClient();
    if (!client) return;

    client.getOptions().sendDefaultPii = true;

    if (!replay) {
        replay = Sentry.replayIntegration();
        Sentry.addIntegration(replay);
    } else {
        try {
            replay.start?.();
        } catch {
            // already running
        }
    }
}

export function disableReplay(): void {
    const client = Sentry.getClient();
    if (client) {
        client.getOptions().sendDefaultPii = false;
    }
    try {
        void replay?.stop?.();
    } catch {
        // not running
    }
}
