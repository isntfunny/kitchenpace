import { css } from 'styled-system/css';

export const previewCardsClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '3',
    mb: '6',
});

export const previewCardClass = css({
    p: '4',
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
});

export const previewCardLabelClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    mb: '1',
});

export const previewCardValueClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    fontSize: 'md',
    fontWeight: '700',
    color: 'text',
});

export const cardIconClass = css({
    color: 'palette.orange',
});

export const imagePreviewClass = css({
    mb: '6',
    p: '4',
    backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' },
    borderRadius: 'lg',
});

export const imagePreviewHeaderClass = css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: '3',
});

export const imageRemoveButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    px: '2',
    py: '1',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text.dimmed',
    backgroundColor: 'transparent',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: {
        color: { base: 'red.600', _dark: 'red.400' },
        borderColor: { base: 'red.300', _dark: 'red.700' },
        backgroundColor: { base: 'red.50', _dark: 'rgba(239,68,68,0.1)' },
    },
});

export const imagePreviewImgClass = css({
    width: '100%',
    maxHeight: '240px',
    objectFit: 'cover',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: 'border',
});

export const ingredientsPreviewClass = css({
    mb: '6',
    p: '4',
    backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' },
    borderRadius: 'lg',
});

export const ingredientsPreviewTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    mb: '3',
});

export const ingredientsListClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
});

export const ingredientTagClass = css({
    display: 'inline-flex',
    px: '2',
    py: '1',
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
});

export const ingredientTagNewClass = css({
    display: 'inline-flex',
    px: '2',
    py: '1',
    backgroundColor: { base: 'rgba(234,179,8,0.1)', _dark: 'rgba(234,179,8,0.15)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text',
    border: '1px solid',
    borderColor: { base: 'rgba(234,179,8,0.3)', _dark: 'rgba(234,179,8,0.4)' },
});

export const ingredientMatchArrowClass = css({
    color: { base: 'rgba(0,0,0,0.35)', _dark: 'rgba(255,255,255,0.35)' },
    mx: '0.5',
    fontSize: '2xs',
});

export const ingredientNewBadgeClass = css({
    ml: '1',
    px: '1',
    py: '0',
    borderRadius: 'xs',
    fontSize: '2xs',
    fontWeight: '700',
    color: { base: 'rgba(161,98,7,1)', _dark: 'rgba(250,204,21,1)' },
    backgroundColor: { base: 'rgba(234,179,8,0.15)', _dark: 'rgba(234,179,8,0.2)' },
});

export const moreTagClass = css({
    display: 'inline-flex',
    px: '2',
    py: '1',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'palette.orange',
});

export const previewActionsClass = css({
    display: 'flex',
    gap: '3',
    justifyContent: 'flex-end',
});
