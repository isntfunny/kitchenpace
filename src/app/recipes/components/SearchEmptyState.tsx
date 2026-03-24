import { UtensilsCrossed } from 'lucide-react';

import { css } from 'styled-system/css';

type SearchEmptyStateProps = {
    hasFilters: boolean;
    onReset: () => void;
};

export function SearchEmptyState({ hasFilters, onReset }: SearchEmptyStateProps) {
    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                py: '8',
                px: '6',
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
                    bg: {
                        base: 'rgba(224,123,83,0.1)',
                        _dark: 'rgba(224,123,83,0.15)',
                    },
                    color: 'brand.primary',
                })}
            >
                <UtensilsCrossed size={28} />
            </div>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                <p className={css({ fontSize: 'md', fontWeight: '700', color: 'text' })}>
                    Keine Rezepte gefunden
                </p>
                <p
                    className={css({
                        fontSize: 'sm',
                        color: 'text-muted',
                        maxWidth: '300px',
                        lineHeight: '1.6',
                    })}
                >
                    Mit den aktuellen Filtern gibt es leider keine Treffer. Versuche weniger Filter
                    oder eine andere Suche.
                </p>
            </div>
            {hasFilters && (
                <button
                    type="button"
                    onClick={onReset}
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'white',
                        bg: 'brand.primary',
                        border: 'none',
                        borderRadius: 'lg',
                        px: '4',
                        py: '2',
                        cursor: 'pointer',
                        transition: 'opacity 150ms ease',
                        _hover: { opacity: '0.85' },
                    })}
                >
                    Filter zurücksetzen
                </button>
            )}
        </div>
    );
}
