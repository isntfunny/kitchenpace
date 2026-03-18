'use client';

import { Inbox } from 'lucide-react';

import { Heading, Text } from '@app/components/atoms/Typography';
import { NotificationItem } from '@app/components/notifications/NotificationItem';
import { PushSubscriptionToggle } from '@app/components/notifications/PushSubscriptionToggle';
import { useNotifications } from '@app/components/notifications/useNotifications';
import { resolveNotificationHref } from '@app/components/notifications/utils';

import { css } from 'styled-system/css';

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
                    borderRadius: 'surface',
                    boxShadow: 'shadow.medium',
                    overflow: 'hidden',
                })}
            >
                {/* Header inside card */}
                <div
                    className={css({
                        px: { base: '4', md: '5' },
                        pt: { base: '4', md: '5' },
                        pb: '4',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDir: { base: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            alignItems: { base: 'flex-start', sm: 'center' },
                            gap: '3',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                            })}
                        >
                            <div
                                className={css({
                                    w: '10',
                                    h: '10',
                                    borderRadius: 'lg',
                                    bg: 'accent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                })}
                            >
                                <Inbox size={20} />
                            </div>
                            <div>
                                <Heading as="h2" size="lg">
                                    Deine Aktivitäten
                                </Heading>
                                <Text color="muted" size="sm">
                                    {unreadCount} ungelesen
                                </Text>
                            </div>
                        </div>
                        <button
                            onClick={() => markAllAsRead()}
                            className={css({
                                borderRadius: 'lg',
                                px: '4',
                                py: '2',
                                border: '1px solid',
                                borderColor: 'border',
                                background: 'transparent',
                                fontFamily: 'body',
                                fontWeight: '500',
                                fontSize: 'sm',
                                color: 'text',
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                                _hover: {
                                    borderColor: 'primary',
                                    color: 'primary',
                                    bg: 'accent.soft',
                                },
                            })}
                        >
                            Alle als gelesen markieren
                        </button>
                    </div>
                </div>

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
