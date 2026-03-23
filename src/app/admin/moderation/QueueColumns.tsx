'use client';

import type { ModerationQueue, User } from '@prisma/client';
import { BookOpen, Check, ChevronRight, Eye, Image, MessageSquare, UserIcon } from 'lucide-react';

import { formatTimeAgo } from '@app/lib/activity-utils';
import { getThumbnailUrl, extractKeyFromUrl } from '@app/lib/thumbnail-client';

import { css } from 'styled-system/css';

export type QueueItem = ModerationQueue & {
    author: Pick<User, 'id' | 'name' | 'email'>;
};

export type ModerationContentSnapshot = {
    title?: string;
    description?: string;
    text?: string;
    imageUrl?: string;
    imageKey?: string;
    [key: string]: unknown;
};

export const TYPE_LABELS: Record<string, { label: string; icon: typeof BookOpen }> = {
    recipe: { label: 'Rezept', icon: BookOpen },
    recipe_image: { label: 'Rezeptbild', icon: Image },
    comment: { label: 'Kommentar', icon: MessageSquare },
    profile: { label: 'Profil', icon: UserIcon },
    cook_image: { label: 'Bild', icon: Image },
    step_image: { label: 'Schrittbild', icon: Image },
};

export function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
    const color =
        score >= 0.7
            ? 'rgba(239,68,68,0.15)'
            : score >= 0.5
              ? 'rgba(245,158,11,0.15)'
              : 'rgba(34,197,94,0.1)';
    const textColor = score >= 0.7 ? '#dc2626' : score >= 0.5 ? '#d97706' : '#16a34a';

    return (
        <span
            className={css({
                px: size === 'lg' ? '3' : '2',
                py: size === 'lg' ? '1' : '0.5',
                borderRadius: 'full',
                fontSize: size === 'lg' ? 'md' : 'xs',
                fontWeight: '700',
                fontFamily: 'mono',
            })}
            style={{ background: color, color: textColor }}
        >
            {score.toFixed(3)}
        </span>
    );
}

export function CategoryScoresGrid({ flags }: { flags: Record<string, number> }) {
    const sorted = Object.entries(flags).sort(([, a], [, b]) => b - a);

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '2',
            })}
        >
            {sorted.map(([category, score]) => (
                <div
                    key={category}
                    className={css({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: '3',
                        py: '1.5',
                        borderRadius: 'lg',
                        fontSize: 'xs',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                    })}
                    style={{
                        background:
                            score > 0.4
                                ? 'rgba(239,68,68,0.05)'
                                : score > 0.2
                                  ? 'rgba(245,158,11,0.04)'
                                  : 'transparent',
                    }}
                >
                    <span className={css({ fontWeight: '600', color: 'foreground' })}>
                        {category.replace(/\//g, ' / ')}
                    </span>
                    <span
                        className={css({ fontFamily: 'mono', fontWeight: '700' })}
                        style={{
                            color: score > 0.4 ? '#dc2626' : score > 0.2 ? '#d97706' : '#6b7280',
                        }}
                    >
                        {score.toFixed(4)}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <span
                className={css({
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'foreground.muted',
                    fontWeight: 600,
                })}
            >
                {label}
            </span>
            <div className={css({ fontSize: 'sm', color: 'foreground' })}>{children}</div>
        </div>
    );
}

export function QueueRow({
    item,
    onSelect,
    onApprove,
    pending,
}: {
    item: QueueItem;
    onSelect: (item: QueueItem) => void;
    onApprove: (id: string) => void;
    pending: boolean;
}) {
    const typeConfig = TYPE_LABELS[item.contentType] ?? {
        label: item.contentType,
        icon: Eye,
    };
    const TypeIcon = typeConfig.icon;
    const snapshot = item.contentSnapshot as ModerationContentSnapshot | null;

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: '100px 1fr 80px 140px 90px 90px',
                gap: '3',
                px: '4',
                py: '3',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
                cursor: 'pointer',
                transition: 'background 100ms',
                _hover: { bg: 'accent.soft' },
                _last: { borderBottom: 'none' },
            })}
            onClick={() => onSelect(item)}
        >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                <TypeIcon
                    size={14}
                    className={css({ color: 'foreground.muted', flexShrink: '0' })}
                />
                <span
                    className={css({
                        fontSize: 'xs',
                        fontWeight: '600',
                        color: 'foreground.muted',
                    })}
                >
                    {typeConfig.label}
                </span>
            </div>

            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    overflow: 'hidden',
                })}
            >
                {(snapshot?.imageKey || snapshot?.imageUrl) && (
                    <img
                        src={getThumbnailUrl(
                            snapshot?.imageKey ??
                                extractKeyFromUrl(String(snapshot?.imageUrl)) ??
                                undefined,
                            '1:1',
                            64,
                        )}
                        alt=""
                        className={css({
                            width: '32px',
                            height: '32px',
                            borderRadius: 'md',
                            objectFit: 'cover',
                            flexShrink: '0',
                        })}
                    />
                )}
                <span
                    className={css({
                        fontSize: 'sm',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    })}
                >
                    {snapshot?.title ||
                        snapshot?.text?.slice(0, 80) ||
                        snapshot?.description?.slice(0, 80) ||
                        '—'}
                </span>
                <ChevronRight
                    size={14}
                    className={css({
                        color: 'foreground.muted',
                        flexShrink: '0',
                        ml: 'auto',
                    })}
                />
            </div>

            <ScoreBadge score={item.aiScore} />

            <span
                className={css({
                    fontSize: 'xs',
                    color: 'foreground.muted',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                })}
            >
                {item.author.name ?? item.author.email}
            </span>

            <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                {formatTimeAgo(item.createdAt)}
            </span>

            <div
                className={css({ display: 'flex', gap: '1' })}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => onApprove(item.id)}
                    disabled={pending}
                    className={css({
                        p: '1.5',
                        borderRadius: 'lg',
                        bg: {
                            base: 'rgba(34,197,94,0.1)',
                            _dark: 'rgba(34,197,94,0.15)',
                        },
                        color: 'status.success',
                        cursor: 'pointer',
                        border: 'none',
                        _hover: {
                            bg: {
                                base: 'rgba(34,197,94,0.2)',
                                _dark: 'rgba(34,197,94,0.25)',
                            },
                        },
                        _disabled: { opacity: '0.5', cursor: 'not-allowed' },
                    })}
                    title="Freigeben"
                >
                    <Check size={16} />
                </button>
                <button
                    onClick={() => onSelect(item)}
                    disabled={pending}
                    className={css({
                        p: '1.5',
                        borderRadius: 'lg',
                        bg: {
                            base: 'rgba(239,68,68,0.1)',
                            _dark: 'rgba(239,68,68,0.15)',
                        },
                        color: 'status.danger',
                        cursor: 'pointer',
                        border: 'none',
                        _hover: {
                            bg: {
                                base: 'rgba(239,68,68,0.2)',
                                _dark: 'rgba(239,68,68,0.25)',
                            },
                        },
                        _disabled: { opacity: '0.5', cursor: 'not-allowed' },
                    })}
                    title="Details / Ablehnen"
                >
                    <Eye size={16} />
                </button>
            </div>
        </div>
    );
}
