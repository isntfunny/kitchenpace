import type { JobStatus } from './job-run';

export const STATUS_ORDER: JobStatus[] = ['COMPLETED', 'PROCESSING', 'PENDING', 'FAILED'];

export const JOB_STATUS_DETAILS: Record<
    JobStatus,
    { label: string; color: string; accent: string }
> = {
    COMPLETED: {
        label: 'Abgeschlossen',
        color: '#22c55e',
        accent: 'rgba(34, 197, 94, 0.15)',
    },
    PROCESSING: {
        label: 'In Bearbeitung',
        color: '#f59e0b',
        accent: 'rgba(245, 158, 11, 0.15)',
    },
    PENDING: {
        label: 'Wartend',
        color: '#3b82f6',
        accent: 'rgba(59, 130, 246, 0.15)',
    },
    FAILED: {
        label: 'Fehlgeschlagen',
        color: '#ef4444',
        accent: 'rgba(239, 68, 68, 0.15)',
    },
};

export function getStatusColor(status: JobStatus) {
    return JOB_STATUS_DETAILS[status]?.color ?? '#9ca3af';
}

const QUEUE_LABELS: Record<string, string> = {
    email: 'E-Mail',
    opensearch: 'OpenSearch',
    scheduled: 'Geplant',
};

export function getQueueLabel(queue: string) {
    return QUEUE_LABELS[queue] ?? queue;
}
