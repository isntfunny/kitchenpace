import { Eye, Heart, BookOpen } from 'lucide-react';

import { SmartImage } from '@app/components/atoms/SmartImage';
import type { CollectionCardData } from '@app/lib/collections/types';

import { css } from 'styled-system/css';

interface CollectionCardProps {
    collection: CollectionCardData;
}

export function CollectionCard({ collection }: CollectionCardProps) {
    return (
        <a
            href={`/collection/${collection.slug}`}
            className={css({
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'xl',
                overflow: 'hidden',
                bg: 'white',
                boxShadow: 'sm',
                transition: 'all 0.2s',
                _hover: { boxShadow: 'md', transform: 'translateY(-2px)' },
            })}
        >
            <div className={css({ position: 'relative', aspectRatio: '16/9', bg: 'gray.100' })}>
                {collection.coverImageKey ? (
                    <SmartImage
                        imageKey={collection.coverImageKey}
                        aspect="16:9"
                        sizes="340px"
                        fill
                    />
                ) : (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            h: '100%',
                            color: 'gray.400',
                        })}
                    >
                        <BookOpen size={32} />
                    </div>
                )}
            </div>

            <div className={css({ p: '4' })}>
                <h3
                    className={css({
                        fontSize: 'md',
                        fontWeight: 'bold',
                        mb: '1',
                        lineClamp: '1',
                    })}
                >
                    {collection.title}
                </h3>
                {collection.description && (
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'gray.500',
                            mb: '3',
                            lineClamp: '2',
                        })}
                    >
                        {collection.description}
                    </p>
                )}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 'xs',
                        color: 'gray.400',
                    })}
                >
                    <span>{collection.authorName}</span>
                    <div className={css({ display: 'flex', gap: '3' })}>
                        <span
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                            })}
                        >
                            <BookOpen size={12} /> {collection.recipeCount}
                        </span>
                        <span
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                            })}
                        >
                            <Eye size={12} /> {collection.viewCount}
                        </span>
                        <span
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                            })}
                        >
                            <Heart size={12} /> {collection.favoriteCount}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
}
