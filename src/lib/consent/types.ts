/**
 * Consent contract shared across the consent banner, the gated tracker
 * wrappers and the privacy policy. Category keys must stay in sync with the
 * sections in src/app/datenschutz/page.tsx ("Cookies, lokale Speicherung und
 * Reichweitenmessung").
 */

export type ConsentCategory = 'necessary' | 'analytics' | 'monitoring' | 'support';

export type ConsentState = Record<ConsentCategory, boolean>;

/**
 * Bump when the categories or the privacy text materially change to re-prompt
 * everyone. vanilla-cookieconsent compares this against its stored revision.
 */
export const CONSENT_REVISION = 1;

export const DEFAULT_CONSENT: ConsentState = {
    necessary: true,
    analytics: false,
    monitoring: false,
    support: false,
};
