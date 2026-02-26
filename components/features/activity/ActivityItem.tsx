import Link from 'next/link';

import type { ActivityFeedItem } from '@/app/actions/community';
import { Text } from '@/components/atoms/Typography';
import { css } from 'styled-system/css';

interface ActivityItemProps {
    activity: ActivityFeedItem;
    children: React.ReactNode;
}

export function ActivityItem({ activity, children }: ActivityItemProps) {
    const userLink = activity.userId ? `/user/${activity.userId}` : null;
    const targetUserLink = activity.targetUserId ? `/user/${activity.targetUserId}` : null;

    return (
        <div
            className={css({
                display: 'flex',
                gap: '3',
                p: '3',
                borderRadius: 'xl',
                _hover: { bg: 'rgba(224,123,83,0.05)' },
                transition: 'background 150ms ease',
            })}
        >
            <span
                className={css({
                    fontSize: 'md',
                    display: 'grid',
                    placeItems: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: 'full',
                    background: activity.iconBg,
                    color: 'white',
                    flexShrink: 0,
                })}
            >
                {activity.icon}
            </span>
            <div className={css({ flex: 1 })}>
                <Text size="sm" className={css({ fontWeight: '600', color: 'text' })}>
                    {userLink ? (
                        <Link
                            href={userLink}
                            className={css({ color: 'text', textDecoration: 'none' })}
                        >
                            {activity.userName}
                        </Link>
                    ) : (
                        activity.userName
                    )}{' '}
                    <span className={css({ fontWeight: '400', color: 'text-muted' })}>
                        {activity.actionLabel}
                    </span>
                    {activity.targetUserName && (
                        <>
                            {' '}
                            {targetUserLink ? (
                                <Link
                                    href={targetUserLink}
                                    className={css({
                                        color: 'primary',
                                        fontWeight: '600',
                                        textDecoration: 'none',
                                    })}
                                >
                                    {activity.targetUserName}
                                </Link>
                            ) : (
                                <span className={css({ color: 'primary', fontWeight: '600' })}>
                                    {activity.targetUserName}
                                </span>
                            )}
                            <span
                                className={css({
                                    fontWeight: '400',
                                    color: 'text-muted',
                                })}
                            >
                                {' '}
                                gefolgt
                            </span>
                        </>
                    )}
                </Text>
                {children}
                <Text size="sm" color="muted" className={css({ mt: '1', fontSize: '0.75rem' })}>
                    {activity.timeAgo}
                </Text>
            </div>
        </div>
    );
}

export function ActivityRecipeLink({
    recipeId,
    recipeTitle,
}: {
    recipeId?: string;
    recipeTitle?: string;
}) {
    if (!recipeTitle) return null;

    const linkContent = (
        <Text size="sm" className={css({ color: 'primary', fontWeight: '600' })}>
            {recipeTitle}
        </Text>
    );

    if (recipeId) {
        return (
            <Link href={`/recipe/${recipeId}`} className={css({ textDecoration: 'none' })}>
                {linkContent}
            </Link>
        );
    }

    return linkContent;
}

export function parseActivityDetail(detail?: string): Record<string, unknown> | null {
    if (!detail) return null;
    try {
        return JSON.parse(detail);
    } catch {
        return null;
    }
}
