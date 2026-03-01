import { Queue, QueueOptions } from 'bullmq';

import { getRedis } from './connection';
import { QueueName } from './types';

const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
    defaultJobOptions: {
        removeOnComplete: {
            count: 200,
            age: 24 * 3600,
        },
        removeOnFail: {
            count: 500,
        },
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
};

let emailQueue: Queue | null = null;
let opensearchQueue: Queue | null = null;
let scheduledQueue: Queue | null = null;

export function getEmailQueue(): Queue {
    if (!emailQueue) {
        emailQueue = new Queue(QueueName.EMAIL, {
            ...DEFAULT_QUEUE_OPTIONS,
            connection: getRedis() as any,
        });
    }
    return emailQueue;
}

export function getOpenSearchQueue(): Queue {
    if (!opensearchQueue) {
        opensearchQueue = new Queue(QueueName.OPENSEARCH, {
            ...DEFAULT_QUEUE_OPTIONS,
            connection: getRedis() as any,
        });
    }
    return opensearchQueue;
}

export function getScheduledQueue(): Queue {
    if (!scheduledQueue) {
        scheduledQueue = new Queue(QueueName.SCHEDULED, {
            ...DEFAULT_QUEUE_OPTIONS,
            connection: getRedis() as any,
        });
    }
    return scheduledQueue;
}

export async function closeAllQueues(): Promise<void> {
    if (emailQueue) {
        await emailQueue.close();
        emailQueue = null;
    }
    if (opensearchQueue) {
        await opensearchQueue.close();
        opensearchQueue = null;
    }
    if (scheduledQueue) {
        await scheduledQueue.close();
        scheduledQueue = null;
    }
}
