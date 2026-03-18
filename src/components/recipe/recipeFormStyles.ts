import { css } from 'styled-system/css';

import type { AutoSaveStatus } from './useRecipeAutoSave';

export const autoSaveBarClass = (status: AutoSaveStatus) =>
    css({
        display: 'flex',
        alignItems: 'center',
        gap: '1.5',
        px: '3.5',
        py: '2',
        fontSize: '8px',
        fontWeight: '600',
        backgroundColor:
            status === 'error'
                ? { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.12)' }
                : { base: 'rgba(224,123,83,0.06)', _dark: 'rgba(224,123,83,0.1)' },
        color: status === 'error' ? 'red.500' : 'text.muted',
        borderBottom: '1px solid',
        borderBottomColor:
            status === 'error'
                ? { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.25)' }
                : { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.18)' },
        flexShrink: '0',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    });

export const spinnerClass = css({
    width: '10px',
    height: '10px',
    borderRadius: 'full',
    border: '2px solid',
    borderColor: 'brand.primary',
    borderTopColor: 'transparent',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
    flexShrink: '0',
});

export const sidebarFormClass = css({
    display: { base: 'block', md: 'flex' },
    flexDirection: { md: 'row' },
    height: { base: 'auto', md: '100%' },
    overflow: { base: 'visible', md: 'hidden' },
    flex: { md: '1' },
});

export const sidebarClass = css({
    width: { base: '100%', md: '360px', lg: '420px', xl: '480px', '2xl': '540px' },
    minWidth: { base: '100%', md: '360px', lg: '420px', xl: '480px', '2xl': '540px' },
    flexShrink: '0',
    borderRight: {
        base: 'none',
        md: { base: '1px solid rgba(224,123,83,0.15)', _dark: '1px solid rgba(224,123,83,0.12)' },
    },
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'surface',
    overflowX: { base: 'visible', md: 'hidden' },
    transition: 'width 200ms ease, min-width 200ms ease',
});

export const sidebarCollapsedClass = css({
    width: { base: '100%', md: '0px' },
    minWidth: { base: '100%', md: '0px' },
    flexShrink: '0',
    overflow: { base: 'auto', md: 'hidden' },
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'surface',
    transition: 'width 200ms ease, min-width 200ms ease',
});

export const sidebarToggleClass = css({
    display: { base: 'none', md: 'flex' },
    alignItems: 'center',
    justifyContent: 'center',
    p: '1.5',
    mx: '2.5',
    mt: '1.5',
    mb: '0.5',
    borderRadius: 'md',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'text.muted',
    cursor: 'pointer',
    alignSelf: 'flex-end',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.13)' },
        color: 'text',
    },
});

export const sidebarReopenClass = css({
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: '20',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: 'md',
    border: { base: '1px solid rgba(224,123,83,0.3)', _dark: '1px solid rgba(224,123,83,0.25)' },
    backgroundColor: 'surface',
    color: 'text.muted',
    cursor: 'pointer',
    boxShadow: { base: '0 2px 8px rgba(0,0,0,0.08)', _dark: '0 2px 8px rgba(0,0,0,0.25)' },
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.13)' },
        color: 'text',
    },
});

export const sidebarFooterClass = css({
    p: '3.5',
    borderTop: { base: '1px solid rgba(224,123,83,0.1)', _dark: '1px solid rgba(224,123,83,0.08)' },
    position: { base: 'static', md: 'sticky' },
    bottom: '0',
    backgroundColor: 'surface',
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5',
    flexShrink: '0',
    zIndex: '10',
});

export const progressBarWrapperClass = css({
    px: '3.5',
    py: '2.5',
    flexShrink: '0',
});

export const progressTrackClass = css({
    width: '100%',
    height: '3px',
    borderRadius: 'full',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    overflow: 'visible',
    position: 'relative',
});

export const progressFillClass = css({
    height: '100%',
    borderRadius: 'full',
    backgroundColor: 'brand.primary',
    transition: 'width 0.3s ease',
});

export const sidebarStickyHeaderClass = css({
    position: { base: 'sticky', md: 'static' },
    zIndex: '19',
    backgroundColor: 'surface',
    flexShrink: '0',
});

export const sidebarSectionsClass = css({
    flex: '1',
    overflowY: { base: 'visible', md: 'auto' },
    overflowX: 'hidden',
    scrollBehavior: 'smooth',
    overscrollBehaviorY: { base: 'auto', md: 'contain' },
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
        background: 'rgba(224,123,83,0.2)',
        borderRadius: '2px',
    },
});

export const sidebarSectionClass = css({
    px: '3.5',
    py: '2.5',
});

export const sidebarDividerClass = css({
    height: '1px',
    mx: '3.5',
    backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.12)' },
});

export const sectionHeadingClass = css({
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: { base: 'rgba(0,0,0,0.55)', _dark: 'rgba(255,255,255,0.5)' },
    mb: '2',
});

export const canvasAreaClass = css({
    flex: '1',
    overflow: 'hidden',
    display: { base: 'none', md: 'flex' },
    flexDirection: 'column',
    minWidth: '0',
    position: 'relative',
});
