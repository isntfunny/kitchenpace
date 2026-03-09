'use client';

import Link from 'next/link';

import { SmartImage } from '@app/components/atoms/SmartImage';
import { css } from 'styled-system/css';

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
    onHover?: () => void;
    actionLabel?: string;
    onAction?: () => void;
    media?: MediaContext;
};

function formatRelativeTime(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    const seconds = Math.round(diffMs / 1000);
    if (seconds < 60) return 'gerade eben';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} Tage`;
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(value));
}

function MediaStrip({ media }: { media?: MediaContext }) {
    if (!media) {
        return null;
    }

    const images = [
        media.actor?.avatar ? { src: media.actor.avatar, alt: media.actor.name ?? 'Nutzerbild' } : null,
        media.recipe?.image ? { src: media.recipe.image, alt: media.recipe.title ?? 'Rezeptbild' } : null,
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
                gap: '2',
                flexWrap: 'wrap',
                marginTop: '2',
            })}
        >
            {images.map((image, index) => (
                <SmartImage
                    key={`${image.src}-${index}`}
                    src={image.src}
                    alt={image.alt}
                    width={32}
                    height={32}
                    className={css({
                        width: '8',
                        height: '8',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                    })}
                />
            ))}
            {typeof media.score === 'number' && (
                <span
                    className={css({
                        fontSize: 'xs',
                        color: 'text-muted',
                        background: 'surface.elevated',
                        borderRadius: 'full',
                        paddingX: '2',
                        paddingY: '0.5',
                    })}
                >
                    Score {media.score.toFixed(2)}
                </span>
            )}
            {media.topRatedCategory && (
                <span
                    className={css({
                        fontSize: 'xs',
                        color: 'primary',
                        background: 'accent.soft',
                        borderRadius: 'full',
                        paddingX: '2',
                        paddingY: '0.5',
                    })}
                >
                    {media.topRatedCategory}
                </span>
            )}
        </div>
    );
}

export function InboxItemCard({
    title,
    message,
    createdAt,
    href = '#',
    dense = false,
    emphasized = false,
    onHover,
    actionLabel,
    onAction,
    media,
}: InboxItemCardProps) {
    const timeLabel = formatRelativeTime(createdAt);

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
                    display: 'block',
                    padding: dense ? '3' : '4',
                    borderRadius: '2xl',
                    background: emphasized ? 'surfaceElevated' : 'surface',
                    border: '1px solid',
                    borderColor: emphasized ? 'accent.soft' : 'border',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 150ms ease',
                    _hover: { background: 'accent.soft' },
                })}
                onPointerEnter={onHover}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '2',
                        mb: '1',
                    })}
                >
                    <p className={css({ fontWeight: '700', fontSize: dense ? 'sm' : 'base' })}>
                        {title}
                    </p>
                    <span
                        className={css({ fontSize: 'xs', color: 'text-muted', whiteSpace: 'nowrap' })}
                    >
                        {timeLabel}
                    </span>
                </div>
                <p
                    className={css({
                        fontSize: dense ? 'xs' : 'sm',
                        color: 'text-muted',
                        margin: 0,
                        lineHeight: '1.4',
                    })}
                >
                    {message}
                </p>
                <MediaStrip media={media} />
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
                        borderRadius: '2xl',
                        paddingX: '3',
                        paddingY: dense ? '2' : '3',
                        fontSize: 'xs',
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
