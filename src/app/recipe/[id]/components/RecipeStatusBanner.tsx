'use client';

import { css } from 'styled-system/css';

type RecipeStatusBannerProps = {
    recipeId: string;
    isDraft: boolean;
    isAuthor: boolean;
    moderationStatus?: string;
    moderationNote?: string | null;
};

export function RecipeStatusBanner({
    recipeId,
    isDraft,
    isAuthor,
    moderationStatus,
    moderationNote,
}: RecipeStatusBannerProps) {
    if (isDraft) {
        return (
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3',
                    px: '4',
                    py: '3',
                    backgroundColor: {
                        base: 'rgba(224,123,83,0.15)',
                        _dark: 'rgba(224,123,83,0.2)',
                    },
                    borderBottom: {
                        base: '2px solid rgba(224,123,83,0.4)',
                        _dark: '2px solid rgba(224,123,83,0.45)',
                    },
                    fontSize: 'sm',
                    color: 'brand.primary',
                    fontWeight: '600',
                })}
            >
                <span
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: '2.5',
                        py: '1',
                        borderRadius: 'full',
                        fontSize: 'xs',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        backgroundColor: 'brand.primary',
                        color: 'white',
                        flexShrink: '0',
                    })}
                >
                    Entwurf
                </span>
                Dieses Rezept ist noch nicht veröffentlicht — nur du kannst es sehen.
                <a
                    href={`/recipe/${recipeId}/edit`}
                    className={css({
                        fontWeight: '700',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        flexShrink: '0',
                        _hover: { opacity: '0.75' },
                    })}
                >
                    Jetzt bearbeiten →
                </a>
            </div>
        );
    }

    if (!isAuthor || moderationStatus == null) {
        return null;
    }

    if (moderationStatus === 'PENDING') {
        return (
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3',
                    px: '4',
                    py: '2.5',
                    backgroundColor: {
                        base: 'rgba(217,173,54,0.1)',
                        _dark: 'rgba(217,173,54,0.15)',
                    },
                    borderBottom: {
                        base: '1px solid rgba(217,173,54,0.25)',
                        _dark: '1px solid rgba(217,173,54,0.3)',
                    },
                    fontSize: 'sm',
                    color: { base: '#b8860b', _dark: '#ffc94d' },
                    fontWeight: '500',
                })}
            >
                <span
                    className={css({
                        display: 'inline-block',
                        px: '2',
                        py: '0.5',
                        borderRadius: 'full',
                        fontSize: 'xs',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        backgroundColor: { base: '#b8860b', _dark: '#d4a017' },
                        color: 'white',
                    })}
                >
                    Wird überprüft
                </span>
                Dein Rezept wird gerade überprüft und ist noch nicht öffentlich sichtbar. Das dauert
                in der Regel weniger als 24 Stunden.
            </div>
        );
    }

    if (moderationStatus === 'REJECTED') {
        return (
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3',
                    px: '4',
                    py: '2.5',
                    backgroundColor: 'rgba(220,38,38,0.08)',
                    borderBottom: '1px solid rgba(220,38,38,0.2)',
                    fontSize: 'sm',
                    color: 'status.danger',
                    fontWeight: '500',
                })}
            >
                <span
                    className={css({
                        display: 'inline-block',
                        px: '2',
                        py: '0.5',
                        borderRadius: 'full',
                        fontSize: 'xs',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        backgroundColor: 'status.danger',
                        color: 'white',
                    })}
                >
                    Abgelehnt
                </span>
                {moderationNote
                    ? `Dein Rezept wurde abgelehnt: ${moderationNote}. Du kannst es überarbeiten und erneut einreichen.`
                    : 'Dein Rezept wurde abgelehnt. Du kannst es überarbeiten und erneut einreichen.'}
                <a
                    href={`/recipe/${recipeId}/edit`}
                    className={css({
                        fontWeight: '600',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                        _hover: { opacity: '0.75' },
                    })}
                >
                    Überarbeiten
                </a>
            </div>
        );
    }

    return null;
}
