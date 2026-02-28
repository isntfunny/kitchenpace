'use client';

import { css } from 'styled-system/css';

import { NotificationItem } from './NotificationItem';
import { PushSubscriptionToggle } from './PushSubscriptionToggle';
import { useNotifications } from './useNotifications';
import { resolveNotificationHref } from './utils';

export function NotificationsPageContent() {
    const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications({
        refreshInterval: 0,
    });

    const handleHover = (id: string) => {
        const notification = notifications.find((item) => item.id === id);
        if (notification && !notification.read) {
            markAsRead([id]);
        }
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <header
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '4',
                })}
            >
                <div>
                    <p
                        className={css({
                            textTransform: 'uppercase',
                            letterSpacing: 'widest',
                            color: 'text-muted',
                            fontSize: 'xs',
                            marginBottom: '1',
                        })}
                    >
                        Benachrichtigungen
                    </p>
                    <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                        Deine Aktivitäten
                    </h1>
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                    <span className={css({ fontSize: 'sm', color: 'text-muted' })}>
                        {unreadCount} ungelesene Nachricht{unreadCount === 1 ? '' : 'en'}
                    </span>
                    <button
                        onClick={() => markAllAsRead()}
                        className={css({
                            borderRadius: 'full',
                            paddingX: '4',
                            paddingY: '2',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surfaceElevated',
                            fontWeight: '600',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            _hover: { borderColor: 'primary', color: 'primary' },
                        })}
                    >
                        Als gelesen markieren
                    </button>
                </div>
            </header>

            <PushSubscriptionToggle />

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {isLoading && <p className={css({ color: 'text-muted', fontSize: 'sm' })}>Lädt…</p>}
                {!isLoading && notifications.length === 0 && (
                    <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                        Noch keine Benachrichtigungen
                    </p>
                )}
                {!isLoading &&
                    notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            href={resolveNotificationHref(notification)}
                            onHover={() => handleHover(notification.id)}
                        />
                    ))}
            </div>
        </div>
    );
}
