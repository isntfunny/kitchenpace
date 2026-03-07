import {
    Activity as ActivityIcon,
    Bookmark,
    BookmarkX,
    Calendar,
    Edit3,
    Flame,
    Handshake,
    MessageSquare,
    ShoppingCart,
    Star,
    UserCheck,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import type { ActivityFeedItem, ActivityIconName } from '@app/app/actions/community';
import { Text } from '@app/components/atoms/Typography';
import { css } from 'styled-system/css';

interface ActivityItemProps {
    activity: ActivityFeedItem;
    children?: React.ReactNode;
}

const ACTIVITY_ICON_MAP: Record<ActivityIconName, LucideIcon> = {
    edit3: Edit3,
    flame: Flame,
    star: Star,
    'message-square': MessageSquare,
    bookmark: Bookmark,
    'bookmark-x': BookmarkX,
    handshake: Handshake,
    'shopping-cart': ShoppingCart,
    calendar: Calendar,
    'user-plus': UserPlus,
    'user-check': UserCheck,
};

const linkCss = css({ color: 'primary', fontWeight: '600', textDecoration: 'none' });
const mutedCss = css({ fontWeight: '400', color: 'text-muted' });

/** Renders a template string, replacing {recipe} and {target} with linked elements */
function renderTemplate(activity: ActivityFeedItem) {
    const parts = activity.template.split(/(\{recipe\}|\{target\})/);

    return parts.map((part, i) => {
        if (part === '{recipe}' && activity.recipeTitle) {
            const href = `/recipe/${activity.recipeSlug ?? activity.recipeId}`;
            return activity.recipeSlug || activity.recipeId ? (
                <Link key={i} href={href} className={linkCss}>
                    {activity.recipeTitle}
                </Link>
            ) : (
                <span key={i} className={linkCss}>{activity.recipeTitle}</span>
            );
        }

        if (part === '{target}' && activity.targetUserName) {
            const href = activity.targetUserSlug ? `/user/${activity.targetUserSlug}` : null;
            return href ? (
                <Link key={i} href={href} className={linkCss}>
                    {activity.targetUserName}
                </Link>
            ) : (
                <span key={i} className={linkCss}>{activity.targetUserName}</span>
            );
        }

        // Skip unfilled placeholders (no recipe title or no target name)
        if (part === '{recipe}' || part === '{target}') return null;

        return <span key={i} className={mutedCss}>{part}</span>;
    });
}

export function ActivityItem({ activity, children }: ActivityItemProps) {
    const userLink = activity.userSlug ? `/user/${activity.userSlug}` : null;
    const IconComponent = ACTIVITY_ICON_MAP[activity.icon] ?? ActivityIcon;

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
                <IconComponent size={18} />
            </span>
            <div className={css({ flex: 1 })}>
                <Text size="sm" className={css({ fontWeight: '600', color: 'text', lineHeight: '1.5' })}>
                    {userLink ? (
                        <Link href={userLink} className={css({ color: 'text', textDecoration: 'none' })}>
                            {activity.userName}
                        </Link>
                    ) : (
                        activity.userName
                    )}{' '}
                    {renderTemplate(activity)}
                </Text>
                {children}
                <Text size="sm" color="muted" className={css({ mt: '1', fontSize: '0.75rem' })}>
                    {activity.timeAgo}
                </Text>
            </div>
        </div>
    );
}

export function parseActivityDetail(detail?: string): Record<string, unknown> | null {
    if (!detail) return null;
    try {
        return JSON.parse(detail);
    } catch {
        return null;
    }
}
