'use client';

import {
    BookOpen,
    Calendar,
    ChefHat,
    Flame,
    Heart,
    MessageSquare,
    Star,
    UserPlus,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { SmartImage } from '@app/components/atoms/SmartImage';
import { formatTimeAgo } from '@app/lib/activity-utils';
import { css } from 'styled-system/css';

// ─── Notification type → icon + color mapping ─────────────────────────────

const NOTIFICATION_STYLES: Record<string, { icon: LucideIcon; bg: string }> = {
    RECIPE_PUBLISHED: { icon: ChefHat, bg: '#00b894' },
    RECIPE_COMMENT: { icon: MessageSquare, bg: '#6c5ce7' },
    RECIPE_LIKE: { icon: Heart, bg: '#fd79a8' },
    RECIPE_RATING: { icon: Star, bg: '#f8b500' },
    RECIPE_COOKED: { icon: Flame, bg: '#e07b53' },
    NEW_FOLLOWER: { icon: UserPlus, bg: '#0984e3' },
    WEEKLY_PLAN_REMINDER: { icon: Calendar, bg: '#00b894' },
    SYSTEM: { icon: Zap, bg: '#636e72' },
};

const DEFAULT_STYLE = { icon: BookOpen, bg: '#b2bec3' };

// ─── Types ────────────────────────────────────────────────────────────────

type MediaContext = {
    actor?: {
        name?: string | null;
        avatar?: string | null;
    } | null;
    recipe?: {
        image?: string | null;
        title?: string | null;
    } | null;
    cookImage?: {
        image?: string | null;
    } | null;
    score?: number | null;
    topRatedCategory?: string | null;
};

type InboxItemCardProps = {
    title: string;
    message: string;
    createdAt: string;
    href?: string;
    dense?: boolean;
    emphasized?: boolean;
    notificationType?: string;
    onHover?: () => void;
    actionLabel?: string;
    onAction?: () => void;
    media?: MediaContext;
};

// ─── Media strip ──────────────────────────────────────────────────────────

function MediaStrip({ media }: { media?: MediaContext }) {
    if (!media) {
        return null;
    }

    const images = [
        media.actor?.avatar
            ? { src: media.actor.avatar, alt: media.actor.name ?? 'Nutzerbild' }
            : null,
        media.recipe?.image
            ? { src: media.recipe.image, alt: media.recipe.title ?? 'Rezeptbild' }
            : null,
        media.cookImage?.image ? { src: media.cookImage.image, alt: 'Zubereitungsbild' } : null,
    ].filter(Boolean) as Array<{ src: string; alt: string }>;

    if (images.length === 0 && !media.score && !media.topRatedCategory) {
        return null;
    }

    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1.5',
                flexWrap: 'wrap',
                marginTop: '1.5',
            })}
        >
            {images.map((image, index) => (
                <SmartImage
                    key={`${image.src}-${index}`}
                    src={image.src}
                    alt={image.alt}
                    width={24}
                    height={24}
                    className={css({
                        width: '6',
                        height: '6',
                        borderRadius: 'md',
                        border: '1px solid',
                        borderColor: 'border',
                    })}
                />
            ))}
            {typeof media.score === 'number' && (
                <span
                    className={css({
                        fontSize: '2xs',
                        color: 'text-muted',
                        background: 'surface',
                        borderRadius: 'full',
                        paddingX: '1.5',
                        paddingY: '0.5',
                    })}
                >
                    Score {media.score.toFixed(2)}
                </span>
            )}
            {media.topRatedCategory && (
                <span
                    className={css({
                        fontSize: '2xs',
                        color: 'primary',
                        background: 'accent.soft',
                        borderRadius: 'full',
                        paddingX: '1.5',
                        paddingY: '0.5',
                    })}
                >
                    {media.topRatedCategory}
                </span>
            )}
        </div>
    );
}

// ─── InboxItemCard ────────────────────────────────────────────────────────

export function InboxItemCard({
    title,
    message,
    createdAt,
    href = '#',
    dense = false,
    emphasized = false,
    notificationType,
    onHover,
    actionLabel,
    onAction,
    media,
}: InboxItemCardProps) {
    const timeLabel = formatTimeAgo(createdAt, { fallbackToDate: true });
    const style = (notificationType && NOTIFICATION_STYLES[notificationType]) || DEFAULT_STYLE;
    const Icon = style.icon;
    const iconBg = style.bg;

    return (
        <div
            className={css({
                display: 'flex',
                gap: '2',
                alignItems: 'stretch',
            })}
        >
            <Link
                href={href}
                prefetch={false}
                className={css({
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '2.5',
                    px: '3',
                    py: dense ? '2.5' : '3',
                    mx: '1.5',
                    borderRadius: 'xl',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 150ms ease',
                    position: 'relative',
                    overflow: 'hidden',
                    background: emphasized
                        ? { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' }
                        : 'transparent',
                    _hover: {
                        background: {
                            base: emphasized ? 'rgba(224,123,83,0.09)' : 'rgba(0,0,0,0.03)',
                            _dark: emphasized ? 'rgba(224,123,83,0.14)' : 'rgba(255,255,255,0.04)',
                        },
                    },
                })}
                onPointerEnter={onHover}
            >
                {/* Colored left accent bar for unread */}
                {emphasized && (
                    <div
                        className={css({
                            position: 'absolute',
                            left: 0,
                            top: '12%',
                            bottom: '12%',
                            width: '3px',
                            borderRadius: 'full',
                        })}
                        style={{ background: iconBg }}
                    />
                )}

                {/* Icon pill — colored bg like activity sidebar */}
                <div
                    className={css({
                        width: '32px',
                        height: '32px',
                        borderRadius: 'lg',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: '0.5',
                        transition: 'all 150ms ease',
                    })}
                    style={{
                        backgroundColor: emphasized ? iconBg : `${iconBg}20`,
                    }}
                >
                    <Icon size={15} color={emphasized ? 'white' : iconBg} />
                </div>

                {/* Content */}
                <div className={css({ flex: 1, minWidth: 0 })}>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: '2',
                        })}
                    >
                        <p
                            className={css({
                                fontWeight: emphasized ? '700' : '500',
                                fontSize: dense ? 'xs' : 'sm',
                                lineHeight: '1.3',
                                color: emphasized ? 'text' : 'text-muted',
                                truncate: true,
                            })}
                        >
                            {title}
                        </p>
                        <span
                            className={css({
                                fontSize: '2xs',
                                whiteSpace: 'nowrap',
                                fontWeight: emphasized ? '600' : '400',
                                flexShrink: 0,
                                color: emphasized ? undefined : 'text-muted',
                            })}
                            style={emphasized ? { color: iconBg } : undefined}
                        >
                            {timeLabel}
                        </span>
                    </div>
                    <p
                        className={css({
                            fontSize: dense ? '2xs' : 'xs',
                            color: 'text-muted',
                            margin: 0,
                            lineHeight: '1.4',
                            lineClamp: '2',
                        })}
                    >
                        {message}
                    </p>
                    <MediaStrip media={media} />
                </div>
            </Link>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className={css({
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface.elevated',
                        color: 'text',
                        borderRadius: 'xl',
                        paddingX: '2.5',
                        paddingY: dense ? '1.5' : '2',
                        fontSize: '2xs',
                        fontWeight: '700',
                        cursor: 'pointer',
                        _hover: {
                            borderColor: 'primary',
                            color: 'primary',
                        },
                    })}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
