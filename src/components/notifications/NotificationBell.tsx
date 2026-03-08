'use client';

import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';

import { css } from 'styled-system/css';

import { InboxDropdown } from './InboxDropdown';
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
        <InboxDropdown
            trigger={
                <button
                    type="button"
                    aria-label="Benachrichtigungen öffnen"
                    className={css({
                        position: 'relative',
                        width: '10',
                        height: '10',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface.elevated',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: { background: 'accentSoft' },
                    })}
                >
                    <motion.span
                        style={{ display: 'inline-flex' }}
                        whileHover={{ rotate: [0, 12, -8, 5, 0] }}
                        transition={{ duration: 0.5 }}
                    >
                        <Bell size={20} />
                    </motion.span>
                    {unreadCount > 0 && (
                        <motion.span
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
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {badgeContent}
                        </motion.span>
                    )}
                </button>
            }
            title="Benachrichtigungen"
            subtitle="Die neuesten 19 Einträge"
            actionLabel={notifications.length > 0 ? 'Alle lesen' : undefined}
            onAction={notifications.length > 0 ? () => markAllAsRead() : undefined}
            isLoading={isLoading}
            isEmpty={visibleNotifications.length === 0}
            emptyLabel="Noch keine Benachrichtigungen"
            footerHref="/notifications"
            footerLabel="Alle anzeigen"
        >
            {visibleNotifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onHover={() => handleMarkHovered(notification.id)}
                    href={resolveNotificationHref(notification)}
                />
            ))}
        </InboxDropdown>
    );
}
