'use client';

import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { NotificationItem } from '@app/components/notifications/NotificationItem';
import { resolveNotificationHref } from '@app/components/notifications/utils';

import { css } from 'styled-system/css';

import { MobileOverlay } from '../ui/MobileOverlay';

type NotificationView = {
    id: string;
    title: string;
    message: string;
    type: string;
    data: Record<string, unknown> | null;
    read: boolean;
    createdAt: string;
};

type MobileNotificationsProps = {
    notifications: NotificationView[];
    unreadCount: number;
    markAsRead: (ids: string[]) => void;
    markAllAsRead: () => void;
};

export function MobileNotifications({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
}: MobileNotificationsProps) {
    const [open, setOpen] = useState(false);

    const badgeContent = unreadCount > 9 ? '9+' : unreadCount;

    return (
        <div
            className={css({
                display: { base: 'flex', md: 'none' },
                alignItems: 'center',
            })}
        >
            {/* Bell trigger button with badge */}
            <button
                type="button"
                aria-label="Benachrichtigungen öffnen"
                onClick={() => setOpen(true)}
                className={css({
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    padding: '0',
                    borderRadius: 'full',
                    border: '1px solid',
                    borderColor: 'border',
                    background: 'surface.elevated',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    _hover: {
                        background: 'transparent',
                        borderColor: 'primary',
                    },
                })}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span
                        className={css({
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            minWidth: '18px',
                            height: '18px',
                            borderRadius: 'full',
                            background: 'status.danger',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: '1',
                            lineHeight: '1',
                            border: '2px solid',
                            borderColor: 'surface.elevated',
                        })}
                    >
                        {badgeContent}
                    </span>
                )}
            </button>

            <MobileOverlay open={open} onClose={() => setOpen(false)}>
                {/* Header */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        px: '3',
                        py: '3',
                        flexShrink: 0,
                    })}
                >
                    <h2
                        className={css({
                            flex: 1,
                            fontSize: 'lg',
                            fontWeight: '700',
                            color: 'text',
                        })}
                    >
                        Benachrichtigungen
                    </h2>

                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={() => markAllAsRead()}
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '600',
                                color: 'primary',
                                cursor: 'pointer',
                                background: 'none',
                                border: 'none',
                                padding: '1',
                                borderRadius: 'md',
                                transition: 'background 150ms ease',
                                _hover: {
                                    background: 'accent.soft',
                                },
                            })}
                        >
                            Alle als gelesen markieren
                        </button>
                    )}

                    <button
                        type="button"
                        aria-label="Schließen"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'lg',
                            cursor: 'pointer',
                            color: 'text.muted',
                            background: 'none',
                            border: 'none',
                            transition: 'all 150ms ease',
                            flexShrink: 0,
                            _hover: {
                                background: 'accent.soft',
                                color: 'text',
                            },
                        })}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable notification list */}
                <div
                    className={css({
                        flex: 1,
                        overflowY: 'auto',
                        padding: '2',
                    })}
                >
                    {notifications.length === 0 ? (
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3',
                                paddingY: '16',
                                color: 'text.muted',
                            })}
                        >
                            <Bell size={32} strokeWidth={1.5} />
                            <p className={css({ fontSize: 'sm' })}>Noch keine Benachrichtigungen</p>
                        </div>
                    ) : (
                        notifications.slice(0, 19).map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onHover={() => {
                                    if (!notification.read) markAsRead([notification.id]);
                                }}
                                href={resolveNotificationHref(notification)}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div
                    className={css({
                        padding: '3',
                        flexShrink: 0,
                    })}
                >
                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            padding: '3',
                            borderRadius: 'lg',
                            border: '1px solid',
                            borderColor: 'border.subtle',
                            background: 'accent.soft',
                            fontSize: 'sm',
                            fontWeight: '600',
                            color: 'primary',
                            textDecoration: 'none',
                            transition: 'all 150ms ease',
                            _hover: {
                                borderColor: 'primary',
                            },
                        })}
                    >
                        Alle anzeigen
                    </Link>
                </div>
            </MobileOverlay>
        </div>
    );
}
