import { createLogger } from '@shared/logger';

const log = createLogger('notifuse-email');

const NOTIFUSE_API_KEY = process.env.NOTIFUSE_API_KEY;
const NOTIFUSE_BASE_URI = process.env.NOTIFUSE_BASE_URI || 'https://api.notifuse.com/v2/';
const NOTIFUSE_WORKSPACE_ID = process.env.NOTIFUSE_WORKSPACE_ID;
const NOTIFUSE_LIST_KITCHENPACE_USERS =
    process.env.NOTIFUSE_LIST_USERS ??
    (process.env.NODE_ENV === 'production' ? 'kitchenpacelive' : 'kitchenpaceusers');
const NOTIFUSE_REQUEST_TIMEOUT_MS = 10_000;

type NotifuseApiResponse<T extends object = Record<string, unknown>> = {
    success?: boolean;
    message?: string;
    error?: string;
} & T;

interface SyncContactParams {
    email: string;
    externalId?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
}

const ensureConfig = () => {
    if (!NOTIFUSE_API_KEY) {
        throw new Error('NOTIFUSE_API_KEY must be configured to send emails');
    }

    if (!NOTIFUSE_WORKSPACE_ID) {
        throw new Error('NOTIFUSE_WORKSPACE_ID must be configured to send emails');
    }

    return {
        apiKey: NOTIFUSE_API_KEY,
        workspaceId: NOTIFUSE_WORKSPACE_ID,
    };
};

const buildEndpointUrl = (endpoint: string) => new URL(endpoint, NOTIFUSE_BASE_URI).toString();

const callNotifuse = async <T extends object>(
    endpoint: string,
    payload: Record<string, unknown>,
): Promise<NotifuseApiResponse<T>> => {
    const { apiKey } = ensureConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOTIFUSE_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(buildEndpointUrl(endpoint), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        const text = await response.text();
        const parsed = text
            ? (JSON.parse(text) as NotifuseApiResponse<T>)
            : ({} as NotifuseApiResponse<T>);

        if (!response.ok || parsed.success === false) {
            const details = parsed.message || parsed.error || response.statusText;
            log.error('Notifuse API error', {
                endpoint,
                status: response.status,
                details,
                rawResponse: text.slice(0, 500),
            });
            throw new Error(`Notifuse request to ${endpoint} failed: ${details}`);
        }

        return parsed;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(
                `Notifuse request to ${endpoint} timed out after ${NOTIFUSE_REQUEST_TIMEOUT_MS}ms`,
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const upsertContact = async (contact: SyncContactParams & { contactId: string }) => {
    const { workspaceId } = ensureConfig();

    try {
        await callNotifuse('contacts.upsert', {
            workspace_id: workspaceId,
            contact: {
                email: contact.contactId,
                external_id: contact.externalId,
                first_name: contact.firstName,
                last_name: contact.lastName,
                full_name: contact.nickname || contact.firstName,
            },
        });
    } catch (error) {
        // Notifuse contacts.upsert has a known bug where it throws a duplicate key
        // violation for existing contacts instead of updating them. Treat as no-op.
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('duplicate key')) {
            log.debug('Notifuse contact already exists, skipping upsert', {
                email: contact.contactId,
            });
            return;
        }
        throw error;
    }
};

const subscribeContactToList = async (contactId: string, externalId?: string) => {
    const { workspaceId } = ensureConfig();

    await callNotifuse('lists.subscribe', {
        workspace_id: workspaceId,
        contact: {
            email: contactId,
            external_id: externalId,
        },
        list_ids: [NOTIFUSE_LIST_KITCHENPACE_USERS],
    });
};

export async function syncContactToNotifuse(params: SyncContactParams): Promise<void> {
    const contactId = params.email.toLowerCase().trim();

    await upsertContact({ ...params, contactId });
    await subscribeContactToList(contactId, params.externalId);

    log.info('Synced contact to Notifuse', {
        email: contactId,
        externalId: params.externalId,
        list: NOTIFUSE_LIST_KITCHENPACE_USERS,
    });
}
