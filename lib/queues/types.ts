export enum QueueName {
    EMAIL = 'email',
    OPENSEARCH = 'opensearch',
    SCHEDULED = 'scheduled',
}

export enum JobPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 4,
}

export interface SendEmailJob {
    to: string;
    subject: string;
    html: string;
}

export interface SendTemplatedEmailJob {
    to: string;
    templateType: string;
    variables: Record<string, string>;
}

export interface SendBatchEmailsJob {
    emails: SendEmailJob[];
    concurrency?: number;
}

export interface SyncOpenSearchJob {
    batchSize?: number;
}

export interface SyncRecipeToOpenSearchJob {
    recipeId: string;
}

export interface DailyRecipeJob {
    recipientEmail?: string;
}

export interface WeeklyNewsletterJob {
    dryRun?: boolean;
}

export interface DailyDigestJob {
    dryRun?: boolean;
}

export type EmailJob =
    | { name: 'send-email'; data: SendEmailJob }
    | { name: 'send-templated-email'; data: SendTemplatedEmailJob }
    | { name: 'send-batch-emails'; data: SendBatchEmailsJob };

export type OpenSearchJob =
    | { name: 'sync-opensearch'; data: SyncOpenSearchJob }
    | { name: 'sync-recipe'; data: SyncRecipeToOpenSearchJob };

export type ScheduledJob =
    | { name: 'daily-recipe'; data: DailyRecipeJob }
    | { name: 'weekly-newsletter'; data: WeeklyNewsletterJob }
    | { name: 'daily-digest'; data: DailyDigestJob }
    | { name: 'opensearch-sync'; data: SyncOpenSearchJob };

export type AllJob = EmailJob | OpenSearchJob | ScheduledJob;
