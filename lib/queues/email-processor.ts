import { Job } from 'bullmq';

import { sendEmail } from './email-service';
import { renderEmailTemplate } from './email-templates';
import { SendEmailJob, SendTemplatedEmailJob, SendBatchEmailsJob } from './types';

export async function processSendEmail(job: Job<SendEmailJob>): Promise<{ success: boolean }> {
    const { to, subject, html } = job.data;

    console.log(`[Email] Processing send-email job ${job.id}`, { to, subject });

    try {
        const result = await sendEmail({ to, subject, html });
        console.log(`[Email] send-email job ${job.id} completed`, { success: result, to });
        return { success: result };
    } catch (error) {
        console.error(`[Email] send-email job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
            to,
        });
        throw error;
    }
}

export async function processSendTemplatedEmail(
    job: Job<SendTemplatedEmailJob>,
): Promise<{ success: boolean; templateType: string }> {
    const { to, templateType, variables } = job.data;

    console.log(`[Email] Processing send-templated-email job ${job.id}`, { to, templateType });

    const template = renderEmailTemplate(templateType, variables);
    if (!template) {
        console.error(`[Email] Unknown template: ${templateType}`);
        throw new Error(`Unknown email template: ${templateType}`);
    }

    try {
        const result = await sendEmail({
            to,
            subject: template.subject,
            html: template.html,
        });

        console.log(`[Email] send-templated-email job ${job.id} completed`, {
            success: result,
            to,
            templateType,
        });

        return { success: result, templateType };
    } catch (error) {
        console.error(`[Email] send-templated-email job ${job.id} failed`, {
            error: error instanceof Error ? error.message : String(error),
            to,
            templateType,
        });
        throw error;
    }
}

export async function processSendBatchEmails(
    job: Job<SendBatchEmailsJob>,
): Promise<{ total: number; successful: number; failed: number }> {
    const { emails, concurrency = 5 } = job.data;

    console.log(`[Email] Processing send-batch-emails job ${job.id}`, {
        total: emails.length,
        concurrency,
    });

    const results: { index: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < emails.length; i += concurrency) {
        const batch = emails.slice(i, i + concurrency);

        const batchResults = await Promise.all(
            batch.map(async (email, batchIndex) => {
                try {
                    const success = await sendEmail(email);
                    return { index: i + batchIndex, success, error: undefined };
                } catch (error) {
                    return {
                        index: i + batchIndex,
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            }),
        );

        results.push(...batchResults);
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[Email] send-batch-emails job ${job.id} completed`, {
        total: emails.length,
        successful,
        failed,
    });

    return { total: emails.length, successful, failed };
}
