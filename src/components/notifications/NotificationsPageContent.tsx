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
            <PushSubscriptionToggle />

            {/* Notifications card */}
            <div
                className={css({
                    bg: 'surface',
                    borderRadius: '2xl',
                    boxShadow: 'shadow.medium',
                    overflow: 'hidden',
                })}
            >
                {/* Header inside card */}
                <header
                    className={css({
                        display: 'flex',
                        flexDirection: { base: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { base: 'flex-start', sm: 'center' },
                        gap: { base: '3', sm: '4' },
                        px: { base: '4', md: '5' },
                        pt: { base: '4', md: '5' },
                        pb: '3',
                        borderBottom: '1px solid',
                        borderColor: 'border',
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
                        <h2
                            className={css({
                                fontSize: { base: 'lg', sm: 'xl' },
                                fontWeight: '700',
                                margin: 0,
                            })}
                        >
                            Deine Aktivitäten
                        </h2>
                    </div>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            flexWrap: 'wrap',
                        })}
                    >
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
                                background: 'surface.elevated',
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

                {/* Notification items */}
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        py: '2',
                    })}
                >
                    {isLoading && (
                        <p
                            className={css({
                                color: 'text-muted',
                                fontSize: 'sm',
                                px: { base: '4', md: '5' },
                                py: '4',
                            })}
                        >
                            Lädt…
                        </p>
                    )}
                    {!isLoading && notifications.length === 0 && (
                        <p
                            className={css({
                                color: 'text-muted',
                                fontSize: 'sm',
                                px: { base: '4', md: '5' },
                                py: '6',
                                textAlign: 'center',
                            })}
                        >
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
        </div>
    );
}
