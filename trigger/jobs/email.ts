import { task, logger } from '@trigger.dev/sdk';

import { sendEmail, type SendEmailOptions } from '../lib/email';
import { emailTemplates } from '../lib/email-templates';

export const sendEmailTask = task({
    id: 'send-email',
    run: async (payload: SendEmailOptions, { ctx }) => {
        logger.info('📧 Starting email send', {
            to: payload.to,
            subject: payload.subject,
            htmlLength: payload.html.length,
            runId: ctx.run.id,
        });

        try {
            const result = await sendEmail(payload);

            if (result) {
                logger.info('✅ Email sent successfully', {
                    to: payload.to,
                    subject: payload.subject,
                    runId: ctx.run.id,
                });
            } else {
                logger.error('❌ Email send failed', {
                    to: payload.to,
                    subject: payload.subject,
                    runId: ctx.run.id,
                });
            }

            return { success: result };
        } catch (error) {
            logger.error('❌ Email send exception', {
                to: payload.to,
                subject: payload.subject,
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
            });
            throw error;
        }
    },
});

export type EmailTemplateType = keyof typeof emailTemplates;

export const sendTemplatedEmailTask = task({
    id: 'send-templated-email',
    run: async (
        payload: {
            to: string;
            templateType: EmailTemplateType;
            variables: Record<string, string>;
        },
        { ctx },
    ) => {
        logger.info('📧 Sending templated email', {
            to: payload.to,
            template: payload.templateType,
            variables: Object.keys(payload.variables),
            runId: ctx.run.id,
        });

        const template = emailTemplates[payload.templateType];

        if (!template) {
            logger.error('❌ Unknown email template', {
                to: payload.to,
                template: payload.templateType,
                availableTemplates: Object.keys(emailTemplates),
                runId: ctx.run.id,
            });
            throw new Error(`Unknown email template: ${payload.templateType}`);
        }

        logger.debug('Template found, replacing variables', {
            template: payload.templateType,
            variables: payload.variables,
        });

        let html = template.html;
        let subject = template.subject;

        for (const [key, value] of Object.entries(payload.variables)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        logger.info('Sending templated email via SMTP', {
            to: payload.to,
            template: payload.templateType,
            processedSubject: subject,
            htmlLength: html.length,
        });

        try {
            const result = await sendEmail({
                to: payload.to,
                subject,
                html,
            });

            if (result) {
                logger.info('✅ Templated email sent successfully', {
                    to: payload.to,
                    template: payload.templateType,
                    runId: ctx.run.id,
                });
            } else {
                logger.error('❌ Templated email send failed', {
                    to: payload.to,
                    template: payload.templateType,
                    runId: ctx.run.id,
                });
            }

            return { success: result, templateType: payload.templateType };
        } catch (error) {
            logger.error('❌ Templated email exception', {
                to: payload.to,
                template: payload.templateType,
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                runId: ctx.run.id,
            });
            throw error;
        }
    },
});

export const sendBatchEmailsTask = task({
    id: 'send-batch-emails',
    run: async (payload: { emails: SendEmailOptions[]; concurrency?: number }, { ctx }) => {
        logger.info('📧 Starting batch email send', {
            total: payload.emails.length,
            concurrency: payload.concurrency || 5,
            runId: ctx.run.id,
        });

        const concurrency = payload.concurrency || 5;
        const results: { index: number; success: boolean; error?: string }[] = [];

        for (let i = 0; i < payload.emails.length; i += concurrency) {
            const batch = payload.emails.slice(i, i + concurrency);
            logger.debug(`Processing batch ${Math.floor(i / concurrency) + 1}`, {
                batchStart: i,
                batchSize: batch.length,
            });

            const batchResults = await Promise.all(
                batch.map(async (email, batchIndex) => {
                    try {
                        const success = await sendEmail(email);
                        return { index: i + batchIndex, success, error: undefined };
                    } catch (error) {
                        logger.error('Batch email failed', {
                            to: email.to,
                            index: i + batchIndex,
                            error: error instanceof Error ? error.message : String(error),
                        });
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

        if (failed > 0) {
            logger.warn('⚠️ Batch email completed with failures', {
                total: payload.emails.length,
                successful,
                failed,
                failedEmails: results
                    .filter((r) => !r.success)
                    .map((r) => ({
                        index: r.index,
                        error: r.error,
                    })),
                runId: ctx.run.id,
            });
        } else {
            logger.info('✅ Batch email sent successfully', {
                total: payload.emails.length,
                successful,
                failed,
                runId: ctx.run.id,
            });
        }

        return {
            total: payload.emails.length,
            successful,
            failed,
            results,
        };
    },
});
