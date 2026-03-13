import type { PublishedToast, ToastInput } from '@app/types/toast';
import { TOAST_STREAM_EVENT } from '@app/types/toast';

import { publishRealtimeEvent } from './broker';

type PublishToastInput = Omit<ToastInput, 'action'> & {
    action?: {
        label: string;
        href?: string;
    };
};

export async function publishToast(userId: string, toast: PublishToastInput) {
    const payload: PublishedToast = {
        id: crypto.randomUUID(),
        type: toast.type,
        title: toast.title,
        message: toast.message,
        duration: toast.duration,
        action: toast.action,
        createdAt: new Date().toISOString(),
    };

    await publishRealtimeEvent(`notifications:user:${userId}`, {
        id: payload.id,
        createdAt: payload.createdAt,
        type: TOAST_STREAM_EVENT,
        payload,
    });
}
