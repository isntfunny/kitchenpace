'use client';

import { Bookmark, ChefHat, CheckCircle, Heart, Printer } from 'lucide-react';

import { Button } from '@/components/atoms/Button';
import { css } from 'styled-system/css';

interface RecipeActionButtonsProps {
    isFavorite: boolean;
    favoriteCount: number;
    hasCooked: boolean;
    cookCount: number;
    isFavoritePending: boolean;
    isCookPending: boolean;
    onFavoriteToggle: () => void;
    onCookToggle: () => void;
    onPrint: () => void;
}

export function RecipeActionButtons({
    isFavorite,
    favoriteCount,
    hasCooked,
    cookCount,
    isFavoritePending,
    isCookPending,
    onFavoriteToggle,
    onCookToggle,
    onPrint,
}: RecipeActionButtonsProps) {
    return (
        <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap', alignItems: 'center' })}>
            <Button
                type="button"
                variant={isFavorite ? 'secondary' : 'primary'}
                onClick={onFavoriteToggle}
                disabled={isFavoritePending}
            >
                {isFavorite ? (
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        })}
                    >
                        <Heart size={16} />
                        Favorit
                    </span>
                ) : (
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        })}
                    >
                        <Bookmark size={16} />
                        Speichern
                    </span>
                )}{' '}
                · {favoriteCount}
            </Button>
            <Button
                type="button"
                variant={hasCooked ? 'secondary' : 'primary'}
                onClick={onCookToggle}
                disabled={isCookPending}
            >
                {hasCooked ? (
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        })}
                    >
                        <CheckCircle size={16} />
                        Gekocht
                    </span>
                ) : (
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        })}
                    >
                        <ChefHat size={16} />
                        Gekocht
                    </span>
                )}{' '}
                · {cookCount}
            </Button>
            <Button type="button" variant="ghost" onClick={onPrint}>
                <span
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                    })}
                >
                    <Printer size={16} />
                    Drucken
                </span>
            </Button>
        </div>
    );
}
