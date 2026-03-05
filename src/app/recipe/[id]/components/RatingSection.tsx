'use client';

import { Star } from 'lucide-react';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

interface RatingSectionProps {
    averageRating: number;
    ratingCount: number;
    viewerRating: number | null;
    onRatingSelect: (value: number) => void;
    isPending: boolean;
}

export function RatingSection({
    averageRating,
    ratingCount,
    viewerRating,
    onRatingSelect,
    isPending,
}: RatingSectionProps) {
    const starValues = [1, 2, 3, 4, 5] as const;
    const activeStarValue = viewerRating ?? Math.round(averageRating || 0);
    const ratingLabel = ratingCount === 1 ? 'Bewertung' : 'Bewertungen';

    return (
        <div
            className={css({
                mb: '4',
                borderRadius: 'xl',
                p: '4',
                bg: 'linear-gradient(135deg, rgba(224,123,83,0.08), rgba(255,246,236,0.9))',
                border: '1px solid',
                borderColor: 'rgba(224,123,83,0.2)',
                boxShadow: '0 8px 30px rgba(224,123,83,0.12)',
            })}
        >
            <div
                className={flex({
                    align: 'center',
                    gap: { base: '3', md: '4' },
                    flexWrap: 'wrap',
                    mb: '3',
                })}
            >
                <div
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2',
                        fontSize: { base: '3xl', md: '4xl' },
                        fontFamily: 'heading',
                        fontWeight: '700',
                        color: 'primary',
                    })}
                >
                    <span>{averageRating.toFixed(1)}</span>
                    <Star size={28} className={css({ color: '#f8b500' })} />
                </div>
                <div
                    className={css({
                        fontFamily: 'body',
                        color: 'text-muted',
                    })}
                >
                    {ratingCount} {ratingLabel}
                </div>
            </div>
            <div
                className={flex({
                    gap: '2',
                    align: 'center',
                    flexWrap: 'wrap',
                })}
            >
                {starValues.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onRatingSelect(value)}
                        disabled={isPending}
                        className={css({
                            width: '48px',
                            height: '48px',
                            borderRadius: 'full',
                            border: 'none',
                            background:
                                value <= activeStarValue
                                    ? 'rgba(224,123,83,0.9)'
                                    : 'rgba(255,255,255,0.6)',
                            color: value <= activeStarValue ? 'white' : 'rgba(224,123,83,0.7)',
                            fontSize: 'lg',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            boxShadow:
                                value <= activeStarValue
                                    ? '0 6px 16px rgba(224,123,83,0.35)'
                                    : 'inset 0 0 0 1px rgba(224,123,83,0.2)',
                            _hover: {
                                transform: 'translateY(-1px)',
                            },
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        })}
                    >
                        <Star
                            size={22}
                            className={css({
                                color: value <= activeStarValue ? 'white' : 'rgba(224,123,83,0.9)',
                            })}
                        />
                    </button>
                ))}
                <span
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        fontFamily: 'body',
                        ml: { base: 0, md: '3' },
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1',
                    })}
                >
                    {viewerRating ? (
                        <>
                            Deine Bewertung: {viewerRating.toFixed(1)}
                            <Star size={14} className={css({ color: '#f8b500' })} />
                        </>
                    ) : (
                        'Jetzt bewerten und Feedback geben'
                    )}
                </span>
            </div>
        </div>
    );
}
