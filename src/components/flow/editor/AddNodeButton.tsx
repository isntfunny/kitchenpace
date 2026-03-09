'use client';

import { Plus } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { css } from 'styled-system/css';

import type { StepType } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';
import { ADDABLE_STEP_TYPES, STEP_CONFIGS } from './stepConfig';

interface AddNodeButtonProps {
    nodeId: string;
    /** Which side of the node: 'source' = right (after), 'target' = left (before) */
    side?: 'source' | 'target';
}

function AddNodeButtonComponent({ nodeId, side = 'source' }: AddNodeButtonProps) {
    const { onAddNodeAfter, onAddNodeBefore } = useFlowEditor();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSelect = useCallback(
        (stepType: StepType) => {
            setOpen(false);
            if (side === 'target') {
                onAddNodeBefore?.(nodeId, stepType);
            } else {
                onAddNodeAfter(nodeId, stepType);
            }
        },
        [nodeId, side, onAddNodeAfter, onAddNodeBefore],
    );

    const isLeft = side === 'target';

    return (
        <div ref={containerRef} className={wrapperClass}>
            <button
                type="button"
                className={circleButtonClass}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                title={isLeft ? 'Schritt davor einfügen' : 'Schritt hinzufügen'}
            >
                <Plus className={css({ width: '13px', height: '13px' })} />
            </button>

            {open && (
                <div
                    className={css({
                        position: 'absolute',
                        zIndex: '50',
                        backgroundColor: 'surface',
                        borderRadius: 'xl',
                        border: { base: '1px solid rgba(224,123,83,0.3)', _dark: '1px solid rgba(224,123,83,0.25)' },
                        boxShadow: { base: '0 8px 32px rgba(0,0,0,0.12)', _dark: '0 8px 32px rgba(0,0,0,0.35)' },
                        p: '3',
                        width: '280px',
                    })}
                    style={
                        isLeft
                            ? {
                                  right: 'calc(100% + 8px)',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                              }
                            : {
                                  left: 'calc(100% + 8px)',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                              }
                    }
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={popoverHeaderClass}>
                        {isLeft ? 'Was passiert davor?' : 'Was passiert als nächstes?'}
                    </div>
                    <div className={gridClass}>
                        {ADDABLE_STEP_TYPES.map((type) => {
                            const config = STEP_CONFIGS[type];
                            const Icon = config.icon;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    className={stepButtonClass}
                                    style={{
                                        backgroundColor: config.color,
                                        backgroundImage: config.gradient,
                                    }}
                                    onClick={() => handleSelect(type)}
                                >
                                    <Icon className={css({ width: '20px', height: '20px' })} />
                                    <span>{config.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export const AddNodeButton = memo(AddNodeButtonComponent);

/* ── styles ──────────────────────────────────────────────── */

const wrapperClass = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
});

const circleButtonClass = css({
    width: '26px',
    height: '26px',
    borderRadius: 'full',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: '0',
    _hover: {
        transform: 'scale(1.1)',
        boxShadow: { base: '0 4px 12px rgba(224,123,83,0.4)', _dark: '0 4px 12px rgba(224,123,83,0.5)' },
    },
});

const popoverHeaderClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    mb: '2',
    textAlign: 'center',
});

const gridClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5',
});

const stepButtonClass = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5',
    p: '2',
    borderRadius: 'lg',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: '9px',
    fontWeight: '600',
    color: 'text',
    _hover: {
        borderColor: 'brand.primary',
        transform: 'translateY(-1px)',
        boxShadow: { base: '0 2px 8px rgba(224,123,83,0.2)', _dark: '0 2px 8px rgba(224,123,83,0.3)' },
    },
});
