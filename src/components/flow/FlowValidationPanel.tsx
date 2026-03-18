'use client';

import type { FlowValidationResult } from '@app/lib/validation/flowValidation';

import { css, cx } from 'styled-system/css';

/* ── component ───────────────────────────────────────────── */

interface FlowValidationPanelProps {
    validation: FlowValidationResult;
    onSelectNode: (nodeId: string) => void;
}

export function FlowValidationPanel({ validation, onSelectNode }: FlowValidationPanelProps) {
    if (validation.errors.length === 0) return null;

    return (
        <div className={validationPanelWrapperClass}>
            <div className={validationPanelClass} role="status" aria-live="polite">
                <div className={validationPanelHeaderClass}>
                    <div>
                        <div className={validationPanelEyebrowClass}>Flow-Check</div>
                        <div className={validationPanelSummaryClass}>
                            {validation.summary ?? 'Bitte pruefe den Ablauf.'}
                        </div>
                    </div>
                    <div className={validationPanelCountsClass}>
                        {validation.counts.blocking > 0 && (
                            <span className={validationCountErrorClass}>
                                {validation.counts.blocking} Blocker
                            </span>
                        )}
                        {validation.counts.warnings > 0 && (
                            <span className={validationCountWarningClass}>
                                {validation.counts.warnings} Hinweise
                            </span>
                        )}
                    </div>
                </div>
                {validation.blockingIssues.length > 0 && (
                    <div className={validationSectionClass}>
                        <div className={validationSectionTitleClass}>
                            Vor dem Veroeffentlichen beheben
                        </div>
                        {validation.blockingIssues.slice(0, 4).map((issue) => (
                            <button
                                key={issue.id}
                                type="button"
                                className={validationItemErrorClass}
                                onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
                                disabled={!issue.nodeId}
                                title={issue.hint ?? issue.message}
                            >
                                <span className={validationItemTitleClass}>{issue.title}</span>
                                <span className={validationItemTextClass}>{issue.message}</span>
                            </button>
                        ))}
                    </div>
                )}
                {validation.warningIssues.length > 0 && (
                    <div className={validationSectionClass}>
                        <div className={validationSectionTitleClass}>Empfohlene Verbesserungen</div>
                        {validation.warningIssues.slice(0, 3).map((issue) => (
                            <button
                                key={issue.id}
                                type="button"
                                className={validationItemWarningClass}
                                onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
                                disabled={!issue.nodeId}
                                title={issue.hint ?? issue.message}
                            >
                                <span className={validationItemTitleClass}>{issue.title}</span>
                                <span className={validationItemTextClass}>{issue.message}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── styles ──────────────────────────────────────────────── */

const validationPanelWrapperClass = css({
    position: 'absolute',
    top: '0',
    left: '0',
    padding: '16px',
    zIndex: '10',
    pointerEvents: 'auto',
    _hover: {
        '& > div': {
            opacity: '0',
            pointerEvents: 'none',
        },
    },
});

const validationPanelClass = css({
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3',
    padding: '3',
    borderRadius: 'xl',
    backgroundColor: {
        base: 'rgba(255,255,255,0.95)',
        _dark: 'rgba(15,15,15,0.8)',
    },
    border: '1px solid rgba(224,123,83,0.5)',
    boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
    pointerEvents: 'auto',
    transition: 'opacity 0.2s ease',
});

const validationPanelHeaderClass = css({
    display: 'flex',
    justifyContent: 'space-between',
    gap: '3',
    alignItems: 'flex-start',
});

const validationPanelEyebrowClass = css({
    fontSize: 'xs',
    fontWeight: '700',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'text.muted',
});

const validationPanelSummaryClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text.primary',
});

const validationPanelCountsClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    alignItems: 'flex-end',
});

const validationCountBaseClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    py: '1',
    px: '2.5',
    borderRadius: 'full',
});

const validationCountErrorClass = cx(
    validationCountBaseClass,
    css({
        backgroundColor: 'rgba(239,68,68,0.14)',
        color: '#b91c1c',
    }),
);

const validationCountWarningClass = cx(
    validationCountBaseClass,
    css({
        backgroundColor: 'rgba(245,158,11,0.16)',
        color: '#b45309',
    }),
);

const validationSectionClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5',
});

const validationSectionTitleClass = css({
    fontSize: 'xs',
    fontWeight: '700',
    color: 'text.muted',
});

const validationItemBaseClass = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.5',
    width: '100%',
    textAlign: 'left',
    py: '2.5',
    px: '3',
    borderRadius: 'lg',
    border: '1px solid transparent',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    _disabled: {
        cursor: 'default',
        opacity: 0.75,
    },
});

const validationItemErrorClass = cx(
    validationItemBaseClass,
    css({
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderColor: 'rgba(239,68,68,0.18)',
        _hover: {
            backgroundColor: 'rgba(239,68,68,0.12)',
        },
    }),
);

const validationItemWarningClass = cx(
    validationItemBaseClass,
    css({
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderColor: 'rgba(245,158,11,0.18)',
        _hover: {
            backgroundColor: 'rgba(245,158,11,0.12)',
        },
    }),
);

const validationItemTitleClass = css({
    fontSize: 'xs',
    fontWeight: '500',
    backgroundColor: 'rgba(224,123,83,0.18)',
    color: 'text.primary',
    borderRadius: 'full',
    px: '2.5',
});

const validationItemTextClass = css({
    fontSize: 'xs',
    color: 'text.secondary',
    lineHeight: '1.45',
});
