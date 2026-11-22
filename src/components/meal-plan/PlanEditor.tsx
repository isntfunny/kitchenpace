'use client';

import { ArrowRightLeft, MoreHorizontal } from 'lucide-react';
import {
    createContext,
    type DragEvent,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';

import { movePlanEntry, swapPlanCells } from '@app/app/plan/edit-actions';
import type { DishMarker } from '@app/lib/meal-plan/view';
import { cellKey, weekdayShort } from '@app/lib/meal-plan/view';

import { css, cx } from 'styled-system/css';

import { DishCard } from './DishCard';
import { EntrySheet } from './EntrySheet';
import { SheetFrame } from './SheetFrame';
import { actionButton } from './styles';
import { dishesIn, type Cell } from './TargetPicker';
import type { PlanDish, PlanDisplay, PlanWeekData } from './types';
import { usePlanAction } from './usePlanAction';

// Editing layer of the week view (KUC-101): slot menu per dish, drag & drop on the
// desktop grid (Strg/Alt = copy) and the question what to do with a taken slot.
// The keyboard and touch alternative is "Verschieben …" in the slot menu.

interface PendingDrop {
    dish: PlanDish;
    target: Cell;
    copy: boolean;
}

interface PlanEditorValue {
    openEntry: (dish: PlanDish) => void;
    dragging: PlanDish | null;
    startDrag: (dish: PlanDish, event: DragEvent) => void;
    endDrag: () => void;
    dropTarget: (cell: Cell) => {
        onDragOver: (event: DragEvent) => void;
        onDragLeave: () => void;
        onDrop: (event: DragEvent) => void;
        'data-drop-over'?: boolean;
    };
}

const PlanEditorContext = createContext<PlanEditorValue | null>(null);

export function usePlanEditor() {
    return useContext(PlanEditorContext);
}

export function PlanEditorProvider({
    data,
    children,
}: {
    data: PlanWeekData;
    children: ReactNode;
}) {
    const { call, showToast } = usePlanAction();
    const [entryId, setEntryId] = useState<string | null>(null);
    const [dragging, setDragging] = useState<PlanDish | null>(null);
    const [over, setOver] = useState<string | null>(null);
    const [pending, setPending] = useState<PendingDrop | null>(null);
    const opener = useRef<HTMLElement | null>(null);

    // Look the dish up in fresh data, so the sheet follows refreshes after edits
    const entry = entryId ? (data.dishes.find((dish) => dish.id === entryId) ?? null) : null;

    const openEntry = useCallback((dish: PlanDish) => {
        opener.current = document.activeElement as HTMLElement | null;
        setEntryId(dish.id);
    }, []);

    const slotLabel = useCallback(
        (key: string) =>
            data.allSlots.find((slot) => slot.key === key)?.label ??
            data.slots.find((slot) => slot.key === key)?.label ??
            key,
        [data.allSlots, data.slots],
    );

    const move = useCallback(
        async ({ dish, target, copy }: PendingDrop) => {
            const done = await call(() => movePlanEntry(dish.id, { ...target, copy }));
            if (!done) return;
            const back = { date: dish.date, slot: dish.slot };
            showToast({
                type: 'success',
                title: copy ? 'Kopiert' : 'Verschoben',
                message: `„${dish.recipe.title}“ → ${weekdayShort(target.date)} ${slotLabel(target.slot)}`,
                duration: 8000,
                action: copy
                    ? undefined
                    : {
                          label: 'Rückgängig',
                          onClick: () => void call(() => movePlanEntry(dish.id, back)),
                      },
            });
        },
        [call, showToast, slotLabel],
    );

    const value = useMemo<PlanEditorValue>(
        () => ({
            openEntry,
            dragging,
            startDrag: (dish, event) => {
                event.dataTransfer.setData('text/plain', dish.recipe.title);
                event.dataTransfer.effectAllowed = 'copyMove';
                setDragging(dish);
            },
            endDrag: () => {
                setDragging(null);
                setOver(null);
            },
            dropTarget: (cell) => {
                const key = cellKey(cell.date, cell.slot);
                return {
                    onDragOver: (event) => {
                        if (!dragging) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect =
                            event.ctrlKey || event.altKey ? 'copy' : 'move';
                        if (over !== key) setOver(key);
                    },
                    onDragLeave: () => setOver((current) => (current === key ? null : current)),
                    onDrop: (event) => {
                        if (!dragging) return;
                        event.preventDefault();
                        const drop = {
                            dish: dragging,
                            target: cell,
                            copy: event.ctrlKey || event.altKey,
                        };
                        setDragging(null);
                        setOver(null);
                        const sameCell = cell.date === dragging.date && cell.slot === dragging.slot;
                        if (sameCell && !drop.copy) return;
                        if (dishesIn(data.dishes, cell, dragging.id).length) setPending(drop);
                        else void move(drop);
                    },
                    'data-drop-over': over === key || undefined,
                };
            },
        }),
        [openEntry, dragging, over, data.dishes, move],
    );

    return (
        <PlanEditorContext.Provider value={value}>
            {children}
            <EntrySheet
                dish={entry}
                data={data}
                onClose={() => setEntryId(null)}
                returnFocus={() => opener.current}
            />
            <DropDialog
                pending={pending}
                data={data}
                slotLabel={slotLabel}
                onClose={() => setPending(null)}
                onAdd={(drop) => {
                    setPending(null);
                    void move(drop);
                }}
                onSwap={async (drop) => {
                    setPending(null);
                    const done = await call(() =>
                        swapPlanCells({
                            a: { date: drop.dish.date, slot: drop.dish.slot },
                            b: drop.target,
                        }),
                    );
                    if (done) showToast({ type: 'success', title: 'Getauscht' });
                }}
            />
        </PlanEditorContext.Provider>
    );
}

/** Drop into a taken slot: swap, add as another dish, or cancel. */
function DropDialog({
    pending,
    data,
    slotLabel,
    onClose,
    onAdd,
    onSwap,
}: {
    pending: PendingDrop | null;
    data: PlanWeekData;
    slotLabel: (key: string) => string;
    onClose: () => void;
    onAdd: (drop: PendingDrop) => void;
    onSwap: (drop: PendingDrop) => void;
}) {
    const taken = pending ? dishesIn(data.dishes, pending.target, pending.dish.id) : [];
    return (
        <SheetFrame
            open={!!pending}
            onOpenChange={(open) => !open && onClose()}
            title="Mahlzeit ist schon belegt"
        >
            {pending && (
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                    <p className={css({ fontSize: 'sm' })}>
                        Am {weekdayShort(pending.target.date)} {slotLabel(pending.target.slot)} ist
                        schon {taken.map((dish) => `„${dish.recipe.title}“`).join(', ')} geplant.
                        Was soll mit „{pending.dish.recipe.title}“ passieren?
                    </p>
                    <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
                        <button
                            type="button"
                            className={actionButton({ variant: 'ghost' })}
                            onClick={onClose}
                        >
                            Abbrechen
                        </button>
                        <span className={css({ flex: 1 })} />
                        {!pending.copy && (
                            <button
                                type="button"
                                className={actionButton()}
                                onClick={() => onSwap(pending)}
                            >
                                <ArrowRightLeft size={16} aria-hidden /> Tauschen
                            </button>
                        )}
                        <button
                            type="button"
                            className={actionButton({ variant: 'primary' })}
                            onClick={() => onAdd(pending)}
                        >
                            Dazulegen
                        </button>
                    </div>
                </div>
            )}
        </SheetFrame>
    );
}

/** A dish with its menu button; draggable in the desktop grid. */
export function EditableDish({
    dish,
    slotTime,
    display,
    side,
    compact,
    extraMarkers,
    today,
}: {
    dish: PlanDish;
    slotTime: string;
    display: PlanDisplay;
    side?: boolean;
    compact?: boolean;
    extraMarkers?: DishMarker[];
    today: string;
}) {
    const editor = usePlanEditor();
    const card = (
        <DishCard
            dish={dish}
            slotTime={slotTime}
            display={display}
            side={side}
            compact={compact}
            extraMarkers={extraMarkers}
            today={today}
            menuSpace={!!editor}
        />
    );
    if (!editor) return card;
    return (
        <div
            draggable={compact}
            onDragStart={compact ? (event) => editor.startDrag(dish, event) : undefined}
            onDragEnd={compact ? editor.endDrag : undefined}
            title={compact ? 'Ziehen zum Verschieben, mit Strg kopieren' : undefined}
            className={cx(
                css({
                    position: 'relative',
                    minW: 0,
                    '& + &': { mt: '1.5' },
                    '&:hover > button, &:focus-within > button': { opacity: 1 },
                }),
                editor.dragging?.id === dish.id && css({ opacity: 0.4 }),
                compact && css({ cursor: 'grab' }),
            )}
        >
            {card}
            <button
                type="button"
                aria-label={`Optionen für ${dish.recipe.title}`}
                aria-haspopup="dialog"
                onClick={() => editor.openEntry(dish)}
                className={css({
                    position: 'absolute',
                    top: '0.5',
                    right: '0.5',
                    display: 'grid',
                    placeItems: 'center',
                    w: compact ? '28px' : '36px',
                    h: compact ? '28px' : '36px',
                    borderRadius: 'full',
                    border: 0,
                    bg: 'surface',
                    color: 'foreground.muted',
                    cursor: 'pointer',
                    boxShadow: 'shadow.small',
                    // Always visible on touch screens, on hover/focus with a mouse
                    opacity: { base: 1, lg: 0 },
                    transition: 'opacity 120ms ease',
                    _hover: { color: 'primary' },
                    _focusVisible: {
                        opacity: 1,
                        outline: '2px solid',
                        outlineColor: 'primary',
                        outlineOffset: '1px',
                    },
                })}
            >
                <MoreHorizontal size={16} aria-hidden />
            </button>
        </div>
    );
}
