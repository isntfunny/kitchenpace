import { css } from 'styled-system/css';

// ── Review ───────────────────────────────────────────────────────────────────

export const reviewProgressClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: '6',
    gap: '4',
});

export const reviewCounterClass = css({
    fontSize: 'sm',
    fontWeight: '700',
    color: 'text',
    whiteSpace: 'nowrap',
});

export const reviewProgressDotsClass = css({
    display: 'flex',
    gap: '4px',
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
});

export const reviewDotClass = (state: 'saved' | 'skipped' | 'current' | 'pending') =>
    css({
        width: '10px',
        height: '10px',
        borderRadius: 'full',
        backgroundColor:
            state === 'saved'
                ? 'status.success'
                : state === 'skipped'
                  ? 'text.dimmed'
                  : state === 'current'
                    ? 'palette.orange'
                    : { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.15)' },
        transition: 'all 0.2s ease',
    });

export const skipAllButtonClass = css({
    fontSize: 'xs',
    color: 'text.dimmed',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    _hover: { color: 'text.muted' },
});

export const reviewCardClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    overflow: 'hidden',
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
    mb: '6',
});

export const reviewSourceClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    px: '5',
    py: '3',
    backgroundColor: { base: 'rgba(0,0,0,0.02)', _dark: 'rgba(255,255,255,0.03)' },
    borderBottom: '1px solid',
    borderColor: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.06)' },
    fontSize: 'xs',
    color: 'text.dimmed',
});

export const reviewSourceLinkClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    color: 'text.muted',
    textDecoration: 'none',
    _hover: { color: 'palette.orange' },
});

export const reviewImageWrapperClass = css({
    position: 'relative',
    maxHeight: '200px',
    overflow: 'hidden',
});

export const reviewImageClass = css({
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
});

export const imageRemoveBtnClass = css({
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '32px',
    height: '32px',
    borderRadius: 'full',
    backgroundColor: 'rgba(0,0,0,0.6)',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    _hover: { backgroundColor: 'rgba(0,0,0,0.8)' },
});

export const reviewFieldClass = css({
    px: '5',
    pt: '4',
    pb: '2',
});

export const reviewFieldSmallClass = css({
    flex: 1,
});

export const reviewFieldLabelClass = css({
    display: 'block',
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    mb: '1.5',
});

export const reviewInputClass = css({
    width: '100%',
    px: '3',
    py: '2',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
    fontSize: 'lg',
    fontWeight: '700',
    outline: 'none',
    bg: 'transparent',
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.1)',
            _dark: '0 0 0 3px rgba(224,123,83,0.08)',
        },
    },
});

export const reviewInputSmallClass = css({
    width: '100%',
    px: '3',
    py: '2',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
    fontSize: 'sm',
    outline: 'none',
    bg: 'transparent',
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
    },
});

export const reviewSelectClass = css({
    width: '100%',
    px: '3',
    py: '2',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
    fontSize: 'sm',
    outline: 'none',
    bg: { base: 'white', _dark: 'surface' },
    color: 'text',
    cursor: 'pointer',
    _focus: {
        borderColor: 'palette.orange',
    },
});

export const reviewStatsRowClass = css({
    display: 'flex',
    gap: '4',
    px: '5',
    py: '3',
});

export const reviewStatClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    fontSize: 'sm',
    color: 'text.muted',
    fontWeight: '500',
});

export const reviewSettingsRowClass = css({
    display: 'flex',
    gap: '4',
    px: '5',
    pb: '4',
});

export const reviewIngredientsClass = css({
    px: '5',
    pb: '4',
});

export const reviewIngredientTagsClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    mt: '1',
});

export const ingredientChipClass = css({
    display: 'inline-flex',
    px: '2',
    py: '0.5',
    backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.12)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text',
});

export const moreChipClass = css({
    display: 'inline-flex',
    px: '2',
    py: '0.5',
    backgroundColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'palette.orange',
});

export const reviewTagsClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    px: '5',
    pb: '4',
});

export const tagChipClass = css({
    display: 'inline-flex',
    px: '2',
    py: '0.5',
    backgroundColor: { base: 'rgba(168,85,247,0.08)', _dark: 'rgba(168,85,247,0.12)' },
    borderRadius: 'md',
    fontSize: 'xs',
    color: { base: 'purple.700', _dark: 'purple.300' },
});

export const reviewActionsClass = css({
    display: 'flex',
    gap: '3',
    justifyContent: 'flex-end',
});

export const skipButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '5',
    py: '3',
    borderRadius: 'xl',
    border: '1.5px solid',
    borderColor: { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.12)' },
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'md',
    fontWeight: '600',
    cursor: 'pointer',
    _hover: {
        borderColor: { base: 'rgba(0,0,0,0.2)', _dark: 'rgba(255,255,255,0.2)' },
        color: 'text',
    },
});

// ── Done ─────────────────────────────────────────────────────────────────────

export const summaryGridClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '3',
    mb: '6',
});

export const summaryCardClass = (type: 'success' | 'skip' | 'error') =>
    css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1',
        p: '4',
        borderRadius: 'lg',
        backgroundColor:
            type === 'success'
                ? { base: 'rgba(34,197,94,0.06)', _dark: 'rgba(34,197,94,0.1)' }
                : type === 'skip'
                  ? { base: 'rgba(0,0,0,0.03)', _dark: 'rgba(255,255,255,0.05)' }
                  : { base: 'rgba(239,68,68,0.06)', _dark: 'rgba(239,68,68,0.1)' },
        color:
            type === 'success'
                ? 'status.success'
                : type === 'skip'
                  ? 'text.dimmed'
                  : 'status.error',
        border: '1px solid',
        borderColor:
            type === 'success'
                ? { base: 'rgba(34,197,94,0.15)', _dark: 'rgba(34,197,94,0.2)' }
                : type === 'skip'
                  ? { base: 'rgba(0,0,0,0.06)', _dark: 'rgba(255,255,255,0.08)' }
                  : { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.2)' },
    });

export const summaryCardCountClass = css({
    fontSize: '2xl',
    fontWeight: '800',
});

export const summaryCardLabelClass = css({
    fontSize: 'xs',
    fontWeight: '500',
});

export const savedListClass = css({
    mb: '4',
});

export const savedListTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    mb: '2',
});

export const savedItemClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    p: '3',
    borderRadius: 'lg',
    backgroundColor: { base: 'white', _dark: 'surface' },
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    textDecoration: 'none',
    color: 'text',
    mb: '2',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 2px 12px rgba(224,123,83,0.1)',
            _dark: '0 2px 12px rgba(224,123,83,0.08)',
        },
    },
});

export const savedItemTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    flex: 1,
});

export const failedListClass = css({
    mb: '6',
});

export const failedItemClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '2',
    p: '3',
    borderRadius: 'lg',
    backgroundColor: { base: 'rgba(239,68,68,0.04)', _dark: 'rgba(239,68,68,0.06)' },
    mb: '2',
});

export const doneActionsClass = css({
    display: 'flex',
    gap: '3',
    justifyContent: 'flex-end',
});
