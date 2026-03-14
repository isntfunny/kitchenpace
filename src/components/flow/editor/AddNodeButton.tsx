'use client';

import { Plus } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { StepTypePicker } from '@app/components/lane-wizard/StepTypePicker';
import { css } from 'styled-system/css';

import type { StepType } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';

interface AddNodeButtonProps {
    nodeId: string;
    /** Which side of the node: 'source' = right (after), 'target' = left (before) */
    side?: 'source' | 'target';
}

function AddNodeButtonComponent({ nodeId, side = 'source' }: AddNodeButtonProps) {
    const { onAddNodeAfter, onAddNodeBefore } = useFlowEditor();
    const [open, setOpen] = useState(false);

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
        <div className={wrapperClass}>
            <button
                type="button"
                className={circleButtonClass}
                onMouseDown={(e) => {
                    // Stop mousedown from reaching StepTypePicker's
                    // document mousedown outside-listener
                    e.nativeEvent.stopImmediatePropagation();
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                title={isLeft ? 'Schritt davor einfügen' : 'Schritt hinzufügen'}
            >
                <Plus
                    className={css({
                        width: '13px',
                        height: '13px',
                        transition: 'transform 0.2s ease',
                    })}
                    style={open ? { transform: 'rotate(45deg)' } : undefined}
                />
            </button>

            {open && (
                <div
                    className={css({ position: 'absolute', zIndex: '50' })}
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
                    <StepTypePicker
                        title={isLeft ? 'Was passiert davor?' : 'Was passiert als nächstes?'}
                        onSelect={handleSelect}
                        onClose={() => setOpen(false)}
                    />
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
        boxShadow: {
            base: '0 4px 12px rgba(224,123,83,0.4)',
            _dark: '0 4px 12px rgba(224,123,83,0.5)',
        },
    },
});
