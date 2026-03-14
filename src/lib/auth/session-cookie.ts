export const SESSION_COOKIE_NAME = process.env.NEXTAUTH_URL?.startsWith('https://')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
