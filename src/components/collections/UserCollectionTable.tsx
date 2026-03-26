'use client';

import {
    Archive,
    BookOpen,
    Edit2,
    Eye,
    Plus,
    Search,
    Send,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
    deleteCollection,
    publishCollection,
    unpublishCollection,
} from '@app/app/actions/collections';
import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';
import type { CollectionCardData } from '@app/lib/collections/types';
import { PALETTE } from '@app/lib/palette';

import { css, cx } from 'styled-system/css';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type StatusLabel = 'Live' | 'Entwurf' | 'Wird geprüft' | 'Abgelehnt';

function getStatusLabel(collection: CollectionCardData): StatusLabel {
    if (collection.moderationStatus === 'REJECTED') return 'Abgelehnt';
    if (collection.moderationStatus === 'PENDING') return 'Wird geprüft';
    if (!collection.published) return 'Entwurf';
    return 'Live';
}

function getStatusColor(label: StatusLabel): string {
    switch (label) {
        case 'Live':
            return '#16a34a';
        case 'Entwurf':
            return PALETTE.gold;
        case 'Wird geprüft':
            return PALETTE.blue;
        case 'Abgelehnt':
            return '#dc2626';
    }
}

// ---------------------------------------------------------------------------
// Collection Card Actions
// ---------------------------------------------------------------------------

function CollectionCardActions({ collection }: { collection: CollectionCardData }) {
    const router = useRouter();
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const statusLabel = getStatusLabel(collection);
    const isLive = statusLabel === 'Live';
    const canPublish = !collection.published && statusLabel !== 'Abgelehnt';

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteCollection(collection.id);
            router.refresh();
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePublish = async () => {
        setIsUpdating(true);
        try {
            await publishCollection(collection.id);
            router.refresh();
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUnpublish = async () => {
        setIsUpdating(true);
        try {
            await unpublishCollection(collection.id);
            router.refresh();
        } finally {
            setIsUpdating(false);
        }
    };

    const actionBtnClass = css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5',
        px: '2',
        py: '2',
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: 'border.muted',
        background: 'surface',
        fontSize: 'xs',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        color: 'foreground',
        _disabled: { opacity: 0.5, pointerEvents: 'none' },
    });

    return (
        <>
            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5' })}>
                {canPublish && (
                    <button
                        onClick={handlePublish}
                        disabled={isUpdating}
                        className={cx(
                            actionBtnClass,
                            css({
                                gridColumn: 'span 2',
                                borderColor: '#16a34a',
                                color: '#16a34a',
                                _hover: { background: '#16a34a15' },
                            }),
                        )}
                    >
                        <Send size={14} />
                        Veröffentlichen
                    </button>
                )}

                {isLive && (
                    <button
                        onClick={handleUnpublish}
                        disabled={isUpdating}
                        className={cx(
                            actionBtnClass,
                            css({
                                gridColumn: 'span 2',
                                _hover: {
                                    background: '#d9770615',
                                    borderColor: '#d97706',
                                    color: '#d97706',
                                },
                            }),
                        )}
                    >
                        <Archive size={14} />
                        Zurückziehen
                    </button>
                )}

                <Link
                    href={`/collection/${collection.slug}/edit`}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1.5',
                        px: '2',
                        py: '2',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border.muted',
                        background: 'surface',
                        fontSize: 'xs',
                        fontWeight: '600',
                        color: 'foreground',
                        textDecoration: 'none',
                        transition: 'all 150ms ease',
                        _hover: { borderColor: 'primary', color: 'primary' },
                    })}
                >
                    <Edit2 size={13} />
                    Bearbeiten
                </Link>

                <button
                    onClick={() => setDeleteConfirm(true)}
                    disabled={isDeleting || isUpdating}
                    className={actionBtnClass}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#dc2626';
                        e.currentTarget.style.color = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.color = '';
                    }}
                >
                    <Trash2 size={13} />
                    Löschen
                </button>
            </div>

            {deleteConfirm && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'surface.overlay',
                        zIndex: 50,
                    })}
                    onClick={() => !isDeleting && setDeleteConfirm(false)}
                >
                    <div
                        className={css({
                            background: 'surface.elevated',
                            borderRadius: 'xl',
                            padding: '6',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: {
                                base: '0 24px 60px rgba(0,0,0,0.25)',
                                _dark: '0 24px 60px rgba(0,0,0,0.5)',
                            },
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            className={css({
                                fontSize: 'lg',
                                fontWeight: 700,
                                marginBottom: '3',
                                color: 'red.600',
                            })}
                        >
                            Sammlung löschen?
                        </h3>
                        <p
                            className={css({
                                color: 'foreground.muted',
                                marginBottom: '5',
                                lineHeight: 1.6,
                                fontSize: 'sm',
                            })}
                        >
                            &ldquo;{collection.title}&rdquo; wird endgültig gelöscht und kann nicht
                            wiederhergestellt werden.
                        </p>
                        <div
                            className={css({
                                display: 'flex',
                                gap: '3',
                                justifyContent: 'flex-end',
                            })}
                        >
                            <Button
                                variant="secondary"
                                onClick={() => setDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Abbrechen
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className={css({
                                    background: 'red.600',
                                    _hover: { background: 'red.700' },
                                })}
                            >
                                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Single Collection Card
// ---------------------------------------------------------------------------

function UserCollectionCard({ collection }: { collection: CollectionCardData }) {
    const statusLabel = getStatusLabel(collection);
    const statusColor = getStatusColor(statusLabel);
    const date = new Date(collection.createdAt);

    return (
        <div
            className={css({
                background: 'surface.elevated',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'border',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                transition: 'all 200ms ease',
                _hover: {
                    borderColor: 'primary',
                    boxShadow: `0 12px 28px ${PALETTE.orange}15`,
                },
            })}
        >
            {/* Image + Status Badge */}
            <Link
                href={`/collection/${collection.slug}`}
                className={css({ textDecoration: 'none', color: 'inherit' })}
            >
                <div
                    className={css({
                        position: 'relative',
                        aspectRatio: '16/9',
                        overflow: 'hidden',
                        background: 'surface',
                    })}
                >
                    {collection.coverImageKey ? (
                        <SmartImage
                            alt={collection.title}
                            fill
                            imageKey={collection.coverImageKey}
                            className={css({ objectFit: 'cover' })}
                        />
                    ) : (
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                            })}
                            style={{
                                background: `linear-gradient(135deg, ${PALETTE.orange}15, ${PALETTE.gold}15)`,
                            }}
                        >
                            <BookOpen size={40} className={css({ color: 'foreground.muted' })} />
                        </div>
                    )}
                    <span
                        className={css({
                            position: 'absolute',
                            top: '2.5',
                            left: '2.5',
                            px: '2.5',
                            py: '1',
                            borderRadius: 'full',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            letterSpacing: 'wide',
                            textTransform: 'uppercase',
                            boxShadow: {
                                base: '0 2px 8px rgba(0,0,0,0.15)',
                                _dark: '0 2px 8px rgba(0,0,0,0.4)',
                            },
                        })}
                        style={{
                            background: statusColor,
                            color: 'white',
                        }}
                    >
                        {statusLabel}
                    </span>
                </div>
            </Link>

            {/* Content */}
            <div
                className={css({
                    p: '4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3',
                    flex: '1',
                })}
            >
                <div className={css({ flex: '1' })}>
                    <Link
                        href={`/collection/${collection.slug}`}
                        className={css({
                            textDecoration: 'none',
                            color: 'inherit',
                        })}
                    >
                        <h3
                            className={css({
                                fontWeight: '700',
                                fontSize: 'base',
                                lineHeight: 'tight',
                                lineClamp: 2,
                                color: 'text',
                                _hover: { color: 'primary' },
                            })}
                        >
                            {collection.title}
                        </h3>
                    </Link>

                    {/* Meta row */}
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            mt: '2',
                            fontSize: 'xs',
                            color: 'foreground.muted',
                        })}
                    >
                        <span
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                            })}
                        >
                            <UtensilsCrossed size={13} />
                            {collection.recipeCount}{' '}
                            {collection.recipeCount === 1 ? 'Rezept' : 'Rezepte'}
                        </span>
                        {collection.viewCount > 0 && (
                            <span
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1',
                                })}
                            >
                                <Eye size={13} />
                                {collection.viewCount}
                            </span>
                        )}
                        <span>{date.toLocaleDateString('de-DE')}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <CollectionCardActions collection={collection} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: '16',
                gap: '4',
            })}
        >
            <div
                className={css({
                    width: '64px',
                    height: '64px',
                    borderRadius: 'full',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}20, ${PALETTE.gold}20)`,
                }}
            >
                <Plus size={28} color={PALETTE.orange} />
            </div>
            <div className={css({ textAlign: 'center' })}>
                <p className={css({ fontWeight: '600', fontSize: 'lg', mb: '1' })}>
                    Noch keine Sammlungen
                </p>
                <p className={css({ color: 'foreground.muted', fontSize: 'sm', mb: '4' })}>
                    Erstelle deine erste Sammlung und teile sie mit der Community.
                </p>
            </div>
            <Link
                href="/collection/create"
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '5',
                    py: '3',
                    borderRadius: 'xl',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 'sm',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                    _hover: {
                        boxShadow: `0 8px 24px ${PALETTE.orange}40`,
                    },
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                }}
            >
                <Plus size={18} />
                Sammlung erstellen
            </Link>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type StatusFilter = 'ALL' | 'LIVE' | 'DRAFT';

export function UserCollectionTable({ collections }: { collections: CollectionCardData[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    const filtered = collections
        .filter((c) => {
            if (statusFilter === 'ALL') return true;
            const label = getStatusLabel(c);
            if (statusFilter === 'LIVE') return label === 'Live';
            // DRAFT = everything that's not Live
            return label !== 'Live';
        })
        .filter(
            (c) =>
                !searchQuery.trim() ||
                c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}>
            {/* Toolbar */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    flexWrap: 'wrap',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        background: 'surface.elevated',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border.muted',
                        px: '3',
                        py: '2.5',
                        flex: '1',
                        minWidth: '180px',
                        maxWidth: '360px',
                    })}
                >
                    <Search
                        size={16}
                        className={css({ color: 'foreground.muted', flexShrink: 0 })}
                    />
                    <input
                        type="text"
                        placeholder="Sammlungen suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={css({
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'text',
                            width: '100%',
                            '&::placeholder': { color: 'foreground.muted' },
                        })}
                    />
                </div>

                <div className={css({ display: 'flex', gap: '1.5' })}>
                    {(['ALL', 'LIVE', 'DRAFT'] as const).map((f) => {
                        const labels: Record<StatusFilter, string> = {
                            ALL: 'Alle',
                            LIVE: 'Live',
                            DRAFT: 'Entwürfe',
                        };
                        const isActive = statusFilter === f;
                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setStatusFilter(f)}
                                className={cx(
                                    css({
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'lg',
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        transition: 'all 150ms ease',
                                        borderColor: 'border.muted',
                                        background: 'surface',
                                        color: 'foreground.muted',
                                    }),
                                    isActive &&
                                        css({
                                            borderColor: 'primary',
                                            background: 'accent.soft',
                                            color: 'primary',
                                        }),
                                )}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>

                <span className={css({ fontSize: 'xs', color: 'foreground.muted', ml: 'auto' })}>
                    {filtered.length} {filtered.length === 1 ? 'Sammlung' : 'Sammlungen'}
                </span>
            </div>

            {/* Card Grid or Empty State */}
            {filtered.length === 0 ? (
                collections.length === 0 ? (
                    <EmptyState />
                ) : (
                    <p
                        className={css({
                            textAlign: 'center',
                            py: '12',
                            color: 'foreground.muted',
                            fontSize: 'sm',
                        })}
                    >
                        Keine Sammlungen gefunden.
                    </p>
                )
            ) : (
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: {
                            base: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                            lg: 'repeat(4, 1fr)',
                            xl: 'repeat(5, 1fr)',
                        },
                        gap: '4',
                    })}
                >
                    {filtered.map((collection) => (
                        <UserCollectionCard key={collection.id} collection={collection} />
                    ))}
                </div>
            )}
        </div>
    );
}
