import { css } from 'styled-system/css';

/* ══════════════════════════════════════════════════════════════
   LaneWizard — shared CSS class constants
   ══════════════════════════════════════════════════════════════ */

export const containerClass = css({
    fontFamily: 'body',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
});

/* The whole recipe is ONE unified block — outer frame only */
export const gridWrapClass = css({
    display: 'flex',
    flexDirection: 'column',
    m: '20px',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    bg: 'white',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
});

/* Segment block: positioning context; CSS :hover shows add-lane buttons */
export const segmentOuterClass = css({
    position: 'relative',
    '& .lwz-add-lane': {
        opacity: '0',
        transition: 'opacity 0.15s ease',
        pointerEvents: 'none',
    },
    '&:hover .lwz-add-lane': {
        opacity: '1',
        pointerEvents: 'auto',
    },
});

const _addLaneBtnBase = css({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    w: '26px',
    h: '26px',
    borderRadius: 'full',
    border: '1.5px dashed rgba(224,123,83,0.5)',
    bg: 'white',
    color: '#e07b53',
    fontSize: '16px',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: '25',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    _hover: { bg: 'rgba(224,123,83,0.07)', borderColor: '#e07b53' },
});

export const addLaneBtnLeftClass = `${_addLaneBtnBase} lwz-add-lane ${css({ left: '6px' })}`;
export const addLaneBtnRightClass = `${_addLaneBtnBase} lwz-add-lane ${css({ right: '6px' })}`;

/* CSS grid inside the block — stretch so all lane columns reach the same height */
export const segmentGridClass = css({
    display: 'grid',
    alignItems: 'stretch',
});

/* Each lane is a flex column; last card stretches via flexGrow */
export const laneColClass = css({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
});

export const progressWrapClass = css({
    p: '4',
    bg: 'white',
    borderBottom: '1px solid',
    borderColor: 'border',
    flexShrink: '0',
});

export const progressBarBgClass = css({
    h: '3px',
    borderRadius: 'full',
    bg: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
});

export const progressBarFillClass = css({
    h: '100%',
    borderRadius: 'full',
    bg: '#00b894',
});

export const toolbarClass = css({
    display: 'flex',
    gap: '8px',
    px: '20px',
    py: '10px',
    flexShrink: '0',
});

export const aiToolbarBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    px: '14px',
    py: '7px',
    borderRadius: 'full',
    border: 'none',
    bg: 'linear-gradient(135deg, #e07b53, #f8b500)',
    color: 'white',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(224,123,83,0.3)',
    _hover: { boxShadow: '0 3px 12px rgba(224,123,83,0.45)', transform: 'translateY(-1px)' },
});

export const toolbarBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    px: '12px',
    py: '6px',
    borderRadius: 'full',
    border: '1px solid rgba(0,0,0,0.1)',
    bg: 'white',
    color: 'rgba(0,0,0,0.55)',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    _hover: { borderColor: '#e07b53', color: '#e07b53', bg: 'rgba(224,123,83,0.05)' },
});

export const rulerWrapClass = css({
    mx: '20px',
    mt: '14px',
    mb: '0',
    flexShrink: '0',
});

export const rulerHeaderClass = css({
    display: 'flex',
    justifyContent: 'space-between',
    mb: '6px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'rgba(0,0,0,0.35)',
});

/* Gantt row — flex, no overflow clip so labels aren't cut */
export const rulerRowClass = css({
    display: 'flex',
    gap: '3px',
    alignItems: 'stretch',
});

/* Individual timed block — flex proportional */
export const rulerBlockClass = css({
    flexShrink: '0',
    borderRadius: '6px',
    px: '10px',
    py: '7px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '3px',
    opacity: '0.88',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    overflow: 'hidden',
    cursor: 'default',
    minW: '0',
    _hover: { opacity: '1', transform: 'translateY(-1px)' },
});

/* Untimed block — fixed compact width, dashed border */
export const rulerBlockUntimedClass = css({
    flex: '0 0 auto',
    minW: '72px',
    borderRadius: '6px',
    px: '10px',
    py: '7px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '3px',
    border: '1.5px dashed',
    bg: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
    cursor: 'default',
    opacity: '0.75',
    transition: 'opacity 0.15s ease',
    _hover: { opacity: '1' },
});

export const rulerBlockNameClass = css({
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

export const rulerBlockNameUntimedClass = css({
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

export const rulerBlockFootClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
});

export const rulerBlockDurClass = css({
    fontSize: '10px',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '1',
});

export const rulerParallelClass = css({
    fontSize: '9px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: '1',
});

export const rulerUnknownDurClass = css({
    fontSize: '11px',
    fontWeight: '800',
    color: 'rgba(0,0,0,0.25)',
    lineHeight: '1',
    fontVariantNumeric: 'tabular-nums',
});
