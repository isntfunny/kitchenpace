import { motion } from 'motion/react';
import Link from 'next/link';

import { SmartImage } from '@app/components/atoms/SmartImage';
import type { ActivityFeedItem } from '@app/lib/activity-utils';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface CommunityPulseProps {
    activities: ActivityFeedItem[];
}

function UserAvatar({ item }: { item: ActivityFeedItem }) {
    const initial = item.userName?.charAt(0)?.toUpperCase() ?? '?';

    if (item.userPhotoKey) {
        return (
            <div
                className={css({
                    width: '36px',
                    height: '36px',
                    borderRadius: 'full',
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                })}
            >
                <SmartImage
                    imageKey={item.userPhotoKey}
                    userId={item.userId}
                    alt={item.userName}
                    aspect="1:1"
                    sizes="36px"
                    fill
                    className={css({ objectFit: 'cover', width: '100%', height: '100%' })}
                />
            </div>
        );
    }

    return (
        <div
            className={css({
                width: '36px',
                height: '36px',
                borderRadius: 'full',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '700',
            })}
            style={{ backgroundColor: item.iconBg }}
        >
            {initial}
        </div>
    );
}

function resolveTemplate(item: ActivityFeedItem): React.ReactNode {
    const template = item.template ?? '';
    const parts = template.split('{recipe}');

    if (parts.length === 1 || !item.recipeTitle) {
        // No recipe placeholder — render as plain text
        return (
            <>
                <span
                    className={css({
                        fontWeight: '600',
                        color: 'text',
                    })}
                >
                    {item.userName}
                </span>{' '}
                {template}
            </>
        );
    }

    const [before, after] = parts;

    return (
        <>
            <span className={css({ fontWeight: '600', color: 'text' })}>{item.userName}</span>{' '}
            {before}
            {item.recipeSlug ? (
                <Link
                    href={`/recipe/${item.recipeSlug}`}
                    className={css({
                        fontWeight: '600',
                        color: 'text',
                        textDecoration: 'underline',
                        textDecorationColor: 'transparent',
                        transition: 'text-decoration-color 150ms',
                        _hover: { textDecorationColor: 'currentColor' },
                    })}
                >
                    {item.recipeTitle}
                </Link>
            ) : (
                <span className={css({ fontWeight: '600', color: 'text' })}>
                    {item.recipeTitle}
                </span>
            )}
            {after}
        </>
    );
}

export function CommunityPulse({ activities }: CommunityPulseProps) {
    if (activities.length < 3) return null;

    const displayed = activities.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', sm: 'repeat(3, 1fr)' },
                gap: '3',
            })}
        >
            {displayed.map((item, i) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.32 }}
                    className={css({
                        bg: 'surface.card',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'xl',
                        p: '3',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                    })}
                >
                    <div className={flex({ align: 'flex-start', gap: '2.5' })}>
                        {/* Avatar — optionally linked to user */}
                        {item.userSlug ? (
                            <Link href={`/user/${item.userSlug}`}>
                                <UserAvatar item={item} />
                            </Link>
                        ) : (
                            <UserAvatar item={item} />
                        )}

                        <div className={css({ flex: 1, minW: 0 })}>
                            <p
                                className={css({
                                    fontSize: '0.78rem',
                                    color: 'text-muted',
                                    lineHeight: '1.45',
                                    display: '-webkit-box',
                                    lineClamp: '3',
                                    overflow: 'hidden',
                                })}
                            >
                                {resolveTemplate(item)}
                            </p>
                        </div>
                    </div>

                    <div
                        className={css({
                            fontSize: '0.65rem',
                            color: 'text-muted',
                            mt: 'auto',
                        })}
                    >
                        {item.timeAgo}
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
}
