'use client';

import { Check, Plus } from 'lucide-react';

import { css } from 'styled-system/css';

import { ServingsStepper } from '../FormParts';

import { leftoverLabel, type Pick } from './selection-state';

type SelectionCardFooterProps = {
    pick: Pick;
    household: number;
    canIncrement: boolean;
    onServings: (delta: 1 | -1) => void;
    onAcceptSide: (accepted: boolean) => void;
};

/** Under a picked card: servings, the leftover day it yields and "Dazu passt". */
export function SelectionCardFooter({
    pick,
    household,
    canIncrement,
    onServings,
    onAcceptSide,
}: SelectionCardFooterProps) {
    const leftover = leftoverLabel(pick.servings, household);
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2', px: '1' })}>
            <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '3' })}>
                <ServingsStepper
                    value={pick.servings}
                    onChange={(value) => onServings(value > pick.servings ? 1 : -1)}
                    householdSize={household}
                    max={canIncrement ? pick.servings + 1 : pick.servings}
                />
                {leftover && (
                    <span
                        className={css({
                            mb: '2.5',
                            fontSize: 'xs',
                            fontWeight: '600',
                            color: 'primary',
                        })}
                    >
                        {leftover}
                    </span>
                )}
            </div>
            {pick.side && (
                <button
                    type="button"
                    aria-pressed={pick.side.accepted}
                    onClick={() => onAcceptSide(!pick.side!.accepted)}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        width: 'full',
                        px: '3',
                        py: '2',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderStyle: 'dashed',
                        borderColor: 'border',
                        bg: 'transparent',
                        color: 'text',
                        fontSize: 'sm',
                        textAlign: 'left',
                        cursor: 'pointer',
                        _pressed: {
                            borderStyle: 'solid',
                            borderColor: 'primary',
                            bg: 'accent.soft',
                        },
                        _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
                    })}
                >
                    <span className={css({ flex: 1, minW: 0, truncate: true })}>
                        Dazu passt: {pick.side.card.title}
                    </span>
                    {pick.side.accepted ? (
                        <Check size={16} aria-label="Hinzugefügt" />
                    ) : (
                        <Plus size={16} aria-label="Hinzufügen" />
                    )}
                </button>
            )}
        </div>
    );
}
