import {
    sendEmailTask,
    sendTemplatedEmailTask,
    sendBatchEmailsTask,
    type EmailTemplateType,
} from '@/trigger/jobs/email';
import { syncOpenSearch, syncRecipeToOpenSearch } from '@/trigger/jobs/opensearch';

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
}

interface SendTemplatedEmailPayload {
    to: string;
    templateType: EmailTemplateType;
    variables: Record<string, string>;
}

interface BatchEmailPayload {
    emails: SendEmailPayload[];
    concurrency?: number;
}

export const trigger = {
    syncOpenSearch: async (payload: { batchSize?: number } = {}) => {
        return syncOpenSearch.trigger(payload);
    },

    syncRecipeToOpenSearch: async (recipeId: string) => {
        return syncRecipeToOpenSearch.trigger({ recipeId });
    },

    sendEmail: async (payload: SendEmailPayload) => {
        return sendEmailTask.trigger(payload);
    },

    sendTemplatedEmail: async (payload: SendTemplatedEmailPayload) => {
        return sendTemplatedEmailTask.trigger(payload);
    },

    sendBatchEmails: async (payload: BatchEmailPayload) => {
        return sendBatchEmailsTask.trigger(payload);
    },
};

export type { EmailTemplateType } from '@/trigger/jobs/email';
