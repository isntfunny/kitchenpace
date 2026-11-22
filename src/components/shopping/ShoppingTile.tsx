'use client';

import { ChefHat, MoreHorizontal, X } from 'lucide-react';
import { useRef, type PointerEvent } from 'react';

import { IngredientIcon } from '@app/components/ingredients/IngredientIcon';
import {
    itemQuantityLabel,
    originBadges,
    relativeDays,
    type ShoppingItemView,
} from '@app/lib/shopping/list-view';

import { css, cx } from 'styled-system/css';

const LONG_PRESS_MS = 450;
const MAX_BADGES = 3;

const wrap = css({ position: 'relative', aspectRatio: '1', minW: 0 });

const tileBase = css({
    position: 'absolute',
    inset: '0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1',
    px: '2',
    pb: '2',
    pt: '5',
    textAlign: 'center',
    borderRadius: '2xl',
    border: '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'body',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
    userSelect: 'none',
    WebkitTouchCallout: 'none',
    _active: { transform: 'scale(0.97)' },
    _focusVisible: { outline: '3px solid', outlineColor: 'foreground', outlineOffset: '2px' },
});
const tileOpen = css({
    bg: 'primary',
    color: 'white',
    boxShadow: '0 6px 16px rgba(224, 123, 83, 0.28)',
    _hover: { boxShadow: '0 8px 20px rgba(224, 123, 83, 0.38)' },
});
const tileDone = css({
    bg: 'surface',
    color: 'foreground',
    borderColor: 'border',
});
const tileSuggestion = css({
    bg: 'transparent',
    color: 'foreground',
    borderStyle: 'dashed',
    borderColor: 'primary',
    _hover: { bg: 'accent.soft' },
});

const iconBox = css({ display: 'inline-flex', lineHeight: '1' });
const iconDone = css({ color: 'foreground.muted', opacity: 0.85 });
const iconSuggestion = css({ color: 'primary' });

const nameStyle = css({
    fontWeight: '600',
    fontSize: '13px',
    lineHeight: '1.25',
    maxW: '100%',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    lineClamp: '2',
});
const qtyStyle = css({ fontSize: 'xs', opacity: 0.9, minH: '4' });
const qtyMuted = css({ color: 'foreground.muted', opacity: 1 });
const qtyAccent = css({ color: 'primary', fontWeight: '600', opacity: 1 });

const badges = css({
    position: 'absolute',
    top: '2',
    left: '2',
    display: 'flex',
    gap: '0.5',
    pointerEvents: 'none',
});
const badge = css({
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: '700',
    lineHeight: '1',
    bg: 'rgba(255, 255, 255, 0.28)',
    color: 'white',
    borderRadius: 'md',
    px: '1',
    py: '0.5',
});

const cornerButton = css({
    position: 'absolute',
    top: '1',
    right: '1',
    w: '7',
    h: '7',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    border: 'none',
    bg: 'transparent',
    cursor: 'pointer',
    opacity: { base: 0.9, md: 0 },
    transition: 'opacity 120ms ease, background 120ms ease',
    _focusVisible: { opacity: 1, outline: '2px solid', outlineColor: 'foreground' },
});
const cornerOpen = css({ color: 'white', _hover: { bg: 'rgba(255, 255, 255, 0.25)' } });
const cornerDone = css({ color: 'foreground.muted', _hover: { bg: 'surface.muted' } });
const showOnHover = css({
    '&:hover > button[data-corner], &:focus-within > button[data-corner]': { opacity: 1 },
});

export type TileVariant = 'open' | 'done' | 'suggestion';

/**
 * One tile of the shopping list. Open: tap = bought, long press or "…" = details.
 * Done: tap brings it back. Suggestion: tap adds it, "×" = not now.
 */
export function ShoppingTile({
    variant,
    item,
    name,
    quantityText,
    icon,
    onActivate,
    onDetails,
    onDismiss,
    now,
}: {
    variant: TileVariant;
    item?: ShoppingItemView;
    /** For suggestions (no item) */
    name?: string;
    quantityText?: string;
    icon?: ShoppingItemView['icon'];
    onActivate: () => void;
    onDetails?: () => void;
    onDismiss?: () => void;
    now?: Date;
}) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressed = useRef(false);

    const title = item?.name ?? name ?? '';
    const iconName = item?.icon ?? icon;
    const quantity =
        variant === 'done' && item
            ? relativeDays(item.statusChangedAt, now ?? new Date())
            : item
              ? itemQuantityLabel(item)
              : (quantityText ?? '');
    const origins = variant === 'open' && item ? originBadges(item.sources) : [];

    const clear = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    };
    const start = (event: PointerEvent) => {
        if (variant !== 'open' || !onDetails || event.button > 0) return;
        longPressed.current = false;
        clear();
        timer.current = setTimeout(() => {
            longPressed.current = true;
            onDetails();
        }, LONG_PRESS_MS);
    };

    const label =
        variant === 'open'
            ? `${title}${quantity ? `, ${quantity}` : ''} – als gekauft markieren`
            : variant === 'done'
              ? `${title} – zurück auf die Liste`
              : `${title} vorschlagen – zur Liste hinzufügen`;

    return (
        <div className={cx(wrap, showOnHover)} role="listitem">
            <button
                type="button"
                aria-label={label}
                title={origins.length ? origins.map((o) => o.title).join(' · ') : undefined}
                className={cx(
                    tileBase,
                    variant === 'open' && tileOpen,
                    variant === 'done' && tileDone,
                    variant === 'suggestion' && tileSuggestion,
                )}
                onPointerDown={start}
                onPointerUp={clear}
                onPointerLeave={clear}
                onPointerCancel={clear}
                onContextMenu={(event) => {
                    if (variant === 'open' && onDetails) event.preventDefault();
                }}
                onClick={() => {
                    if (longPressed.current) {
                        longPressed.current = false;
                        return;
                    }
                    onActivate();
                }}
            >
                {origins.length > 0 && (
                    <span className={badges} aria-hidden="true">
                        {origins.slice(0, MAX_BADGES).map((origin) => (
                            <i key={origin.key} className={badge} style={{ fontStyle: 'normal' }}>
                                {origin.kind === 'recipe' ? <ChefHat size={9} /> : origin.label}
                            </i>
                        ))}
                        {origins.length > MAX_BADGES && (
                            <i className={badge} style={{ fontStyle: 'normal' }}>
                                +{origins.length - MAX_BADGES}
                            </i>
                        )}
                    </span>
                )}
                <span
                    className={cx(
                        iconBox,
                        variant === 'done' && iconDone,
                        variant === 'suggestion' && iconSuggestion,
                    )}
                >
                    <IngredientIcon icon={iconName} size={34} />
                </span>
                <span className={nameStyle}>{title}</span>
                <span
                    className={cx(
                        qtyStyle,
                        variant === 'done' && qtyMuted,
                        variant === 'suggestion' && qtyAccent,
                    )}
                >
                    {quantity || ' '}
                </span>
            </button>

            {variant === 'open' && onDetails && (
                <button
                    type="button"
                    data-corner
                    aria-label={`Details zu ${title}`}
                    className={cx(cornerButton, cornerOpen)}
                    onClick={onDetails}
                >
                    <MoreHorizontal size={18} aria-hidden="true" />
                </button>
            )}
            {variant === 'suggestion' && onDismiss && (
                <button
                    type="button"
                    data-corner
                    aria-label={`${title} nicht mehr vorschlagen`}
                    title="Nicht jetzt"
                    className={cx(cornerButton, cornerDone)}
                    onClick={onDismiss}
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
