'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MessageSquare, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { ingredientDisplayName } from '@app/lib/ingredient-display';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import type { AddedIngredient, IngredientSearchResult } from '../data';

import { IngredientReplacePopover } from './IngredientReplacePopover';
import { SegmentedBar } from './SegmentedBar';

interface IngredientCardProps {
    sortableId: string;
    ing: AddedIngredient;
    index: number;
    editing: boolean;
    onEditingChange: (open: boolean) => void;
    onUpdate: (index: number, changes: Partial<AddedIngredient>) => void;
    onRemove: (index: number) => void;
    onReplace?: (index: number, replacement: IngredientSearchResult) => void;
    onAmountFocus?: () => void;
    onCommentClick?: () => void;
    isTutorialTarget?: boolean;
}

export function IngredientCard({
    sortableId,
    ing,
    index,
    editing,
    onEditingChange,
    onUpdate,
    onRemove,
    onReplace,
    onAmountFocus,
    onCommentClick,
    isTutorialTarget,
}: IngredientCardProps) {
    const notesRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [showReplace, setShowReplace] = useState(false);

    const {
        attributes: sortableAttrs,
        listeners: dragListeners,
        setNodeRef: setSortableRef,
        transform,
        transition: sortableTransition,
        isDragging,
    } = useSortable({ id: sortableId });

    const displayName = ingredientDisplayName(ing.name, ing.pluralName, ing.amount);

    // Ensure current unit is in the list
    const unitItems = ing.availableUnits.includes(ing.unit)
        ? ing.availableUnits
        : [ing.unit, ...ing.availableUnits];

    const sortableStyle = {
        transform: CSS.Transform.toString(transform),
        transition: sortableTransition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 50 : undefined,
    };

    const setRefs = (node: HTMLDivElement | null) => {
        cardRef.current = node;
        setSortableRef(node);
    };

    const handleCardClick = () => {
        if (!editing) {
            onEditingChange(true);
            requestAnimationFrame(() => amountRef.current?.focus());
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (cardRef.current?.contains(e.relatedTarget as Node)) return;
        if (ing.amount) onEditingChange(false);
    };

    if (!editing) {
        /* ── Compact: one line ── */
        return (
            <div
                ref={setRefs}
                className={compactClass}
                style={sortableStyle}
                data-tutorial={isTutorialTarget ? 'ingredient-row' : undefined}
                onClick={handleCardClick}
                {...sortableAttrs}
            >
                <div className={dragHandleClass} {...dragListeners}>
                    <GripVertical size={14} />
                </div>

                <span className={compactNameClass}>{displayName}</span>

                {ing.amount ? (
                    <span
                        className={compactAmountClass}
                        data-tutorial={isTutorialTarget ? 'ingredient-amount' : undefined}
                    >
                        ({ing.amount}&thinsp;{ing.unit})
                    </span>
                ) : (
                    <span className={compactMissingClass}>(Menge fehlt)</span>
                )}

                <div className={compactSpacerClass} />

                {ing.isOptional && (
                    <span
                        className={compactBadgeClass}
                        data-tutorial={isTutorialTarget ? 'ingredient-optional' : undefined}
                    >
                        Opt.
                    </span>
                )}

                {ing.notes && (
                    <span
                        className={compactNoteBadgeClass}
                        data-tutorial={isTutorialTarget ? 'ingredient-comment' : undefined}
                    >
                        <MessageSquare size={11} />
                    </span>
                )}

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                    }}
                    className={compactRemoveClass}
                    title="Entfernen"
                >
                    <X size={13} />
                </button>
            </div>
        );
    }

    /* ── Editing view ── */
    return (
        <div
            ref={setRefs}
            className={editClass}
            style={sortableStyle}
            data-tutorial={isTutorialTarget ? 'ingredient-row' : undefined}
            onBlur={handleBlur}
            {...sortableAttrs}
        >
            {/* Top: drag, name, opt toggle, remove */}
            <div className={editRowClass}>
                <div className={dragHandleClass} {...dragListeners}>
                    <GripVertical size={14} />
                </div>

                {showReplace && onReplace ? (
                    <IngredientReplacePopover
                        currentName={ing.name}
                        onReplace={(replacement) => {
                            onReplace(index, replacement);
                            setShowReplace(false);
                        }}
                        onCancel={() => setShowReplace(false)}
                    />
                ) : (
                    <button
                        type="button"
                        className={editNameBtnClass}
                        onClick={() => onReplace && setShowReplace(true)}
                    >
                        <span className={editNameClass}>{displayName}</span>
                        {onReplace && <span className={editReplaceClass}>ersetzen</span>}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onUpdate(index, { isOptional: !ing.isOptional })}
                    data-tutorial={isTutorialTarget ? 'ingredient-optional' : undefined}
                    className={optBtnClass}
                    style={
                        ing.isOptional
                            ? {
                                  color: PALETTE.orange,
                                  borderColor: `${PALETTE.orange}70`,
                                  background: `${PALETTE.orange}12`,
                              }
                            : undefined
                    }
                    title={ing.isOptional ? 'Pflichtfeld machen' : 'Als optional markieren'}
                >
                    Opt.
                </button>

                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className={editRemoveClass}
                    title="Entfernen"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Amount + Unit — combined container */}
            <div
                className={combinedAmountUnitClass}
                data-tutorial={isTutorialTarget ? 'ingredient-amount' : undefined}
            >
                <input
                    ref={amountRef}
                    type="text"
                    inputMode="decimal"
                    value={ing.amount}
                    onChange={(e) => onUpdate(index, { amount: e.target.value })}
                    onFocus={onAmountFocus}
                    placeholder="Menge"
                    className={unitItems.length <= 1 ? amountInputFullClass : amountInputClass}
                />
                {unitItems.length <= 1 ? (
                    <span
                        className={fixedUnitClass}
                        data-tutorial={isTutorialTarget ? 'ingredient-unit' : undefined}
                    >
                        {ing.unit}
                    </span>
                ) : (
                    <div
                        className={unitBarWrapperClass}
                        data-tutorial={isTutorialTarget ? 'ingredient-unit' : undefined}
                    >
                        <SegmentedBar
                            items={unitItems}
                            activeIndex={unitItems.indexOf(ing.unit)}
                            onSelect={(i) => onUpdate(index, { unit: unitItems[i] })}
                            noBorder
                        />
                    </div>
                )}
            </div>

            {/* Notes */}
            <div
                className={editNotesClass}
                data-tutorial={isTutorialTarget ? 'ingredient-comment' : undefined}
            >
                <MessageSquare
                    size={12}
                    className={css({ flexShrink: 0, transition: 'color 120ms ease' })}
                    color={ing.notes ? PALETTE.orange : 'rgba(150,150,150,0.35)'}
                />
                <input
                    ref={notesRef}
                    type="text"
                    value={ing.notes}
                    onChange={(e) => onUpdate(index, { notes: e.target.value })}
                    onFocus={onCommentClick}
                    placeholder="Hinweis, z.B. frisch gehackt"
                    className={notesInputClass}
                />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════ */

const dragHandleClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: { base: 'rgba(0,0,0,0.15)', _dark: 'rgba(255,255,255,0.15)' },
    cursor: 'grab',
    flexShrink: 0,
    transition: 'color 120ms ease',
    _hover: {
        color: { base: 'rgba(0,0,0,0.4)', _dark: 'rgba(255,255,255,0.4)' },
    },
});

/* ── Compact ── */

const compactClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    px: '2.5',
    py: '2',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.15)' },
    cursor: 'pointer',
    transition: 'all 150ms ease',
    _hover: {
        borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
        bg: { base: 'rgba(224,123,83,0.03)', _dark: 'rgba(224,123,83,0.05)' },
    },
});

const compactNameClass = css({
    fontWeight: '600',
    fontSize: 'sm',
    color: 'text',
    lineClamp: '1',
    minWidth: 0,
});

const compactAmountClass = css({
    fontSize: 'sm',
    fontWeight: '400',
    color: 'text.muted',
    flexShrink: 0,
    whiteSpace: 'nowrap',
});

const compactMissingClass = css({
    fontSize: 'xs',
    fontWeight: '500',
    color: { base: 'rgba(220,60,60,0.6)', _dark: 'rgba(240,80,80,0.7)' },
    flexShrink: 0,
    whiteSpace: 'nowrap',
});

const compactSpacerClass = css({ flex: '1' });

const compactBadgeClass = css({
    fontSize: '9px',
    fontWeight: '700',
    px: '1.5',
    py: '0.5',
    borderRadius: 'sm',
    color: 'palette.orange',
    bg: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    flexShrink: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    lineHeight: '1',
});

const compactNoteBadgeClass = css({
    display: 'flex',
    alignItems: 'center',
    color: 'palette.orange',
    flexShrink: 0,
});

const compactRemoveClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: '0.5',
    bg: 'transparent',
    border: 'none',
    color: { base: 'rgba(0,0,0,0.12)', _dark: 'rgba(255,255,255,0.12)' },
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 120ms ease',
    _hover: { color: 'red.500' },
});

/* ── Editing ── */

const editClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5',
    px: '2.5',
    py: '2.5',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.35)', _dark: 'rgba(224,123,83,0.4)' },
    bg: { base: 'rgba(224,123,83,0.03)', _dark: 'rgba(224,123,83,0.05)' },
    boxShadow: {
        base: '0 2px 8px rgba(224,123,83,0.08)',
        _dark: '0 2px 8px rgba(0,0,0,0.2)',
    },
});

const editRowClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1',
});

const editNameBtnClass = css({
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    px: '1',
    py: '0.5',
    borderRadius: 'md',
    minWidth: 0,
    transition: 'background 120ms ease',
    _hover: {
        bg: { base: 'rgba(224,123,83,0.06)', _dark: 'rgba(224,123,83,0.1)' },
    },
});

const editNameClass = css({
    fontWeight: '600',
    fontSize: 'sm',
    color: 'text',
    lineClamp: '1',
    minWidth: 0,
});

const editReplaceClass = css({
    fontSize: '10px',
    fontWeight: '500',
    color: { base: 'rgba(224,123,83,0.45)', _dark: 'rgba(224,123,83,0.5)' },
    flexShrink: 0,
    opacity: 0,
    transition: 'opacity 120ms ease',
    'button:hover &': { opacity: 1 },
});

const optBtnClass = css({
    fontSize: '10px',
    fontWeight: '700',
    px: '2',
    py: '1',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.12)' },
    bg: 'transparent',
    color: { base: 'rgba(0,0,0,0.3)', _dark: 'rgba(255,255,255,0.3)' },
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 120ms ease',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    _hover: {
        borderColor: { base: 'rgba(224,123,83,0.5)', _dark: 'rgba(224,123,83,0.5)' },
        color: 'palette.orange',
    },
});

const editRemoveClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: '1',
    borderRadius: 'md',
    bg: 'transparent',
    border: 'none',
    color: { base: 'rgba(0,0,0,0.2)', _dark: 'rgba(255,255,255,0.2)' },
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'color 120ms ease',
    _hover: { color: 'red.500' },
});

const combinedAmountUnitClass = css({
    display: 'flex',
    alignItems: 'center',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'palette.orange',
    overflow: 'hidden',
});

const amountInputBase = css.raw({
    height: '36px',
    px: '2.5',
    fontSize: 'sm',
    fontWeight: '600',
    outline: 'none',
    bg: { base: 'white', _dark: 'rgba(255,255,255,0.06)' },
    color: 'text',
    border: 'none',
    _placeholder: {
        color: { base: 'rgba(0,0,0,0.3)', _dark: 'rgba(255,255,255,0.25)' },
        fontWeight: '400',
    },
});

const amountInputClass = css({
    ...amountInputBase,
    width: '50%',
    flexShrink: 0,
    borderRight: '1px solid',
    borderRightColor: 'palette.orange',
});

const amountInputFullClass = css({
    ...amountInputBase,
    flex: '1',
});

const fixedUnitClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text.muted',
    flexShrink: 0,
    px: '2.5',
});

const unitBarWrapperClass = css({
    flex: '1',
    minWidth: 0,
});

const editNotesClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
});

const notesInputClass = css({
    flex: '1',
    fontSize: 'xs',
    color: 'text.muted',
    bg: 'transparent',
    border: 'none',
    outline: 'none',
    py: '0.5',
    _placeholder: {
        color: { base: 'rgba(0,0,0,0.2)', _dark: 'rgba(255,255,255,0.15)' },
    },
    _focus: { color: 'text' },
});
