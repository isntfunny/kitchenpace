'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/atoms/Button';
import { SmartImage } from '@/components/atoms/SmartImage';
import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface Author {
    id: string;
    name: string | null;
    bio: string | null;
    avatar: string | null;
    recipeCount: number;
}

interface AuthorCardProps {
    author: Author;
    isFollowing: boolean;
    followerCount: number;
    isFollowPending: boolean;
    isOwnProfile: boolean;
    onFollowToggle: () => void;
}

export function AuthorCard({
    author,
    isFollowing,
    followerCount,
    isFollowPending,
    isOwnProfile,
    onFollowToggle,
}: AuthorCardProps) {
    return (
        <div className={css({ mt: '8' })}>
            <h2
                className={css({
                    fontFamily: 'heading',
                    fontSize: 'xl',
                    fontWeight: '600',
                    mb: '4',
                })}
            >
                Über den Autor
            </h2>
            <div
                className={css({
                    bg: 'white',
                    borderRadius: '2xl',
                    p: '5',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                })}
            >
                <div
                    className={flex({
                        gap: '6',
                        align: 'flex-start',
                        direction: { base: 'column', sm: 'row' },
                    })}
                >
                    <Link href={`/user/${author.id}`}>
                        <div
                            className={css({
                                position: 'relative',
                                width: '80px',
                                height: '80px',
                                borderRadius: 'full',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                _hover: { opacity: 0.9 },
                            })}
                        >
                            <SmartImage
                                src={author.avatar ?? '/placeholder.jpg'}
                                alt={author.name ?? 'Autor'}
                                fill
                                sizes="80px"
                                className={css({ objectFit: 'cover' })}
                            />
                        </div>
                    </Link>

                    <div className={css({ flex: 1 })}>
                        <div
                            className={flex({
                                justify: 'space-between',
                                align: 'flex-start',
                                wrap: 'wrap',
                                gap: '4',
                            })}
                        >
                            <div>
                                <Link href={`/user/${author.id}`}>
                                    <h3
                                        className={css({
                                            fontFamily: 'heading',
                                            fontSize: 'xl',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            _hover: { color: 'primary' },
                                        })}
                                    >
                                        {author.name}
                                    </h3>
                                </Link>
                                <p
                                    className={css({
                                        fontFamily: 'body',
                                        color: 'text-muted',
                                        mt: '2',
                                        maxW: '600px',
                                    })}
                                >
                                    {author.bio}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant={isFollowing ? 'secondary' : 'primary'}
                                size="sm"
                                onClick={onFollowToggle}
                                disabled={isFollowPending || isOwnProfile}
                            >
                                {isFollowing ? (
                                    <span
                                        className={css({
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '1',
                                        })}
                                    >
                                        <Check size={14} />
                                        Folgst du
                                    </span>
                                ) : (
                                    '+ Folgen'
                                )}
                            </Button>
                        </div>

                        <div className={flex({ gap: '6', mt: '4' })}>
                            <div className={css({ textAlign: 'center' })}>
                                <div
                                    className={css({
                                        fontFamily: 'heading',
                                        fontWeight: '600',
                                        fontSize: 'lg',
                                    })}
                                >
                                    {author.recipeCount}
                                </div>
                                <div
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'text-muted',
                                        fontFamily: 'body',
                                    })}
                                >
                                    Rezepte
                                </div>
                            </div>
                            <div className={css({ textAlign: 'center' })}>
                                <div
                                    className={css({
                                        fontFamily: 'heading',
                                        fontWeight: '600',
                                        fontSize: 'lg',
                                    })}
                                >
                                    {followerCount.toLocaleString('de-DE')}
                                </div>
                                <div
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'text-muted',
                                        fontFamily: 'body',
                                    })}
                                >
                                    Follower
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
