// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: 'https://2f3154469c3745a08f6b6d1e7f2b5d07@bugs.isntfunny.de/2',

    // Consent-gated: Session Replay is NOT loaded eagerly. Plain crash/error
    // reporting runs under legitimate interest (Art. 6 Abs. 1 lit. f DSGVO);
    // Session Replay + PII are added at runtime only after the user grants the
    // "monitoring" consent category (see src/lib/consent/sentryReplay.ts).
    integrations: [],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Replay sample rates are respected once replayIntegration is added post-consent.
    // This sets the sample rate to be 10%.
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // No PII without consent. Re-enabled together with Session Replay after the
    // user opts into the "monitoring" category.
    sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
