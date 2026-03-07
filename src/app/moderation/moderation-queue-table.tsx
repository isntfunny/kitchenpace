'use client';

import type { ModerationQueue, User } from '@prisma/client';
import { Check, X, Eye, Image, MessageSquare, BookOpen, UserIcon } from 'lucide-react';
import { useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { approveContent, rejectContent } from './actions';

type QueueItem = ModerationQueue & {
    author: Pick<User, 'id' | 'name' | 'email'>;
};

type ModerationContentSnapshot = {
    title?: string;
    description?: string;
    text?: string;
    imageUrl?: string;
};

const TYPE_LABELS: Record<string, { label: string; icon: typeof BookOpen }> = {
    recipe: { label: 'Rezept', icon: BookOpen },
    comment: { label: 'Kommentar', icon: MessageSquare },
    profile: { label: 'Profil', icon: UserIcon },
    cook_image: { label: 'Bild', icon: Image },
};

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 0.7 ? 'rgba(239,68,68,0.15)' : score >= 0.5 ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)';
    const textColor =
        score >= 0.7 ? '#dc2626' : score >= 0.5 ? '#d97706' : '#b45309';

    return (
        <span
            className={css({
                px: '2',
                py: '0.5',
                borderRadius: 'full',
                fontSize: 'xs',
                fontWeight: '700',
                fontFamily: 'mono',
            })}
            style={{ background: color, color: textColor }}
        >
            {score.toFixed(2)}
        </span>
    );
}

function FlagBadges({ flags }: { flags: Record<string, number> }) {
    const topFlags = Object.entries(flags)
        .filter(([, score]) => score > 0.2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    if (topFlags.length === 0) return null;

    return (
        <div className={css({ display: 'flex', gap: '1', flexWrap: 'wrap' })}>
            {topFlags.map(([category, score]) => (
                <span
                    key={category}
                    className={css({
                        px: '1.5',
                        py: '0.5',
                        borderRadius: 'full',
                        fontSize: '2xs',
                        fontWeight: '600',
                        bg: 'rgba(0,0,0,0.05)',
                        color: 'text.muted',
                    })}
                >
                    {category.replace(/\//g, '/')}: {score.toFixed(2)}
                </span>
            ))}
        </div>
    );
}

export function ModerationQueueTable({ items }: { items: QueueItem[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [pending, startTransition] = useTransition();

    if (items.length === 0) {
        return (
            <div
                className={css({
                    textAlign: 'center',
                    py: '12',
                    color: 'text.muted',
                    fontSize: 'lg',
                })}
            >
                Keine ausstehenden Einträge — alles sauber!
            </div>
        );
    }

    const handleApprove = (id: string) => {
        startTransition(async () => {
            await approveContent(id);
        });
    };

    const handleReject = (id: string) => {
        if (!rejectNote.trim()) return;
        startTransition(async () => {
            await rejectContent(id, rejectNote);
            setRejectNote('');
            setExpandedId(null);
        });
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            {items.map((item) => {
                const typeConfig = TYPE_LABELS[item.contentType] ?? {
                    label: item.contentType,
                    icon: Eye,
                };
                const TypeIcon = typeConfig.icon;
                const snapshot = item.contentSnapshot as ModerationContentSnapshot | null;
                const isExpanded = expandedId === item.id;
                const description = snapshot?.description;

                return (
                    <div
                        key={item.id}
                        className={css({
                            border: '1px solid rgba(224,123,83,0.4)',
                            borderRadius: 'xl',
                            bg: 'surface',
                            overflow: 'hidden',
                        })}
                    >
                        {/* Main row */}
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4',
                                px: '4',
                                py: '3',
                                cursor: 'pointer',
                                _hover: { bg: 'rgba(224,123,83,0.03)' },
                            })}
                            onClick={() =>
                                setExpandedId(isExpanded ? null : item.id)
                            }
                        >
                            <TypeIcon
                                size={18}
                                className={css({ color: 'text.muted', flexShrink: '0' })}
                            />
                            <span
                                className={css({
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    color: 'text.muted',
                                    width: '80px',
                                    flexShrink: '0',
                                })}
                            >
                                {typeConfig.label}
                            </span>

                            {/* Preview */}
                            <span
                                className={css({
                                    fontSize: 'sm',
                                    flex: '1',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {(snapshot?.title as string) ||
                                    (snapshot?.text as string)?.slice(0, 80) ||
                                    'Kein Vorschau-Text'}
                            </span>

                            <ScoreBadge score={item.aiScore} />

                            <span
                                className={css({
                                    fontSize: 'xs',
                                    color: 'text.muted',
                                    flexShrink: '0',
                                })}
                            >
                                {item.author.name ?? item.author.email}
                            </span>

                            <span
                                className={css({
                                    fontSize: 'xs',
                                    color: 'text.muted',
                                    flexShrink: '0',
                                    width: '80px',
                                })}
                            >
                                {timeAgo(item.createdAt)}
                            </span>

                            {/* Quick actions */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(item.id);
                                }}
                                disabled={pending}
                                className={css({
                                    p: '1.5',
                                    borderRadius: 'lg',
                                    bg: 'rgba(34,197,94,0.1)',
                                    color: '#16a34a',
                                    cursor: 'pointer',
                                    border: 'none',
                                    _hover: { bg: 'rgba(34,197,94,0.2)' },
                                    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
                                })}
                                title="Freigeben"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedId(isExpanded ? null : item.id);
                                }}
                                disabled={pending}
                                className={css({
                                    p: '1.5',
                                    borderRadius: 'lg',
                                    bg: 'rgba(239,68,68,0.1)',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    border: 'none',
                                    _hover: { bg: 'rgba(239,68,68,0.2)' },
                                    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
                                })}
                                title="Ablehnen"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                            <div
                                className={css({
                                    px: '4',
                                    py: '3',
                                    borderTop: '1px solid rgba(0,0,0,0.06)',
                                    bg: 'rgba(0,0,0,0.02)',
                                })}
                            >
                                {/* Content preview */}
                                {description ? (
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text',
                                            mb: '3',
                                            whiteSpace: 'pre-wrap',
                                        })}
                                    >
                                        {description.slice(0, 500)}
                                    </p>
                                ) : null}

                                {snapshot?.imageUrl && (
                                    <img
                                        src={String(snapshot.imageUrl)}
                                        alt="Uploaded content"
                                        className={css({
                                            maxWidth: '200px',
                                            borderRadius: 'lg',
                                            mb: '3',
                                        })}
                                    />
                                )}

                                <FlagBadges
                                    flags={item.aiFlags as Record<string, number>}
                                />

                                {/* Reject form */}
                                <div
                                    className={css({
                                        display: 'flex',
                                        gap: '2',
                                        mt: '3',
                                        alignItems: 'flex-end',
                                    })}
                                >
                                    <textarea
                                        value={rejectNote}
                                        onChange={(e) =>
                                            setRejectNote(e.target.value)
                                        }
                                        placeholder="Grund für Ablehnung (Pflichtfeld)..."
                                        className={css({
                                            flex: '1',
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'xl',
                                            border: '1px solid rgba(224,123,83,0.4)',
                                            fontSize: 'sm',
                                            resize: 'vertical',
                                            minHeight: '60px',
                                            _focus: {
                                                borderColor: '#e07b53',
                                                outline: 'none',
                                                boxShadow:
                                                    '0 0 0 3px rgba(224,123,83,0.15)',
                                            },
                                        })}
                                    />
                                    <button
                                        onClick={() => handleReject(item.id)}
                                        disabled={
                                            pending || !rejectNote.trim()
                                        }
                                        className={css({
                                            px: '4',
                                            py: '2',
                                            borderRadius: 'xl',
                                            bg: '#dc2626',
                                            color: 'white',
                                            fontWeight: '600',
                                            fontSize: 'sm',
                                            cursor: 'pointer',
                                            border: 'none',
                                            _hover: { bg: '#b91c1c' },
                                            _disabled: {
                                                opacity: '0.5',
                                                cursor: 'not-allowed',
                                            },
                                        })}
                                    >
                                        Ablehnen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function timeAgo(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays}d`;
}
