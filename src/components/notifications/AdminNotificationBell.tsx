'use client';

import { ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

import type { AdminInboxItem } from '@app/lib/admin-inbox';
import { css } from 'styled-system/css';

import { InboxDropdown } from './InboxDropdown';
import { InboxItemCard } from './InboxItemCard';
import { useAdminNotifications } from './useAdminNotifications';

function resolveAdminNotificationHref(notification: Pick<AdminInboxItem, 'href'>) {
    return notification.href;
}

function extractMedia(notification: Pick<AdminInboxItem, 'data'>) {
    return {
        actor: notification.data.actor ?? null,
        recipe: notification.data.recipe ?? null,
        cookImage: notification.data.cookImage ?? null,
        score: notification.data.score ?? null,
        topRatedCategory: notification.data.recipe?.topRatedCategory ?? null,
    };
}

export function AdminNotificationBell() {
    const { notifications, count, isLoading } = useAdminNotifications();
    const badgeContent = count > 9 ? '9+' : count;

    return (
        <InboxDropdown
            trigger={
                <button
                    type="button"
                    aria-label="Admin-Postfach öffnen"
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
                        whileHover={{ rotate: [0, 8, -5, 0] }}
                        transition={{ duration: 0.4 }}
                    >
                        <ShieldAlert size={18} />
                    </motion.span>
                    {count > 0 && (
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
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {badgeContent}
                        </motion.span>
                    )}
                </button>
            }
            title="Admin-Postfach"
            subtitle="Moderation und Meldungen mit offenem Handlungsbedarf"
            isLoading={isLoading}
            isEmpty={notifications.length === 0}
            emptyLabel="Keine offenen Admin-Hinweise"
        >
            {notifications.map((notification) => (
                <InboxItemCard
                    key={notification.id}
                    href={resolveAdminNotificationHref(notification)}
                    title={notification.title}
                    message={notification.message}
                    createdAt={notification.createdAt}
                    emphasized
                    media={extractMedia(notification)}
                />
            ))}
        </InboxDropdown>
    );
}
