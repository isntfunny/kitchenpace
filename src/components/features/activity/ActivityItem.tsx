import type { TrophyTier } from '@prisma/client';
import {
    Activity as ActivityIcon,
    Bookmark,
    Calendar,
    Camera,
    Edit3,
    Flame,
    Handshake,
    Library,
    MessageSquare,
    ShoppingCart,
    Star,
    Tv,
    UserCheck,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import type { ActivityFeedItem, ActivityIconName } from '@app/app/actions/community';
import { Avatar } from '@app/components/atoms/Avatar';
import { Text } from '@app/components/atoms/Typography';

import { css } from 'styled-system/css';

const ACTIVITY_ICON_MAP: Record<ActivityIconName, LucideIcon> = {
    edit3: Edit3,
    flame: Flame,
    star: Star,
    'message-square': MessageSquare,
    bookmark: Bookmark,
    handshake: Handshake,
    'shopping-cart': ShoppingCart,
    calendar: Calendar,
    'user-plus': UserPlus,
    'user-check': UserCheck,
    tv: Tv,
    library: Library,
};

const linkCss = css({ color: 'primary', fontWeight: '600', textDecoration: 'none' });
const mutedCss = css({ fontWeight: '400', color: 'text-muted' });

function parseDetail(detail?: string): Record<string, unknown> | null {
    if (!detail) return null;
    try {
        return JSON.parse(detail);
    } catch {
        return null;
    }
}

/** Renders a template string, replacing {recipe}, {collection} and {target} with linked elements */
function renderTemplate(activity: ActivityFeedItem) {
    const parts = activity.template.split(/(\{recipe\}|\{collection\}|\{target\})/);

    return parts.map((part, i) => {
        if (part === '{collection}' && activity.collectionTitle) {
            const href = `/collection/${activity.collectionSlug ?? activity.collectionId}`;
            return activity.collectionSlug || activity.collectionId ? (
                <Link key={i} href={href} className={linkCss}>
                    {activity.collectionTitle}
                </Link>
            ) : (
                <span key={i} className={linkCss}>
                    {activity.collectionTitle}
                </span>
            );
        }

        if (part === '{collection}') return null;

        if (part === '{recipe}' && activity.recipeTitle) {
            const href = `/recipe/${activity.recipeSlug ?? activity.recipeId}`;
            return activity.recipeSlug || activity.recipeId ? (
                <Link key={i} href={href} className={linkCss}>
                    {activity.recipeTitle}
                </Link>
            ) : (
                <span key={i} className={linkCss}>
                    {activity.recipeTitle}
                </span>
            );
        }

        if (part === '{target}' && activity.targetUserName) {
            const href = activity.targetUserSlug ? `/user/${activity.targetUserSlug}` : null;
            return href ? (
                <Link key={i} href={href} className={linkCss}>
                    {activity.targetUserName}
                </Link>
            ) : (
                <span key={i} className={linkCss}>
                    {activity.targetUserName}
                </span>
            );
        }

        if (part === '{recipe}' || part === '{target}') return null;

        return (
            <span key={i} className={mutedCss}>
                {part}
            </span>
        );
    });
}

/** Extra detail content for specific activity types */
function ActivityDetailExtras({ activity }: { activity: ActivityFeedItem }) {
    const metadata = parseDetail(activity.detail);
    if (!metadata) return null;

    if (activity.type === 'RECIPE_RATED') {
        const rating = metadata.rating as number | undefined;
        if (!rating) return null;
        return (
            <div className={css({ mt: '1', display: 'flex', alignItems: 'center', gap: '2' })}>
                <span className={css({ display: 'inline-flex', gap: '0.5' })}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            size={14}
                            fill={star <= rating ? '#f8b500' : 'none'}
                            color={star <= rating ? '#f8b500' : undefined}
                            className={
                                star <= rating
                                    ? undefined
                                    : css({ color: { base: '#e0e0e0', _dark: '#4a4a4a' } })
                            }
                        />
                    ))}
                </span>
                <Text size="sm" color="muted" className={css({ fontSize: '0.75rem' })}>
                    {rating}/5
                </Text>
            </div>
        );
    }

    if (activity.type === 'RECIPE_COOKED' && metadata.hasImage) {
        return (
            <Text
                size="sm"
                color="muted"
                className={css({
                    mt: '1',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                })}
            >
                <Camera size={14} />
                <span>Mit Bild</span>
            </Text>
        );
    }

    if (activity.type === 'RECIPE_COMMENTED') {
        const comment = metadata.comment as string | undefined;
        if (!comment) return null;
        return (
            <Text
                size="sm"
                color="muted"
                className={css({ mt: '1', fontSize: '0.75rem', fontStyle: 'italic' })}
            >
                &ldquo;{comment.length > 100 ? comment.slice(0, 100) + '…' : comment}&rdquo;
            </Text>
        );
    }

    return null;
}

export function ActivityItem({ activity }: { activity: ActivityFeedItem }) {
    const userLink = activity.userSlug ? `/user/${activity.userSlug}` : null;
    const IconComponent = ACTIVITY_ICON_MAP[activity.icon] ?? ActivityIcon;

    return (
        <div
            className={css({
                display: 'flex',
                gap: '3',
                p: '3',
                borderRadius: 'xl',
                _hover: { bg: 'accent.soft' },
                transition: 'background 150ms ease',
            })}
        >
            {activity.userPhotoKey ? (
                <Avatar
                    imageKey={activity.userPhotoKey}
                    userId={activity.userId}
                    name={activity.userName}
                    size={40}
                    trophyTier={(activity.userTrophyTier as TrophyTier) ?? null}
                    trophyCount={activity.userTrophyTier ? 1 : 0}
                />
            ) : (
                <span
                    className={css({
                        display: 'grid',
                        placeItems: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: 'full',
                        flexShrink: 0,
                    })}
                    style={{ background: activity.iconBg }}
                >
                    <IconComponent size={18} color="white" />
                </span>
            )}
            <div className={css({ flex: 1 })}>
                <Text
                    size="sm"
                    className={css({ fontWeight: '600', color: 'text', lineHeight: '1.5' })}
                >
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
                    {renderTemplate(activity)}
                </Text>
                <ActivityDetailExtras activity={activity} />
                <Text size="sm" color="muted" className={css({ mt: '1', fontSize: '0.75rem' })}>
                    {activity.timeAgo}
                </Text>
            </div>
        </div>
    );
}
