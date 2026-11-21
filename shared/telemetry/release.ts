/**
 * Release identifier attached to spans, log lines, and client error reports.
 */
export const RELEASE: string =
    (typeof process !== 'undefined' &&
        (process.env.RELEASE_VERSION || process.env.SOURCE_COMMIT?.slice(0, 12))) ||
    process.env.NEXT_PUBLIC_RELEASE ||
    'dev';
