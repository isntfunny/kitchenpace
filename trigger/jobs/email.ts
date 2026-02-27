import { task } from '@trigger.dev/sdk';

import { sendEmail, type SendEmailOptions } from '../lib/email';
import { emailTemplates } from '../lib/email-templates';

export const sendEmailTask = task({
    id: 'send-email',
    run: async (payload: SendEmailOptions) => {
        const result = await sendEmail(payload);
        return { success: result };
    },
});

export type EmailTemplateType = keyof typeof emailTemplates;

export const sendTemplatedEmailTask = task({
    id: 'send-templated-email',
    run: async (payload: {
        to: string;
        templateType: EmailTemplateType;
        variables: Record<string, string>;
    }) => {
        const template = emailTemplates[payload.templateType];

        if (!template) {
            throw new Error(`Unknown email template: ${payload.templateType}`);
        }

        let html = template.html;
        let subject = template.subject;

        for (const [key, value] of Object.entries(payload.variables)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        const result = await sendEmail({
            to: payload.to,
            subject,
            html,
        });

        return { success: result, templateType: payload.templateType };
    },
});

export const sendBatchEmailsTask = task({
    id: 'send-batch-emails',
    run: async (payload: { emails: SendEmailOptions[]; concurrency?: number }) => {
        const concurrency = payload.concurrency || 5;
        const results: { index: number; success: boolean; error?: string }[] = [];

        for (let i = 0; i < payload.emails.length; i += concurrency) {
            const batch = payload.emails.slice(i, i + concurrency);
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

        return {
            total: payload.emails.length,
            successful,
            failed,
            results,
        };
    },
});
