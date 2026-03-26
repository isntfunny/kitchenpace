import { Queue, QueueOptions } from 'bullmq';

import { getRedis } from './connection';
import { QueueName } from './types';

const DEFAULT_JOB_OPTIONS: QueueOptions['defaultJobOptions'] = {
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
};

let opensearchQueue: Queue | null = null;
let scheduledQueue: Queue | null = null;
let backupQueue: Queue | null = null;
let twitchQueue: Queue | null = null;

export function getOpenSearchQueue(): Queue {
    if (!opensearchQueue) {
        opensearchQueue = new Queue(QueueName.OPENSEARCH, {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
            connection: getRedis() as unknown as import('bullmq').ConnectionOptions,
        });
    }
    return opensearchQueue;
}

export function getScheduledQueue(): Queue {
    if (!scheduledQueue) {
        scheduledQueue = new Queue(QueueName.SCHEDULED, {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
            connection: getRedis() as unknown as import('bullmq').ConnectionOptions,
        });
    }
    return scheduledQueue;
}

export function getBackupQueue(): Queue {
    if (!backupQueue) {
        backupQueue = new Queue(QueueName.BACKUP, {
            defaultJobOptions: {
                ...DEFAULT_JOB_OPTIONS,
                removeOnComplete: {
                    count: 50,
                    age: 7 * 24 * 3600,
                },
            },
            connection: getRedis() as unknown as import('bullmq').ConnectionOptions,
        });
    }
    return backupQueue;
}

function getTwitchQueue(): Queue {
    if (!twitchQueue) {
        twitchQueue = new Queue(QueueName.TWITCH, {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
            connection: getRedis() as unknown as import('bullmq').ConnectionOptions,
        });
    }
    return twitchQueue;
}

export function getQueueForName(queueName: QueueName): Queue {
    switch (queueName) {
        case QueueName.OPENSEARCH:
            return getOpenSearchQueue();
        case QueueName.SCHEDULED:
            return getScheduledQueue();
        case QueueName.BACKUP:
            return getBackupQueue();
        case QueueName.TWITCH:
            return getTwitchQueue();
        default:
            throw new Error(`Unknown queue: ${queueName}`);
    }
}

export async function closeAllQueues(): Promise<void> {
    if (opensearchQueue) {
        await opensearchQueue.close();
        opensearchQueue = null;
    }
    if (scheduledQueue) {
        await scheduledQueue.close();
        scheduledQueue = null;
    }
    if (backupQueue) {
        await backupQueue.close();
        backupQueue = null;
    }
    if (twitchQueue) {
        await twitchQueue.close();
        twitchQueue = null;
    }
}
