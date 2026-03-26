'use server';

import { revalidatePath } from 'next/cache';

import { isKnownJob } from '@worker/queues/registry-meta';
import { QueueName } from '@worker/queues/types';

function isQueueName(value: string): value is QueueName {
    return Object.values(QueueName).includes(value as QueueName);
}

export async function triggerJobAction(formData: FormData): Promise<void> {
    const queueValue = formData.get('queue');
    const jobNameValue = formData.get('jobName');
    const payloadValue = formData.get('payload');

    if (typeof queueValue !== 'string' || !isQueueName(queueValue)) {
        throw new Error('Ungültige Queue');
    }

    if (typeof jobNameValue !== 'string' || jobNameValue.length === 0) {
        throw new Error('Jobname fehlt');
    }

    if (!isKnownJob(jobNameValue)) {
        throw new Error(`Unknown job: ${jobNameValue}`);
    }

    const payloadText = typeof payloadValue === 'string' ? payloadValue.trim() : '';
    let payload: Record<string, unknown> = {};

    if (payloadText) {
        try {
            payload = JSON.parse(payloadText);
        } catch {
            throw new Error('Payload ist kein gültiges JSON');
        }
    }

    // Lazy import to avoid pulling backup-processor (fs/child_process) into the bundle
    const { getQueueForName } = await import('@worker/queues/queue');
    const queue = getQueueForName(queueValue);
    await queue.add(jobNameValue, payload);
    console.log(`[Scheduler] Triggered job: ${jobNameValue}`);
    revalidatePath('/admin/worker');
}
