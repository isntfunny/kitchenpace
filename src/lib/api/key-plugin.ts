import { apiKey } from '@better-auth/api-key';

export function personalApiKeyPlugin() {
    return apiKey({
        defaultPrefix: 'kt_',
        enableSessionForAPIKeys: false,
        rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 60 },
        permissions: { defaultPermissions: { recipes: ['read'] } },
        keyExpiration: { defaultExpiresIn: 90 * 86400, minExpiresIn: 1, maxExpiresIn: 365 },
    });
}

export const API_KEY_DISABLED_PATHS = [
    '/api-key/create',
    '/api-key/update',
    '/api-key/delete',
    '/api-key/get',
    '/api-key/list',
    '/api-key/delete-all-expired-api-keys',
];
