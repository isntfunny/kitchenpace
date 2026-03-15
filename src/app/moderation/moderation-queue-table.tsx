'use client';

import type { ModerationQueue, User } from '@prisma/client';
import JsonView from '@uiw/react-json-view';
import {
    Check,
    X,
    Eye,
    Image,
    MessageSquare,
    BookOpen,
    UserIcon,
    ChevronRight,
} from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { getThumbnailUrl, extractKeyFromUrl } from '@app/lib/thumbnail-client';

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
    imageKey?: string;
    [key: string]: unknown;
};

const TYPE_LABELS: Record<string, { label: string; icon: typeof BookOpen }> = {
    recipe: { label: 'Rezept', icon: BookOpen },
    recipe_image: { label: 'Rezeptbild', icon: Image },
    comment: { label: 'Kommentar', icon: MessageSquare },
    profile: { label: 'Profil', icon: UserIcon },
    cook_image: { label: 'Bild', icon: Image },
    step_image: { label: 'Schrittbild', icon: Image },
};

function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
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

function CategoryScoresGrid({ flags }: { flags: Record<string, number> }) {
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
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

function ModerationDetailDialog({
    item,
    open,
    onClose,
    onApprove,
    onReject,
}: {
    item: QueueItem;
    open: boolean;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string, note: string) => void;
}) {
    const [rejectNote, setRejectNote] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const snapshot = item.contentSnapshot as ModerationContentSnapshot | null;
    const flags = item.aiFlags as Record<string, number>;
    const typeConfig = TYPE_LABELS[item.contentType] ?? { label: item.contentType, icon: Eye };
    const TypeIcon = typeConfig.icon;

    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        background: 'surface.overlay',
                        zIndex: 999,
                    })}
                />
                <Dialog.Content
                    className={css({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'surface',
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        padding: '6',
                        width: '90vw',
                        maxWidth: '800px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5',
                    })}
                >
                    {/* Header */}
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                        })}
                    >
                        <div>
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    mb: '1',
                                })}
                            >
                                <TypeIcon
                                    size={18}
                                    className={css({ color: 'foreground.muted' })}
                                />
                                <span
                                    className={css({
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: 'foreground.muted',
                                    })}
                                >
                                    {typeConfig.label}
                                </span>
                            </div>
                            <Dialog.Title
                                className={css({
                                    fontSize: 'xl',
                                    fontWeight: '700',
                                    color: 'foreground',
                                })}
                            >
                                {snapshot?.title || `${typeConfig.label} prüfen`}
                            </Dialog.Title>
                        </div>
                        <Dialog.Close
                            className={css({
                                p: '2',
                                cursor: 'pointer',
                                border: 'none',
                                bg: 'transparent',
                                color: 'foreground.muted',
                                _hover: { color: 'foreground' },
                            })}
                        >
                            <X size={20} />
                        </Dialog.Close>
                    </div>

                    {/* Meta info */}
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: '1fr 1fr 1fr' },
                            gap: '4',
                        })}
                    >
                        <DetailField label="Autor">
                            <span className={css({ fontWeight: '600' })}>
                                {item.author.name ?? '—'}
                            </span>
                            <br />
                            <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                {item.author.email}
                            </span>
                        </DetailField>
                        <DetailField label="Eingereicht">
                            {new Date(item.createdAt).toLocaleString('de-DE', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            })}
                        </DetailField>
                        <DetailField label="AI Score">
                            <ScoreBadge score={item.aiScore} size="lg" />
                        </DetailField>
                    </div>

                    {/* Content preview */}
                    {(snapshot?.description ||
                        snapshot?.text ||
                        snapshot?.imageUrl ||
                        snapshot?.imageKey) && (
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}
                        >
                            <span
                                className={css({
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'foreground.muted',
                                    fontWeight: 600,
                                })}
                            >
                                Inhalt
                            </span>

                            {(snapshot?.imageKey || snapshot?.imageUrl) && (
                                <img
                                    src={getThumbnailUrl(
                                        snapshot.imageKey ??
                                            extractKeyFromUrl(String(snapshot.imageUrl)) ??
                                            undefined,
                                        'original',
                                        960,
                                    )}
                                    alt="Geprüfter Inhalt"
                                    className={css({
                                        maxWidth: '100%',
                                        maxHeight: '300px',
                                        borderRadius: 'xl',
                                        objectFit: 'contain',
                                        border: '1px solid',
                                        borderColor: 'border.muted',
                                    })}
                                />
                            )}

                            {(snapshot?.description || snapshot?.text) && (
                                <div
                                    className={css({
                                        p: '4',
                                        borderRadius: 'xl',
                                        borderWidth: '1px',
                                        borderColor: 'border.muted',
                                        bg: 'surface.muted',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: 'sm',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                    })}
                                >
                                    {snapshot?.description || snapshot?.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Category scores */}
                    <div>
                        <span
                            className={css({
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'foreground.muted',
                                fontWeight: 600,
                                mb: '2',
                                display: 'block',
                            })}
                        >
                            Kategorie-Scores
                        </span>
                        <CategoryScoresGrid flags={flags} />
                    </div>

                    {/* Content snapshot JSON */}
                    <div>
                        <span
                            className={css({
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'foreground.muted',
                                fontWeight: 600,
                            })}
                        >
                            Content Snapshot
                        </span>
                        <div
                            className={css({
                                mt: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                overflow: 'auto',
                                maxHeight: '250px',
                                fontSize: '0.8rem',
                                fontFamily: 'mono',
                                '& .json-view': {
                                    background: 'transparent !important',
                                    padding: '1rem',
                                },
                            })}
                        >
                            {snapshot ? (
                                <JsonView
                                    value={snapshot as object}
                                    collapsed={2}
                                    enableClipboard
                                    displayDataTypes={false}
                                    shortenTextAfterLength={80}
                                />
                            ) : (
                                <div
                                    className={css({
                                        p: '4',
                                        color: 'foreground.muted',
                                        fontSize: 'sm',
                                    })}
                                >
                                    Kein Snapshot
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Raw AI Response */}
                    <div>
                        <span
                            className={css({
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'foreground.muted',
                                fontWeight: 600,
                            })}
                        >
                            Raw AI Response
                        </span>
                        <div
                            className={css({
                                mt: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontSize: '0.8rem',
                                fontFamily: 'mono',
                                '& .json-view': {
                                    background: 'transparent !important',
                                    padding: '1rem',
                                },
                            })}
                        >
                            {item.aiRawResponse != null ? (
                                <JsonView
                                    value={item.aiRawResponse as object}
                                    collapsed={2}
                                    enableClipboard
                                    displayDataTypes={false}
                                    shortenTextAfterLength={80}
                                />
                            ) : (
                                <div
                                    className={css({
                                        p: '4',
                                        color: 'foreground.muted',
                                        fontSize: 'sm',
                                    })}
                                >
                                    Keine Daten
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {item.status === 'PENDING' && (
                        <div
                            className={css({
                                borderTop: '1px solid',
                                borderColor: 'border.muted',
                                pt: '4',
                            })}
                        >
                            {!showRejectForm ? (
                                <div className={css({ display: 'flex', gap: '3' })}>
                                    <button
                                        onClick={() => {
                                            onApprove(item.id);
                                            onClose();
                                        }}
                                        className={css({
                                            flex: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '2',
                                            px: '4',
                                            py: '2.5',
                                            borderRadius: 'xl',
                                            bg: {
                                                base: 'rgba(34,197,94,0.1)',
                                                _dark: 'rgba(34,197,94,0.15)',
                                            },
                                            color: 'status.success',
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            cursor: 'pointer',
                                            border: '1px solid',
                                            borderColor: {
                                                base: 'rgba(34,197,94,0.3)',
                                                _dark: 'rgba(34,197,94,0.4)',
                                            },
                                            _hover: {
                                                bg: {
                                                    base: 'rgba(34,197,94,0.2)',
                                                    _dark: 'rgba(34,197,94,0.25)',
                                                },
                                            },
                                        })}
                                    >
                                        <Check size={18} /> Freigeben
                                    </button>
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        className={css({
                                            flex: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '2',
                                            px: '4',
                                            py: '2.5',
                                            borderRadius: 'xl',
                                            bg: {
                                                base: 'rgba(239,68,68,0.1)',
                                                _dark: 'rgba(239,68,68,0.15)',
                                            },
                                            color: 'status.danger',
                                            fontWeight: '700',
                                            fontSize: 'sm',
                                            cursor: 'pointer',
                                            border: '1px solid',
                                            borderColor: {
                                                base: 'rgba(239,68,68,0.3)',
                                                _dark: 'rgba(239,68,68,0.4)',
                                            },
                                            _hover: {
                                                bg: {
                                                    base: 'rgba(239,68,68,0.2)',
                                                    _dark: 'rgba(239,68,68,0.25)',
                                                },
                                            },
                                        })}
                                    >
                                        <X size={18} /> Ablehnen
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '3',
                                    })}
                                >
                                    <textarea
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        placeholder="Grund für Ablehnung (Pflichtfeld)..."
                                        className={css({
                                            px: '3',
                                            py: '2',
                                            borderRadius: 'xl',
                                            border: '1px solid',
                                            borderColor: 'border.muted',
                                            fontSize: 'sm',
                                            resize: 'vertical',
                                            minHeight: '80px',
                                            _focus: {
                                                borderColor: 'palette.orange',
                                                outline: 'none',
                                                boxShadow: {
                                                    base: '0 0 0 3px rgba(224,123,83,0.15)',
                                                    _dark: '0 0 0 3px rgba(224,123,83,0.12)',
                                                },
                                            },
                                        })}
                                    />
                                    <div className={css({ display: 'flex', gap: '2' })}>
                                        <button
                                            onClick={() => setShowRejectForm(false)}
                                            className={css({
                                                px: '4',
                                                py: '2',
                                                borderRadius: 'xl',
                                                bg: 'transparent',
                                                color: 'foreground.muted',
                                                fontWeight: '600',
                                                fontSize: 'sm',
                                                cursor: 'pointer',
                                                border: '1px solid',
                                                borderColor: 'border.muted',
                                                _hover: { bg: 'surface.muted' },
                                            })}
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            onClick={() => {
                                                onReject(item.id, rejectNote);
                                                onClose();
                                            }}
                                            disabled={!rejectNote.trim()}
                                            className={css({
                                                px: '4',
                                                py: '2',
                                                borderRadius: 'xl',
                                                bg: 'status.danger',
                                                color: 'white',
                                                fontWeight: '700',
                                                fontSize: 'sm',
                                                cursor: 'pointer',
                                                border: 'none',
                                                _hover: {
                                                    bg: { base: '#b91c1c', _dark: '#dc2626' },
                                                },
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
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function ModerationQueueTable({ items }: { items: QueueItem[] }) {
    const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
    const [pending, startTransition] = useTransition();

    if (items.length === 0) {
        return (
            <div
                className={css({
                    textAlign: 'center',
                    py: '12',
                    color: 'foreground.muted',
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

    const handleReject = (id: string, note: string) => {
        if (!note.trim()) return;
        startTransition(async () => {
            await rejectContent(id, note);
        });
    };

    return (
        <>
            <div
                className={css({
                    borderRadius: 'xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    overflow: 'hidden',
                })}
            >
                {/* Table header */}
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr 80px 140px 90px 90px',
                        gap: '3',
                        px: '4',
                        py: '2.5',
                        bg: 'surface.muted',
                        borderBottom: '1px solid',
                        borderColor: 'border.muted',
                        fontSize: 'xs',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'foreground.muted',
                    })}
                >
                    <span>Typ</span>
                    <span>Vorschau</span>
                    <span>Score</span>
                    <span>Autor</span>
                    <span>Zeit</span>
                    <span>Aktionen</span>
                </div>

                {/* Rows */}
                {items.map((item) => {
                    const typeConfig = TYPE_LABELS[item.contentType] ?? {
                        label: item.contentType,
                        icon: Eye,
                    };
                    const TypeIcon = typeConfig.icon;
                    const snapshot = item.contentSnapshot as ModerationContentSnapshot | null;

                    return (
                        <div
                            key={item.id}
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
                            onClick={() => setSelectedItem(item)}
                        >
                            <div
                                className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
                            >
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
                                {timeAgo(item.createdAt)}
                            </span>

                            <div
                                className={css({ display: 'flex', gap: '1' })}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => handleApprove(item.id)}
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
                                    onClick={() => setSelectedItem(item)}
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
                })}
            </div>

            {selectedItem && (
                <ModerationDetailDialog
                    item={selectedItem}
                    open={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </>
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
