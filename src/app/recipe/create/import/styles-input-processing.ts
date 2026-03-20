import { css } from 'styled-system/css';

import type { UrlStatus } from './bulk-import-types';

// ── URL Input ────────────────────────────────────────────────────────────────

export const formCardClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    p: '6',
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
});

export const textareaClass = css({
    width: '100%',
    mt: '2',
    px: '4',
    py: '3',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
    fontSize: 'sm',
    fontFamily: 'mono',
    lineHeight: '1.8',
    outline: 'none',
    resize: 'vertical',
    transition: 'all 0.15s ease',
    bg: { base: 'transparent', _dark: 'surface' },
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.1)',
            _dark: '0 0 0 3px rgba(224,123,83,0.15)',
        },
    },
    _placeholder: {
        color: 'text.dimmed',
    },
});

export const urlCountClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    mt: '3',
    fontSize: 'sm',
    color: 'text.muted',
    fontWeight: '500',
});

export const primaryButtonCompactClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '5',
    py: '3',
    borderRadius: 'xl',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'md',
    fontWeight: '700',
    cursor: 'pointer',
});

export const secondaryButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '5',
    py: '3',
    borderRadius: 'xl',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
    backgroundColor: { base: 'white', _dark: 'surface' },
    color: 'text',
    fontSize: 'md',
    fontWeight: '600',
    cursor: 'pointer',
});

export const hintClass = css({
    fontSize: 'sm',
    color: 'text.muted',
});

export const errorBannerClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    p: '3',
    borderRadius: 'lg',
    backgroundColor: { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.12)' },
    color: { base: 'red.700', _dark: 'red.400' },
    fontSize: 'sm',
    fontWeight: '500',
    border: '1px solid',
    borderColor: { base: 'rgba(239,68,68,0.2)', _dark: 'rgba(239,68,68,0.25)' },
});

// ── Processing ───────────────────────────────────────────────────────────────

export const processingContainerClass = css({
    maxWidth: '720px',
    mx: 'auto',
    px: '6',
    py: '8',
});

export const processingHeaderClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    mb: '6',
});

export const processingTitleClass = css({
    fontSize: 'lg',
    fontWeight: '700',
    color: 'text',
});

export const processingSubtitleClass = css({
    fontSize: 'sm',
    color: 'text.muted',
    mt: '0.5',
});

export const urlListClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    mb: '6',
});

export const urlItemClass = (status: UrlStatus) =>
    css({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '3',
        p: '3',
        borderRadius: 'lg',
        backgroundColor:
            status === 'done' || status === 'scraped'
                ? { base: 'rgba(34,197,94,0.05)', _dark: 'rgba(34,197,94,0.08)' }
                : status === 'error'
                  ? { base: 'rgba(239,68,68,0.05)', _dark: 'rgba(239,68,68,0.08)' }
                  : status === 'scraping' || status === 'analyzing'
                    ? { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' }
                    : { base: 'rgba(0,0,0,0.02)', _dark: 'rgba(255,255,255,0.03)' },
        border: '1px solid',
        borderColor:
            status === 'done' || status === 'scraped'
                ? { base: 'rgba(34,197,94,0.15)', _dark: 'rgba(34,197,94,0.2)' }
                : status === 'error'
                  ? { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.2)' }
                  : status === 'scraping' || status === 'analyzing'
                    ? { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' }
                    : { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.06)' },
        transition: 'all 0.2s ease',
    });

export const urlItemIconClass = css({
    mt: '1',
    flexShrink: 0,
});

export const urlItemContentClass = css({
    flex: 1,
    minWidth: 0,
});

export const urlItemUrlClass = css({
    fontSize: 'xs',
    color: 'text.dimmed',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
});

export const urlItemTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    display: 'block',
    mt: '0.5',
});

export const urlItemErrorClass = css({
    fontSize: 'xs',
    color: 'status.error',
    display: 'block',
    mt: '0.5',
});

export const urlItemStatusClass = css({
    fontSize: 'xs',
    color: 'palette.orange',
    display: 'block',
    mt: '0.5',
});

export const cancelButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '4',
    py: '2',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(239,68,68,0.3)', _dark: 'rgba(239,68,68,0.35)' },
    backgroundColor: 'transparent',
    color: { base: 'red.600', _dark: 'red.400' },
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    mx: 'auto',
});
