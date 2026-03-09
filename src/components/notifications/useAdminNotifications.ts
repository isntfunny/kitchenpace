'use client';

import { useEffect } from 'react';
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

export function useAdminNotifications() {
    const { data, error, mutate, isLoading } = useSWR<AdminNotificationsResponse>(
        API_PATH,
        fetcher,
        {
            refreshInterval: 0,
        },
    );

    useEffect(() => {
        const cursor = buildStreamCursor(data?.notifications ?? []);
        const query = cursor
            ? `?after=${encodeURIComponent(cursor.after)}&afterId=${encodeURIComponent(cursor.afterId)}`
            : '';
        const eventSource = new EventSource(`/api/admin/notifications/stream${query}`);

        const handleCreated = (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as AdminInboxItem;
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

        eventSource.addEventListener('admin-inbox.created', handleCreated);
        eventSource.addEventListener('admin-inbox.removed', handleProcessed);

        return () => {
            eventSource.removeEventListener('admin-inbox.created', handleCreated);
            eventSource.removeEventListener('admin-inbox.removed', handleProcessed);
            eventSource.close();
        };
    }, [data?.notifications, mutate]);

    return {
        notifications: data?.notifications ?? [],
        count: data?.count ?? 0,
        isLoading,
        error,
        mutate,
    };
}
