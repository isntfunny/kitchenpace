import { css } from 'styled-system/css';

export const processingLayoutClass = css({
    display: 'flex',
    minHeight: 'calc(100vh - 64px)',
    maxWidth: '1280px',
    mx: 'auto',
    px: '6',
    py: '8',
    gap: '6',
    alignItems: 'flex-start',
});

export const processingSidebarClass = css({
    width: '300px',
    flexShrink: 0,
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.18)' },
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
    p: '5',
    position: 'sticky',
    top: '8',
});

export const sidebarHeaderClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    mb: '5',
});

export const sidebarIconWrapperClass = (isScraping: boolean) =>
    css({
        width: '40px',
        height: '40px',
        borderRadius: 'lg',
        backgroundColor: isScraping
            ? { base: 'rgba(59,130,246,0.1)', _dark: 'rgba(59,130,246,0.15)' }
            : { base: 'rgba(168,85,247,0.1)', _dark: 'rgba(168,85,247,0.15)' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    });

export const sidebarIconClass = css({
    width: '20px',
    height: '20px',
    color: 'inherit',
});

export const sidebarTitleClass = css({
    fontSize: 'sm',
    fontWeight: '700',
    color: 'text',
    lineHeight: '1.3',
});

export const sidebarSubtitleClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    mt: '0.5',
});

export const pipelineClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    mb: '5',
});

export const pipelineStepClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    position: 'relative',
});

export const pipelineStepIndicatorClass = (done: boolean, active: boolean) =>
    css({
        width: '24px',
        height: '24px',
        borderRadius: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: done
            ? 'status.success'
            : active
              ? 'palette.orange'
              : { base: 'rgba(0,0,0,0.25)', _dark: 'rgba(255,255,255,0.3)' },
        backgroundColor: done
            ? { base: 'rgba(34,197,94,0.08)', _dark: 'rgba(34,197,94,0.12)' }
            : active
              ? { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' }
              : 'transparent',
        zIndex: 1,
    });

export const pipelineStepLabelClass = (done: boolean, active: boolean) =>
    css({
        fontSize: 'sm',
        fontWeight: active ? '700' : '500',
        color: done ? 'status.success' : active ? 'text' : 'text.muted',
        pt: '3px',
        pb: '5',
    });

export const pipelineConnectorClass = (done: boolean) =>
    css({
        position: 'absolute',
        left: '11px',
        top: '24px',
        width: '2px',
        height: '20px',
        backgroundColor: done
            ? { base: 'rgba(34,197,94,0.3)', _dark: 'rgba(34,197,94,0.4)' }
            : { base: 'rgba(0,0,0,0.08)', _dark: 'rgba(255,255,255,0.1)' },
        zIndex: 0,
    });

export const sidebarStatsClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    pt: '4',
    borderTop: '1px solid',
    borderColor: { base: 'rgba(0,0,0,0.06)', _dark: 'rgba(255,255,255,0.08)' },
});

export const sidebarStatRowClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'xs',
    color: 'text.muted',
});

export const terminalPanelClass = css({
    flex: '1',
    minWidth: '0',
    borderRadius: 'xl',
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
});

export const terminalTitleBarClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: '4',
    py: '3',
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
});

export const terminalDotsClass = css({
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
});

export const terminalDotClass = (color: string) =>
    css({
        width: '12px',
        height: '12px',
        borderRadius: 'full',
        backgroundColor: color,
        display: 'inline-block',
    });

export const terminalTitleClass = css({
    fontSize: 'xs',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'inherit',
});

export const terminalBodyClass = css({
    backgroundColor: '#1a1a1a',
    p: '4',
    minHeight: '400px',
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    scrollBehavior: 'smooth',
});

export const terminalInitClass = css({
    fontSize: 'xs',
    color: 'rgba(255,255,255,0.2)',
    mb: '2',
    fontFamily: 'inherit',
});

export const terminalLineClass = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '2',
    fontFamily: 'inherit',
    lineHeight: '1.6',
});

export const terminalTimestampClass = css({
    fontSize: '10px',
    color: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
    fontFamily: 'inherit',
    minWidth: '80px',
});

export const terminalPromptClass = (type: string) =>
    css({
        fontSize: 'xs',
        flexShrink: 0,
        color:
            type === 'complete'
                ? '#28c840'
                : type === 'error'
                  ? '#ff5f57'
                  : type === 'data'
                    ? '#6699cc'
                    : 'rgba(255,255,255,0.35)',
        fontFamily: 'inherit',
    });

export const terminalMessageClass = (type: string) =>
    css({
        fontSize: 'xs',
        color:
            type === 'complete'
                ? 'rgba(40,200,64,0.85)'
                : type === 'error'
                  ? '#ff5f57'
                  : type === 'data'
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(255,255,255,0.75)',
        fontFamily: 'inherit',
        flexShrink: 0,
    });

export const terminalDetailClass = (type: string) =>
    css({
        fontSize: 'xs',
        color:
            type === 'complete'
                ? 'rgba(40,200,64,0.6)'
                : type === 'error'
                  ? 'rgba(255,95,87,0.7)'
                  : type === 'data'
                    ? 'palette.gold'
                    : 'rgba(255,255,255,0.4)',
        fontFamily: 'inherit',
        wordBreak: 'break-all',
    });

export const terminalCursorLineClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    mt: '1',
});

export const terminalCursorClass = css({
    color: 'palette.orange',
    fontSize: 'xs',
    fontFamily: 'inherit',
});

export const streamingBufferClass = css({
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#6b9e6b',
    flex: '1',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    display: 'block',
});

export const progressBarSpacerClass = css({ mb: '5' });

export const terminalTitleBarSpacerClass = css({ width: '52px' });
