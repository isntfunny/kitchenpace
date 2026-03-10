'use client';

import { InboxItemCard } from './InboxItemCard';

type NotificationView = {
    id: string;
    title: string;
    message: string;
    type: string;
    data: Record<string, unknown> | null;
    read: boolean;
    createdAt: string;
};

type NotificationItemProps = {
    notification: NotificationView;
    href?: string;
    dense?: boolean;
    onHover?: () => void;
};

export function NotificationItem({
    notification,
    href = '/notifications',
    dense = false,
    onHover,
}: NotificationItemProps) {
    return (
        <InboxItemCard
            href={href}
            title={notification.title}
            message={notification.message}
            createdAt={notification.createdAt}
            dense={dense}
            emphasized={!notification.read}
            notificationType={notification.type}
            onHover={onHover}
        />
    );
}
