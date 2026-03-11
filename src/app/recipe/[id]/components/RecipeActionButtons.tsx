'use client';

import { ChefHat, CheckCircle, Heart, Printer } from 'lucide-react';

import { Button } from '@app/components/atoms/Button';
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

const activeButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    px: '4',
    py: '2',
    fontSize: 'md',
    fontWeight: '500',
    fontFamily: 'body',
    borderRadius: 'md',
    cursor: 'pointer',
    transition: 'all 150ms ease-in-out',
    border: '2px solid',
    borderColor: 'brand.primary',
    color: 'brand.primary',
    bg: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.15)' },
    _hover: { bg: { base: 'rgba(224,123,83,0.14)', _dark: 'rgba(224,123,83,0.22)' } },
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
});

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
            {isFavorite ? (
                <button
                    type="button"
                    className={activeButtonClass}
                    onClick={onFavoriteToggle}
                    disabled={isFavoritePending}
                >
                    <Heart size={16} fill="currentColor" />
                    Favorit · {favoriteCount}
                </button>
            ) : (
                <Button
                    type="button"
                    variant="primary"
                    onClick={onFavoriteToggle}
                    disabled={isFavoritePending}
                >
                    <Heart size={16} />
                    Favorit · {favoriteCount}
                </Button>
            )}
            {hasCooked ? (
                <button
                    type="button"
                    className={activeButtonClass}
                    onClick={onCookToggle}
                    disabled={isCookPending}
                >
                    <CheckCircle size={16} />
                    Zubereitet · {cookCount}
                </button>
            ) : (
                <Button
                    type="button"
                    variant="primary"
                    onClick={onCookToggle}
                    disabled={isCookPending}
                >
                    <ChefHat size={16} />
                    Zubereitet · {cookCount}
                </Button>
            )}
            <Button type="button" variant="ghost" onClick={onPrint}>
                <Printer size={16} />
                Drucken
            </Button>
        </div>
    );
}
