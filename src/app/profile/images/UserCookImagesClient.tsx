'use client';

import { Trash2, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { deleteUserCookImage, type UserCookImageData } from '@app/app/actions/cooks';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css } from 'styled-system/css';

const STATUS_LABELS: Record<string, { label: string; colorCss: string; bgCss: string }> = {
    AUTO_APPROVED: {
        label: 'Freigegeben',
        colorCss: css({ color: { base: '#16a34a', _dark: '#4ade80' } }),
        bgCss: css({ bg: { base: 'rgba(34,197,94,0.1)', _dark: 'rgba(34,197,94,0.15)' } }),
    },
    APPROVED: {
        label: 'Freigegeben',
        colorCss: css({ color: { base: '#16a34a', _dark: '#4ade80' } }),
        bgCss: css({ bg: { base: 'rgba(34,197,94,0.1)', _dark: 'rgba(34,197,94,0.15)' } }),
    },
    PENDING: {
        label: 'In Prüfung',
        colorCss: css({ color: { base: '#d97706', _dark: '#fbbf24' } }),
        bgCss: css({ bg: { base: 'rgba(245,158,11,0.1)', _dark: 'rgba(245,158,11,0.15)' } }),
    },
    REJECTED: {
        label: 'Abgelehnt',
        colorCss: css({ color: { base: '#dc2626', _dark: '#f87171' } }),
        bgCss: css({ bg: { base: 'rgba(239,68,68,0.1)', _dark: 'rgba(239,68,68,0.15)' } }),
    },
};

function timeAgo(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7) return `Vor ${days} Tagen`;
    if (days < 30)
        return `Vor ${Math.floor(days / 7)} Woche${Math.floor(days / 7) === 1 ? '' : 'n'}`;
    return new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function CookImageCard({
    image,
    onDeleted,
}: {
    image: UserCookImageData;
    onDeleted: (id: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const status = STATUS_LABELS[image.moderationStatus] ?? STATUS_LABELS.AUTO_APPROVED;

    function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        startTransition(async () => {
            await deleteUserCookImage(image.id);
            onDeleted(image.id);
        });
    }

    return (
        <div
            className={css({
                borderRadius: '2xl',
                border: '1px solid',
                borderColor: 'border',
                overflow: 'hidden',
                bg: 'surface',
                display: 'flex',
                flexDirection: 'column',
                opacity: isPending ? 0.5 : 1,
                transition: 'opacity 150ms ease',
            })}
        >
            {/* Image */}
            <div
                className={css({
                    position: 'relative',
                    aspectRatio: '1/1',
                    bg: 'surface.elevated',
                    overflow: 'hidden',
                })}
            >
                {}
                <img
                    src={getThumbnailUrl(image.imageKey, '1:1', 640)}
                    alt={image.caption ?? image.recipe.title}
                    className={css({
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    })}
                />
                {/* Status badge */}
                <span
                    className={`${css({
                        position: 'absolute',
                        top: '2',
                        left: '2',
                        px: '2',
                        py: '0.5',
                        borderRadius: 'full',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                    })} ${status.bgCss} ${status.colorCss}`}
                >
                    {status.label}
                </span>
            </div>

            {/* Info */}
            <div
                className={css({
                    p: '3',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2',
                    flex: '1',
                })}
            >
                <Link
                    href={`/recipe/${image.recipe.slug}`}
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'foreground',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1',
                        lineClamp: '2',
                        lineHeight: '1.4',
                        _hover: { color: 'primary' },
                    })}
                >
                    {image.recipe.title}
                    <ExternalLink size={11} style={{ flexShrink: 0 }} />
                </Link>

                {image.caption && (
                    <p
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            lineClamp: '2',
                        })}
                    >
                        {image.caption}
                    </p>
                )}

                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1',
                        color: 'foreground.muted',
                        fontSize: 'xs',
                        mt: 'auto',
                    })}
                >
                    <Clock size={11} />
                    <span>{timeAgo(image.createdAt)}</span>
                </div>

                {/* Delete button */}
                <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className={css({
                        mt: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1.5',
                        w: '100%',
                        py: '1.5',
                        borderRadius: 'lg',
                        fontSize: 'xs',
                        fontWeight: '600',
                        border: '1px solid',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        ...(confirmDelete
                            ? {
                                  bg: {
                                      base: 'rgba(239,68,68,0.1)',
                                      _dark: 'rgba(239,68,68,0.15)',
                                  },
                                  borderColor: {
                                      base: 'rgba(239,68,68,0.4)',
                                      _dark: 'rgba(239,68,68,0.5)',
                                  },
                                  color: { base: '#dc2626', _dark: '#f87171' },
                              }
                            : {
                                  bg: 'transparent',
                                  borderColor: 'border',
                                  color: 'text.muted',
                              }),
                    })}
                >
                    <Trash2 size={12} />
                    {confirmDelete ? 'Sicher löschen?' : 'Löschen'}
                </button>
                {confirmDelete && (
                    <button
                        onClick={() => setConfirmDelete(false)}
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            cursor: 'pointer',
                            border: 'none',
                            bg: 'transparent',
                            textAlign: 'center',
                            _hover: { color: 'foreground' },
                        })}
                    >
                        Abbrechen
                    </button>
                )}
            </div>
        </div>
    );
}

export function UserCookImagesClient({ images: initialImages }: { images: UserCookImageData[] }) {
    const [images, setImages] = useState(initialImages);

    function handleDeleted(id: string) {
        setImages((prev) => prev.filter((img) => img.id !== id));
    }

    if (images.length === 0) {
        return (
            <div
                className={css({
                    textAlign: 'center',
                    py: '16',
                    border: '1px dashed',
                    borderColor: 'border',
                    borderRadius: '2xl',
                    color: 'foreground.muted',
                })}
            >
                <p className={css({ fontSize: 'lg', mb: '2' })}>Noch keine Bilder hochgeladen</p>
                <p className={css({ fontSize: 'sm' })}>Lade beim nächsten Kochen ein Foto hoch!</p>
            </div>
        );
    }

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: {
                    base: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(4, 1fr)',
                    lg: 'repeat(5, 1fr)',
                },
                gap: '4',
            })}
        >
            {images.map((image) => (
                <CookImageCard key={image.id} image={image} onDeleted={handleDeleted} />
            ))}
        </div>
    );
}
