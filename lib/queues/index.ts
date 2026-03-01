export {
    QueueName,
    type AllJob,
    type SendEmailJob,
    type SendTemplatedEmailJob,
    type SendBatchEmailsJob,
    type SyncOpenSearchJob,
    type SyncRecipeToOpenSearchJob,
    type DailyRecipeJob,
    type WeeklyNewsletterJob,
} from './types';
export { getEmailQueue, getOpenSearchQueue, getScheduledQueue, closeAllQueues } from './queue';
export { getRedis, getSubscriber, disconnectRedis, redisConfig } from './connection';
export { startWorkers, stopWorkers } from './worker';
export { startScheduler, stopScheduler, triggerJobNow } from './scheduler';
export { sendEmail, sendPasswordResetEmail, sendActivationEmail } from './email-service';
export { renderEmailTemplate, emailTemplates, getEmailTemplate } from './email-templates';
export { prisma } from './prisma';

import { getEmailQueue, getOpenSearchQueue, getScheduledQueue } from './queue';

export async function addSendEmailJob(data: {
    to: string;
    subject: string;
    html: string;
}): Promise<void> {
    const queue = getEmailQueue();
    await queue.add('send-email', data);
}

export async function addTemplatedEmailJob(data: {
    to: string;
    templateType: string;
    variables: Record<string, string>;
}): Promise<void> {
    const queue = getEmailQueue();
    await queue.add('send-templated-email', data);
}

export async function addBatchEmailsJob(data: {
    emails: Array<{ to: string; subject: string; html: string }>;
    concurrency?: number;
}): Promise<void> {
    const queue = getEmailQueue();
    await queue.add('send-batch-emails', data);
}

export async function addOpenSearchSyncJob(data?: { batchSize?: number }): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-opensearch', data || {});
}

export async function addSyncRecipeJob(recipeId: string): Promise<void> {
    const queue = getOpenSearchQueue();
    await queue.add('sync-recipe', { recipeId });
}

export async function addDailyRecipeJob(recipientEmail?: string): Promise<void> {
    const queue = getScheduledQueue();
    await queue.add('daily-recipe', { recipientEmail: recipientEmail || 'test@example.com' });
}

export async function addWeeklyNewsletterJob(dryRun?: boolean): Promise<void> {
    const queue = getScheduledQueue();
    await queue.add('weekly-newsletter', { dryRun: dryRun ?? false });
}
