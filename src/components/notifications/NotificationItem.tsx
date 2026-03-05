'use client';

import Link from 'next/link';

import { css } from 'styled-system/css';

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

const formatRelativeTime = (value: string) => {
    const diffMs = Date.now() - new Date(value).getTime();
    const seconds = Math.round(diffMs / 1000);
    if (seconds < 60) return 'gerade eben';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`; // e.g. '5 min'
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} Tage`;
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(
        new Date(value).getTime(),
    );
};

export function NotificationItem({
    notification,
    href = '/notifications',
    dense = false,
    onHover,
}: NotificationItemProps) {
    const timeLabel = formatRelativeTime(notification.createdAt);

    return (
        <Link
            href={href}
            prefetch={false}
            className={css({
                display: 'block',
                padding: dense ? '3' : '4',
                borderRadius: '2xl',
                background: notification.read ? 'surface' : 'surfaceElevated',
                border: '1px solid',
                borderColor: notification.read ? 'border' : 'accentSoft',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 150ms ease',
                _hover: { background: 'accentSoft' },
            })}
            onPointerEnter={onHover}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '2',
                    mb: '1',
                })}
            >
                <p className={css({ fontWeight: '700', fontSize: dense ? 'sm' : 'base' })}>
                    {notification.title}
                </p>
                <span
                    className={css({ fontSize: 'xs', color: 'text-muted', whiteSpace: 'nowrap' })}
                >
                    {timeLabel}
                </span>
            </div>
            <p
                className={css({
                    fontSize: dense ? 'xs' : 'sm',
                    color: 'text-muted',
                    margin: 0,
                    lineHeight: '1.4',
                })}
            >
                {notification.message}
            </p>
        </Link>
    );
}
