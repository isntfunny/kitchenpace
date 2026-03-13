'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';

import type { AdminInboxItem } from '@app/lib/admin-inbox';

import { buildStreamCursor } from './useStreamCursor';

const API_PATH = '/api/admin/notifications';

const fetcher = (url: string) =>
    fetch(url, { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
            throw new Error('Failed to load admin notifications');
        }
        return response.json();
    });

type AdminNotificationsResponse = {
    notifications: AdminInboxItem[];
    count: number;
};

function logAdminStream(message: string, details?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'development') {
        return;
    }

    if (details) {
        console.debug(`[SSE admin inbox] ${message}`, details);
        return;
    }

    console.debug(`[SSE admin inbox] ${message}`);
}

export function useAdminNotifications() {
    const { data, error, mutate, isLoading } = useSWR<AdminNotificationsResponse>(
        API_PATH,
        fetcher,
        {
            refreshInterval: 0,
        },
    );

    const hasStartedStreamRef = useRef(false);

    useEffect(() => {
        if (hasStartedStreamRef.current || (!data && !error)) {
            return;
        }

        hasStartedStreamRef.current = true;
        const cursor = buildStreamCursor(data?.notifications ?? []);
        const query = cursor
            ? `?after=${encodeURIComponent(cursor.after)}&afterId=${encodeURIComponent(cursor.afterId)}`
            : '';
        const streamUrl = `/api/admin/notifications/stream${query}`;
        const eventSource = new EventSource(streamUrl);
        logAdminStream('connecting', {
            url: streamUrl,
            initialCount: data?.notifications.length ?? 0,
        });

        const handleCreated = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as AdminInboxItem;
            logAdminStream('created', { id: payload.id });
            mutate((current) => {
                const existing = current?.notifications ?? [];
                if (existing.some((notification) => notification.id === payload.id)) {
                    return current;
                }

                const notifications = [payload, ...existing].slice(0, 50);
                return {
                    notifications,
                    count: notifications.length,
                };
            }, false);
        };

        const handleProcessed = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as { id: string };
            logAdminStream('removed', { id: payload.id });
            mutate((current) => {
                if (!current) {
                    return current;
                }

                const notifications = current.notifications.filter(
                    (notification) => notification.id !== payload.id,
                );
                return {
                    notifications,
                    count: notifications.length,
                };
            }, false);
        };

        const handleOpen = () => {
            logAdminStream('open', { readyState: eventSource.readyState });
        };

        const handleReady = () => {
            logAdminStream('ready');
        };

        const handleError = () => {
            logAdminStream('error', { readyState: eventSource.readyState });
        };

        eventSource.addEventListener('admin-inbox.created', handleCreated);
        eventSource.addEventListener('admin-inbox.removed', handleProcessed);
        eventSource.addEventListener('open', handleOpen);
        eventSource.addEventListener('ready', handleReady);
        eventSource.addEventListener('error', handleError);

        return () => {
            eventSource.removeEventListener('admin-inbox.created', handleCreated);
            eventSource.removeEventListener('admin-inbox.removed', handleProcessed);
            eventSource.removeEventListener('open', handleOpen);
            eventSource.removeEventListener('ready', handleReady);
            eventSource.removeEventListener('error', handleError);
            logAdminStream('closing');
            eventSource.close();
        };
    }, [data, error, mutate]);

    return {
        notifications: data?.notifications ?? [],
        count: data?.count ?? 0,
        isLoading,
        error,
        mutate,
    };
}
