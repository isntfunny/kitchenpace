import { ICONOVEN_BODIES, ICONOVEN_VIEWBOX } from '@app/lib/icons/iconoven-food';
import {
    resolveFreeTextIcon,
    resolveIngredientIcon,
    type IconIngredient,
} from '@shared/ingredient-icons/resolve';

import { css } from 'styled-system/css';

export interface IngredientIconProps {
    /** Stored icon name; takes precedence over the ingredient's own and its categories' icons */
    icon?: string | null;
    /** Ingredient with its categories (and their parents) for the fallback chain */
    ingredient?: IconIngredient | null;
    /** Free-text item without an ingredient ("Spülmittel"): household icon by keyword */
    text?: string;
    /** Edge length in px (or any CSS length) */
    size?: number | string;
    /** Accessible name; the icon is decorative (aria-hidden) without it */
    label?: string;
}

const iconClass = css({ display: 'inline-block', flexShrink: 0, color: 'inherit' });

/**
 * IconOven icon of an ingredient, drawn inline in `currentColor` from the
 * bundled subset: nothing is fetched at runtime. Always renders an icon: the
 * ingredient's, its category's, else a neutral food icon.
 */
export function IngredientIcon({ icon, ingredient, text, size = 24, label }: IngredientIconProps) {
    const name =
        text !== undefined
            ? resolveFreeTextIcon(text)
            : resolveIngredientIcon({ ...ingredient, icon: icon ?? ingredient?.icon });
    return (
        <svg
            className={iconClass}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${ICONOVEN_VIEWBOX} ${ICONOVEN_VIEWBOX}`}
            width={size}
            height={size}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            data-icon={name}
            // Static markup from the generated allowlist, never user input
            dangerouslySetInnerHTML={{ __html: ICONOVEN_BODIES[name] }}
        />
    );
}
