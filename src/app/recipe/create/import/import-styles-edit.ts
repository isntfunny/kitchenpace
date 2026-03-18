import { css } from 'styled-system/css';

export const editContainerClass = css({
    maxWidth: '900px',
    mx: 'auto',
    px: '6',
    py: '8',
});

export const editHeaderClass = css({
    mb: '6',
});

export const backButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    px: '3',
    py: '1.5',
    borderRadius: 'lg',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    mb: '4',
    _hover: {
        backgroundColor: 'surface.muted',
        color: 'text',
    },
});

export const rotate180Class = css({
    width: '14px',
    height: '14px',
    transform: 'rotate(180deg)',
});

export const editTitleClass = css({
    fontSize: '2xl',
    fontWeight: '800',
    color: 'text',
    mb: '1',
});

export const editSubtitleClass = css({
    fontSize: 'md',
    color: 'text.muted',
});

export const editFormClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    overflow: 'hidden',
});

export const formSectionClass = css({
    p: '6',
});

export const formDividerClass = css({
    height: '1px',
    backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.12)' },
});

export const flowNoteClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    mx: '6',
    my: '4',
    p: '4',
    backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' },
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
});

export const flowNoteIconClass = css({
    width: '20px',
    height: '20px',
    color: 'palette.orange',
    flexShrink: 0,
    mt: '0.5',
});

export const editActionsClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: '6',
    borderTop: '1px solid',
    borderTopColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    backgroundColor: { base: 'rgba(224,123,83,0.02)', _dark: 'rgba(224,123,83,0.04)' },
});

export const saveButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '6',
    py: '3',
    borderRadius: 'xl',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'md',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    _disabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

export const spinningIconSmallClass = css({
    width: '16px',
    height: '16px',
    animation: 'spin 1s linear infinite',
});
