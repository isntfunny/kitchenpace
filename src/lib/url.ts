/** Canonical app base URL without trailing slash. */
const FALLBACK_APP_URL = 'https://kochtakt.de';

function normalize(url: string): string {
    const withScheme = /^https?:\/\//.test(url) ? url : `https://${url}`;
    return withScheme.replace(/\/$/, '');
}

if (
    typeof window === 'undefined' &&
    !process.env.SERVICE_URL &&
    !process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NODE_ENV === 'production'
) {
    console.error(
        `[url] Neither SERVICE_URL (runtime) nor NEXT_PUBLIC_APP_URL (build-time) is set — ` +
            `falling back to ${FALLBACK_APP_URL}. Canonical URLs, sitemap entries and ` +
            `structured data may point to the wrong domain.`,
    );
}

// Server-side the domain is resolved at RUNTIME from SERVICE_URL (set per
// environment by Coolify). NEXT_PUBLIC_APP_URL is inlined at build time and
// only acts as fallback — the beta image gets promoted to live unchanged, so
// a baked-in value belongs to the build environment, not the one the
// container actually serves.
export const APP_URL = normalize(
    (typeof window === 'undefined' ? process.env.SERVICE_URL : undefined) ||
        process.env.NEXT_PUBLIC_APP_URL ||
        FALLBACK_APP_URL,
);
