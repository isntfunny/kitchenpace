/** Canonical app base URL without trailing slash. */
const FALLBACK_APP_URL = 'https://kitchenpace.app';

if (
    !process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NODE_ENV === 'production' &&
    typeof window === 'undefined'
) {
    console.error(
        `[url] NEXT_PUBLIC_APP_URL is not set — falling back to ${FALLBACK_APP_URL}. ` +
            'Canonical URLs, sitemap entries and structured data will point to the wrong domain. ' +
            'Set NEXT_PUBLIC_APP_URL (build-time for client bundles, runtime for the server).',
    );
}

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_URL).replace(/\/$/, '');
