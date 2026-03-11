/** Canonical app base URL without trailing slash. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kitchenpace.app').replace(
    /\/$/,
    '',
);
