import { createLogger } from '@shared/logger';

const log = createLogger('notifuse-email');

const NOTIFUSE_API_KEY = process.env.NOTIFUSE_API_KEY;
const NOTIFUSE_BASE_URI = process.env.NOTIFUSE_BASE_URI || 'https://api.notifuse.com/v2/';
const NOTIFUSE_WORKSPACE_ID = process.env.NOTIFUSE_WORKSPACE_ID;
const NOTIFUSE_NOTIFICATION_ACTIVATION =
    process.env.NOTIFUSE_NOTIFICATION_ACTIVATION || 'activate_account';
const NOTIFUSE_NOTIFICATION_WELCOME = process.env.NOTIFUSE_NOTIFICATION_WELCOME || 'welcome';
const NOTIFUSE_NOTIFICATION_PASSWORD_RESET =
    process.env.NOTIFUSE_NOTIFICATION_PASSWORD_RESET || 'password_reset';
const NOTIFUSE_NOTIFICATION_WEEKLY =
    process.env.NOTIFUSE_NOTIFICATION_WEEKLY || 'weekly_newsletter';
const NOTIFUSE_LIST_KITCHENPACE_USERS = 'kitchenpaceusers';
const NOTIFUSE_LIST_NEWSLETTER = 'newsletter';
const NOTIFUSE_REQUEST_TIMEOUT_MS = 10_000;

type NotifuseApiResponse<T extends object = Record<string, unknown>> = {
    success?: boolean;
    message?: string;
    error?: string;
} & T;

interface NotifuseResponse {
    message_id: string;
    success: boolean;
}

interface SyncContactParams {
    email: string;
    externalId?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
}

interface TransactionalPayload {
    email: string;
    data: Record<string, unknown>;
    notificationId: string;
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

const sendTransactionalEmail = async ({
    email,
    data,
    notificationId,
}: TransactionalPayload): Promise<NotifuseResponse> => {
    const { workspaceId } = ensureConfig();
    const normalizedEmail = email.toLowerCase().trim();

    const response = await callNotifuse<{ message_id?: string }>('transactional.send', {
        workspace_id: workspaceId,
        notification: {
            id: notificationId,
            contact: { email: normalizedEmail },
            channels: ['email'],
            data,
        },
    });

    log.info('Notifuse email sent', {
        email: normalizedEmail,
        notificationId,
        messageId: response.message_id,
    });

    return {
        message_id: response.message_id ?? '',
        success: response.success ?? true,
    };
};

export async function syncContactToNotifuse(params: SyncContactParams): Promise<void> {
    const contactId = params.email.toLowerCase().trim();

    await Promise.all([
        upsertContact({ ...params, contactId }),
        subscribeContactToList(contactId, params.externalId),
    ]);

    log.info('Synced contact to Notifuse', {
        email: contactId,
        externalId: params.externalId,
        list: NOTIFUSE_LIST_KITCHENPACE_USERS,
    });
}

type SendActivationParams = {
    email: string;
    activationLink: string;
};

type SendPasswordResetParams = {
    email: string;
    resetLink: string;
};

type SendWelcomeParams = {
    email: string;
    dashboardLink?: string;
    notifyOnNewsletter?: boolean;
};

export async function sendNotifuseWelcomeEmail({
    email,
    dashboardLink,
    notifyOnNewsletter = true,
}: SendWelcomeParams): Promise<NotifuseResponse | null> {
    if (!notifyOnNewsletter) {
        log.info('Skipping welcome email - user opted out of newsletter', { email });
        return null;
    }

    return sendTransactionalEmail({
        notificationId: NOTIFUSE_NOTIFICATION_WELCOME,
        email,
        data: { variables: { appUrl: dashboardLink } },
    });
}

export async function sendNotifuseActivationEmail({
    email,
    activationLink,
}: SendActivationParams): Promise<NotifuseResponse> {
    return sendTransactionalEmail({
        notificationId: NOTIFUSE_NOTIFICATION_ACTIVATION,
        email,
        data: { variables: { activationLink } },
    });
}

export async function sendNotifusePasswordResetEmail({
    email,
    resetLink,
}: SendPasswordResetParams): Promise<NotifuseResponse> {
    return sendTransactionalEmail({
        notificationId: NOTIFUSE_NOTIFICATION_PASSWORD_RESET,
        email,
        data: { variables: { resetLink } },
    });
}

type RecipeData = {
    name: string;
    description: string;
    image_url: string;
    url: string;
    time_minutes: number;
    difficulty: 'Einfach' | 'Mittel' | 'Schwer';
    rating?: number;
};

type SendWeeklyNewsletterParams = {
    latest_recipes: RecipeData[];
    top_recipes: RecipeData[];
    categoryCookingUrl: string;
    categoryBakingUrl: string;
    categorySideDishUrl: string;
};

export async function sendWeeklyNewsletter(
    params: SendWeeklyNewsletterParams,
): Promise<NotifuseResponse> {
    const { workspaceId } = ensureConfig();

    const response = await callNotifuse<{ message_id?: string }>('broadcast.send', {
        workspace_id: workspaceId,
        notification: {
            id: NOTIFUSE_NOTIFICATION_WEEKLY,
            list_id: NOTIFUSE_LIST_NEWSLETTER,
            data: {
                variables: {
                    latest_recipes: params.latest_recipes,
                    top_recipes: params.top_recipes,
                    categoryCookingUrl: params.categoryCookingUrl,
                    categoryBakingUrl: params.categoryBakingUrl,
                    categorySideDishUrl: params.categorySideDishUrl,
                },
            },
        },
    });

    log.info('Weekly newsletter sent', {
        notificationId: NOTIFUSE_NOTIFICATION_WEEKLY,
        listId: NOTIFUSE_LIST_NEWSLETTER,
        messageId: response.message_id,
        latestCount: params.latest_recipes.length,
        topCount: params.top_recipes.length,
    });

    return {
        message_id: response.message_id ?? '',
        success: response.success ?? true,
    };
}
