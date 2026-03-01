import {
    addOpenSearchSyncJob,
    addSyncRecipeJob,
    addSendEmailJob,
    addTemplatedEmailJob,
    addBatchEmailsJob,
    addDailyRecipeJob,
    addWeeklyNewsletterJob,
} from '@/lib/queues';

interface SendEmailPayload {
    to: string;
    subject: string;
    html: string;
}

interface SendTemplatedEmailPayload {
    to: string;
    templateType: string;
    variables: Record<string, string>;
}

interface BatchEmailPayload {
    emails: SendEmailPayload[];
    concurrency?: number;
}

export const queue = {
    syncOpenSearch: async (payload: { batchSize?: number } = {}) => {
        await addOpenSearchSyncJob(payload);
    },

    syncRecipeToOpenSearch: async (recipeId: string) => {
        await addSyncRecipeJob(recipeId);
    },

    sendEmail: async (payload: SendEmailPayload) => {
        await addSendEmailJob(payload);
    },

    sendTemplatedEmail: async (payload: SendTemplatedEmailPayload) => {
        await addTemplatedEmailJob(payload);
    },

    sendBatchEmails: async (payload: BatchEmailPayload) => {
        await addBatchEmailsJob(payload);
    },

    sendDailyRecipe: async (recipientEmail?: string) => {
        await addDailyRecipeJob(recipientEmail);
    },

    sendWeeklyNewsletter: async (dryRun?: boolean) => {
        await addWeeklyNewsletterJob(dryRun);
    },
};

export { QueueName } from '@/lib/queues';
