'use server';

import { revalidatePath } from 'next/cache';

import { triggerJobNow } from '@/lib/queues/scheduler';
import { QueueName } from '@/lib/queues/types';

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

    const payloadText = typeof payloadValue === 'string' ? payloadValue.trim() : '';
    let payload: Record<string, unknown> = {};

    if (payloadText) {
        try {
            payload = JSON.parse(payloadText);
        } catch {
            throw new Error('Payload ist kein gültiges JSON');
        }
    }

    await triggerJobNow(queueValue, jobNameValue, payload);
    revalidatePath('/admin/worker');
}
