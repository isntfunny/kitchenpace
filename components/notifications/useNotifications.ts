'use client';

import useSWR from 'swr';

const API_PATH = '/api/notifications';

const fetcher = (url: string) =>
    fetch(url, { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }
        return response.json();
    });

type NotificationsResponse = {
    notifications: Array<{
        id: string;
        title: string;
        message: string;
        type: string;
        data: Record<string, unknown> | null;
        read: boolean;
        createdAt: string;
    }>;
    unreadCount: number;
};

export function useNotifications(options?: { refreshInterval?: number }) {
    const { data, error, mutate, isLoading } = useSWR<NotificationsResponse>(API_PATH, fetcher, {
        refreshInterval: options?.refreshInterval ?? 12_000,
    });

    const markAsRead = async (ids: string[], markRead = true) => {
        if (ids.length === 0) {
            return;
        }

        await fetch(API_PATH, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, markRead }),
        });

        mutate();
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
