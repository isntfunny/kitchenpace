'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DropdownMenu } from 'radix-ui';

import { css } from 'styled-system/css';

import { NotificationItem } from './NotificationItem';
import { useNotifications } from './useNotifications';
import { resolveNotificationHref } from './utils';

export function NotificationBell() {
    const { data: session, status } = useSession();
    const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
    const visibleNotifications = notifications.slice(0, 19);
    const badgeContent = unreadCount > 9 ? '9+' : unreadCount;

    const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);

    if (!isAuthenticated) {
        return null;
    }

    const handleMarkHovered = (id: string) => {
        const notification = notifications.find((item) => item.id === id);
        if (notification && !notification.read) {
            markAsRead([id]);
        }
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    aria-label="Benachrichtigungen öffnen"
                    className={css({
                        position: 'relative',
                        width: '10',
                        height: '10',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surfaceElevated',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: { background: 'accentSoft' },
                    })}
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span
                            className={css({
                                position: 'absolute',
                                top: '1',
                                right: '1',
                                width: '6',
                                height: '6',
                                borderRadius: 'full',
                                background: 'accent',
                                color: 'white',
                                fontSize: 'xs',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            })}
                        >
                            {badgeContent}
                        </span>
                    )}
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className={css({
                        minWidth: '320px',
                        maxWidth: '90vw',
                        maxHeight: '70vh',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.15)',
                        padding: '4',
                        animation: 'scaleUp 200ms ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3',
                        zIndex: 9999,
                    })}
                    sideOffset={8}
                >
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        })}
                    >
                        <div>
                            <p className={css({ fontWeight: '800', fontSize: 'md' })}>
                                Benachrichtigungen
                            </p>
                            <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                                Die neuesten 19 Einträge
                            </p>
                        </div>
                        <button
                            onClick={() => markAllAsRead()}
                            className={css({
                                border: 'none',
                                background: 'transparent',
                                color: 'primary',
                                fontSize: 'xs',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                            })}
                        >
                            Alle lesen
                        </button>
                    </div>

                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2',
                            overflowY: 'auto',
                            maxHeight: '360px',
                        })}
                    >
                        {isLoading && (
                            <p className={css({ color: 'text-muted', fontSize: 'sm' })}>Lädt…</p>
                        )}
                        {!isLoading && visibleNotifications.length === 0 && (
                            <p className={css({ color: 'text-muted', fontSize: 'sm' })}>
                                Noch keine Benachrichtigungen
                            </p>
                        )}
                        {!isLoading &&
                            visibleNotifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onHover={() => handleMarkHovered(notification.id)}
                                    href={resolveNotificationHref(notification)}
                                />
                            ))}
                    </div>

                    <Link
                        href="/notifications"
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3',
                            borderRadius: '2xl',
                            background: 'accentSoft',
                            color: 'primary',
                            fontWeight: '700',
                            textDecoration: 'none',
                        })}
                    >
                        Alle anzeigen
                    </Link>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
