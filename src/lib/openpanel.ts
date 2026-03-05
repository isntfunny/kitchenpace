import { OpenPanel } from '@openpanel/nextjs';

const clientId = process.env.OPENPANEL_CLIENT_ID;
const clientSecret = process.env.OPENPANEL_CLIENT_SECRET;
const apiUrl = process.env.OPENPANEL_API_URL;

const isConfigured = Boolean(clientId && clientSecret);

export const opServer = isConfigured
    ? new OpenPanel({
          clientId: clientId!,
          clientSecret: clientSecret!,
          ...(apiUrl ? { apiUrl } : {}),
      })
    : null;

export function trackServerEvent(
    eventName: string,
    properties?: Record<string, string | number | boolean>,
    options?: {
        profileId?: string;
    },
) {
    if (!opServer) {
        return;
    }

    try {
        opServer.track(eventName, {
            ...properties,
            ...(options?.profileId ? { profileId: options.profileId } : {}),
        });
    } catch (error) {
        console.error('[OpenPanel] Failed to track event:', error);
    }
}
