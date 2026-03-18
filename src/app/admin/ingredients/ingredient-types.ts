// ---------------------------------------------------------------------------
// Shared types and styles for the ingredients admin table
// ---------------------------------------------------------------------------

import { css } from 'styled-system/css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Ingredient = {
    id: string;
    name: string;
    slug: string;
    pluralName: string | null;
    categories: Array<{ id: string; name: string; slug: string }>;
    ingredientUnits: Array<{
        grams: number | null;
        unit: { id: string; shortName: string; longName: string };
    }>;
    aliases: string[];
    needsReview: boolean;
    energyKcal: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
    saturatedFat: number | null;
    recipeCount: number;
};

export type IngredientCategory = {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    _count: { ingredients: number };
};

export type Unit = {
    id: string;
    shortName: string;
    longName: string;
    gramsDefault: number | null;
    _count: { ingredients: number };
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

export const overlayStyle = css({
    position: 'fixed',
    inset: '0',
    bg: 'surface.overlay',
    zIndex: '50',
    animation: 'fadeIn 0.15s ease-out',
});

const dialogBaseStyle = {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bg: 'surface',
    borderRadius: 'xl',
    width: '90vw',
    zIndex: '51',
    boxShadow: 'shadow.large',
    animation: 'slideUp 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column' as const,
};

export const dialogContentStyle = css({
    ...dialogBaseStyle,
    maxWidth: '680px',
    maxHeight: '85vh',
});

export const dialogContentSmallStyle = css({
    ...dialogBaseStyle,
    maxWidth: '420px',
    maxHeight: '85vh',
});

export const inputStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
    transition: 'all 0.15s',
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.12)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
});

export const inputSmallStyle = css({
    width: '100%',
    paddingX: '2.5',
    paddingY: '1.5',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
    transition: 'all 0.15s',
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.12)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
});

export const btnPrimary = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    bg: 'brand.primary',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: { bg: 'button.primary-hover' },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

export const btnSecondary = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    bg: 'transparent',
    color: 'foreground',
    fontSize: 'sm',
    fontWeight: '500',
    border: '1px solid',
    borderColor: 'border',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: { bg: 'button.secondary-hover' },
});

export const btnDanger = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    bg: 'transparent',
    color: 'status.danger',
    fontSize: 'sm',
    fontWeight: '600',
    border: '1px solid',
    borderColor: 'status.danger',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: {
        bg: 'error.bg',
    },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

export const pillStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    paddingX: '2',
    paddingY: '0.5',
    borderRadius: 'full',
    fontSize: 'xs',
    fontWeight: '500',
    bg: 'accent.soft',
    color: 'foreground',
    whiteSpace: 'nowrap',
});

export const tagStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    paddingX: '2.5',
    paddingY: '1',
    borderRadius: 'full',
    fontSize: 'xs',
    bg: 'surface.elevated',
    border: '1px solid',
    borderColor: 'border',
    color: 'foreground',
});

export const sectionLabelStyle = css({
    fontSize: 'xs',
    fontWeight: '700',
    color: 'foreground.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '2.5',
});

export const thStyle = css({
    padding: '3',
    paddingX: '4',
    textAlign: 'left',
    fontSize: 'xs',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'foreground.muted',
    bg: 'surface',
    position: 'sticky',
    top: '0',
    zIndex: '1',
});

export const closeButtonStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '8',
    height: '8',
    borderRadius: 'lg',
    border: 'none',
    bg: 'transparent',
    cursor: 'pointer',
    color: 'foreground.muted',
    transition: 'all 0.15s',
    _hover: {
        bg: 'button.secondary-hover',
        color: 'foreground',
    },
});

export const inputStyleObj = {
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
} as const;
