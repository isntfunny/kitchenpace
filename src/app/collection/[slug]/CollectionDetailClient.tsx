'use client';

import { ModerationStatus } from '@prisma/client';
import { Heart, Eye, BookOpen, Calendar, Edit2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { toggleCollectionFavorite, trackCollectionView } from '@app/app/actions/collections';
import type { CollectionDetail } from '@app/lib/collections/types';

import { css } from 'styled-system/css';

interface CollectionDetailClientProps {
    collection: CollectionDetail;
    isAuthenticated: boolean;
    isOwner: boolean;
    children: React.ReactNode;
}

export function CollectionDetailClient({
    collection,
    isAuthenticated,
    isOwner,
    children,
}: CollectionDetailClientProps) {
    const [isFavorited, setIsFavorited] = useState(collection.isFavorited);
    const [favoriteCount, setFavoriteCount] = useState(collection.favoriteCount);
    const trackedRef = useRef(false);

    useEffect(() => {
        if (trackedRef.current) return;
        trackedRef.current = true;
        trackCollectionView(collection.id).catch(() => {});
    }, [collection.id]);

    const handleFavorite = async () => {
        if (!isAuthenticated) return;
        const newState = await toggleCollectionFavorite(collection.id);
        setIsFavorited(newState);
        setFavoriteCount((prev) => prev + (newState ? 1 : -1));
    };

    const date = new Date(collection.createdAt).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const isDraft = !collection.published;
    const isPending = collection.moderationStatus === ModerationStatus.PENDING;
    const isRejected = collection.moderationStatus === ModerationStatus.REJECTED;

    return (
        <div>
            {isDraft && (
                <div
                    className={css({
                        bg: 'yellow.50',
                        color: 'yellow.800',
                        p: '3',
                        textAlign: 'center',
                        fontSize: 'sm',
                    })}
                >
                    Diese Sammlung ist ein Entwurf und nur fuer dich sichtbar.
                </div>
            )}
            {isPending && (
                <div
                    className={css({
                        bg: 'blue.50',
                        color: 'blue.800',
                        p: '3',
                        textAlign: 'center',
                        fontSize: 'sm',
                    })}
                >
                    Diese Sammlung wird noch geprueft.
                </div>
            )}
            {isRejected && (
                <div
                    className={css({
                        bg: 'red.50',
                        color: 'red.800',
                        p: '3',
                        textAlign: 'center',
                        fontSize: 'sm',
                    })}
                >
                    Diese Sammlung wurde abgelehnt.
                </div>
            )}

            <div className={css({ maxW: '1200px', mx: 'auto', px: '4', pt: '6' })}>
                <h1 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '2' })}>
                    {collection.title}
                </h1>
                {collection.description && (
                    <p className={css({ fontSize: 'lg', color: 'gray.600', mb: '4' })}>
                        {collection.description}
                    </p>
                )}

                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4',
                        mb: '6',
                        flexWrap: 'wrap',
                    })}
                >
                    <span
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'sm',
                            color: 'gray.500',
                        })}
                    >
                        <Calendar size={14} /> {date}
                    </span>
                    <span
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'sm',
                            color: 'gray.500',
                        })}
                    >
                        <BookOpen size={14} /> {collection.recipeCount} Rezepte
                    </span>
                    <span
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'sm',
                            color: 'gray.500',
                        })}
                    >
                        <Eye size={14} /> {collection.viewCount}
                    </span>

                    {isAuthenticated && (
                        <button
                            onClick={handleFavorite}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                                fontSize: 'sm',
                                cursor: 'pointer',
                                color: isFavorited ? 'red.500' : 'gray.500',
                                _hover: { color: isFavorited ? 'red.600' : 'gray.700' },
                            })}
                        >
                            <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                            {favoriteCount}
                        </button>
                    )}

                    <a
                        href={`/user/${collection.author.slug}`}
                        className={css({
                            fontSize: 'sm',
                            color: 'orange.600',
                            _hover: { textDecoration: 'underline' },
                        })}
                    >
                        von {collection.author.name}
                    </a>

                    {isOwner && (
                        <a
                            href={`/collection/${collection.slug}/edit`}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                                fontSize: 'sm',
                                color: 'gray.500',
                                ml: 'auto',
                                _hover: { color: 'orange.600' },
                            })}
                        >
                            <Edit2 size={14} /> Bearbeiten
                        </a>
                    )}
                </div>
            </div>

            {children}
        </div>
    );
}
