'use client';

import { useEffect } from 'react';
import useSWR from 'swr';

import type { NotificationView } from '@app/lib/events/views';
import { connectStream, disconnectStream, onStreamEvent } from '@app/lib/realtime/clientStream';

const API_PATH = '/api/notifications';
const STREAM_URL = '/api/notifications/stream';

const fetcher = (url: string) =>
    fetch(url, { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }
        return response.json();
    });

type NotificationsResponse = {
    notifications: NotificationView[];
    unreadCount: number;
};

export function useNotifications(options?: { refreshInterval?: number; enabled?: boolean }) {
    const enabled = options?.enabled ?? true;

    const { data, error, mutate, isLoading } = useSWR<NotificationsResponse>(
        enabled ? API_PATH : null,
        fetcher,
        { refreshInterval: options?.refreshInterval ?? 60_000 },
    );

    useEffect(() => {
        if (!enabled) return;
        connectStream(STREAM_URL);

        const off = onStreamEvent('notification.created', (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as NotificationView;
            mutate((current) => {
                const existing = current?.notifications ?? [];
                if (existing.some((notification) => notification.id === payload.id)) {
                    return current;
                }

                const notifications = [payload, ...existing].slice(0, 50);
                return {
                    notifications,
                    unreadCount: notifications.filter((notification) => !notification.read).length,
                };
            }, false);
        });

        return () => {
            off();
            disconnectStream();
        };
    }, [enabled, mutate]);

    useEffect(() => {
        connectStream(STREAM_URL);

        const off = onStreamEvent('notification.created', (event: MessageEvent<string>) => {
            const payload = JSON.parse(event.data) as NotificationView;
            mutate((current) => {
                const existing = current?.notifications ?? [];
                if (existing.some((notification) => notification.id === payload.id)) {
                    return current;
                }

                const notifications = [payload, ...existing].slice(0, 50);
                return {
                    notifications,
                    unreadCount: notifications.filter((notification) => !notification.read).length,
                };
            }, false);
        });

        return () => {
            off();
            disconnectStream();
        };
    }, [mutate]);

    const markAsRead = async (ids: string[], markRead = true) => {
        if (ids.length === 0) {
            return;
        }

        await fetch(API_PATH, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, markRead }),
        });

        mutate((current) => {
            if (!current) {
                return current;
            }

            const notifications = current.notifications.map((notification) =>
                ids.includes(notification.id) ? { ...notification, read: markRead } : notification,
            );

            return {
                notifications,
                unreadCount: notifications.filter((notification) => !notification.read).length,
            };
        }, false);
    };

    const markAllAsRead = async () => {
        const unreadIds =
            data?.notifications
                .filter((notification) => !notification.read)
                .map((notification) => notification.id) ?? [];
        await markAsRead(unreadIds);
    };

    return {
        notifications: data?.notifications ?? [],
        unreadCount: data?.unreadCount ?? 0,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        mutate,
    };
}
