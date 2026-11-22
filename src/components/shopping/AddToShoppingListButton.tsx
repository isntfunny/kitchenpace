'use client';

import { Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { addRecipeToShoppingList, getRecipeShoppingLines } from '@app/app/shopping-list/actions';
import { Button } from '@app/components/atoms/Button';
import { portionFactor } from '@app/lib/ingredients/quantities';
import { scaledAmount, type RecipeLine } from '@app/lib/shopping/recipe-items';

import { css } from 'styled-system/css';

const overlay = css({ position: 'fixed', inset: '0', zIndex: '50', bg: 'rgba(0, 0, 0, 0.45)' });
const content = css({
    position: 'fixed',
    zIndex: '51',
    left: '50%',
    top: { base: 'auto', md: '50%' },
    bottom: { base: '0', md: 'auto' },
    transform: { base: 'translateX(-50%)', md: 'translate(-50%, -50%)' },
    width: { base: '100%', md: '480px' },
    maxH: { base: '90vh', md: '85vh' },
    display: 'flex',
    flexDirection: 'column',
    bg: 'surface.elevated',
    color: 'foreground',
    fontFamily: 'body',
    borderRadius: { base: '2xl 2xl 0 0', md: '2xl' },
    boxShadow: 'shadow.dialog',
    _focusVisible: { outline: 'none' },
});
const head = css({ display: 'flex', alignItems: 'center', gap: '3', p: '5', pb: '3' });
const title = css({ fontFamily: 'heading', fontSize: 'xl', fontWeight: '700', flex: '1' });
const closeButton = css({
    w: '9',
    h: '9',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    border: 'none',
    bg: 'transparent',
    color: 'foreground',
    cursor: 'pointer',
    _hover: { bg: 'surface.muted' },
});
const servingsRow = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    px: '5',
    pb: '3',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderColor: 'border.muted',
});
const stepButton = css({
    w: '9',
    h: '9',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface',
    color: 'foreground',
    cursor: 'pointer',
    _disabled: { opacity: 0.4, cursor: 'not-allowed' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
});
const listBox = css({ overflowY: 'auto', m: '0', p: '0', px: '5', listStyle: 'none', flex: '1' });
const lineRow = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    py: '2.5',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderColor: 'border.muted',
    cursor: 'pointer',
});
const checkbox = css({ w: '5', h: '5', accentColor: 'primary', flexShrink: 0 });
const lineName = css({ flex: '1', minW: 0, fontSize: 'sm' });
const lineAmount = css({ color: 'foreground.muted', fontSize: 'sm', whiteSpace: 'nowrap' });
const optionalTag = css({ color: 'foreground.muted', fontSize: 'xs', ml: '2' });
const footer = css({ display: 'flex', flexDirection: 'column', gap: '2', p: '5', pt: '4' });
const messageStyle = css({ fontSize: 'sm', color: 'foreground.muted' });
const linkStyle = css({
    color: 'primary',
    fontWeight: '600',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
});

/**
 * "Auf die Einkaufsliste" (KUC-104/105): dialog to pick the servings and the
 * ingredient lines (optional ones can be deselected) before they go on the
 * user's own list.
 */
export function AddToShoppingListButton({
    recipeId,
    servings: initialServings,
}: {
    recipeId: string;
    servings: number;
}) {
    const [open, setOpen] = useState(false);
    const [servings, setServings] = useState(initialServings);
    const [loaded, setLoaded] = useState<{ servings: number; lines: RecipeLine[] } | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState<{ text: string; done: boolean } | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        if (!open || loaded) return;
        let cancelled = false;
        void getRecipeShoppingLines(recipeId).then((result) => {
            if (cancelled) return;
            if (!result.ok || !result.data) {
                setMessage({
                    text:
                        !result.ok && result.code === 'SIGN_IN'
                            ? 'Bitte melde dich an, um die Einkaufsliste zu nutzen.'
                            : 'Die Zutaten konnten nicht geladen werden.',
                    done: false,
                });
                return;
            }
            const sorted = [...result.data.lines].sort((a, b) => a.position - b.position);
            setLoaded({ servings: result.data.servings, lines: sorted });
            setSelected(new Set(sorted.map((line) => line.id)));
        });
        return () => {
            cancelled = true;
        };
    }, [open, loaded, recipeId]);

    const factor = loaded ? portionFactor(servings, loaded.servings) : 1;
    const count = loaded ? loaded.lines.filter((line) => selected.has(line.id)).length : 0;
    const lines = useMemo(() => loaded?.lines ?? [], [loaded]);

    const submit = () =>
        startTransition(async () => {
            const result = await addRecipeToShoppingList(recipeId, servings, {
                lineIds: [...selected],
            });
            setMessage(
                result.ok
                    ? {
                          text: `${result.data.added} ${result.data.added === 1 ? 'Zutat steht' : 'Zutaten stehen'} auf deiner Einkaufsliste.`,
                          done: true,
                      }
                    : { text: result.error, done: false },
            );
        });

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    setServings(initialServings);
                    setMessage(null);
                }
            }}
        >
            <Dialog.Trigger asChild>
                <Button variant="outline" size="sm" data-testid="add-to-shopping-list">
                    <ShoppingBasket size={16} aria-hidden="true" />
                    Auf die Einkaufsliste
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className={overlay} />
                <Dialog.Content className={content} aria-describedby={undefined}>
                    <div className={head}>
                        <Dialog.Title className={title}>Auf die Einkaufsliste</Dialog.Title>
                        <Dialog.Close className={closeButton} aria-label="Schließen">
                            <X size={18} aria-hidden="true" />
                        </Dialog.Close>
                    </div>

                    <div className={servingsRow}>
                        <span className={css({ flex: '1', fontSize: 'sm' })}>Portionen</span>
                        <button
                            type="button"
                            className={stepButton}
                            aria-label="Weniger Portionen"
                            disabled={servings <= 1}
                            onClick={() => setServings((value) => Math.max(1, value - 1))}
                        >
                            <Minus size={16} aria-hidden="true" />
                        </button>
                        <span
                            className={css({ minW: '8', textAlign: 'center', fontWeight: '700' })}
                            aria-live="polite"
                        >
                            {servings}
                        </span>
                        <button
                            type="button"
                            className={stepButton}
                            aria-label="Mehr Portionen"
                            disabled={servings >= 100}
                            onClick={() => setServings((value) => Math.min(100, value + 1))}
                        >
                            <Plus size={16} aria-hidden="true" />
                        </button>
                    </div>

                    <ul className={listBox}>
                        {lines.map((line) => {
                            const amount = [scaledAmount(line, factor), line.unit]
                                .filter(Boolean)
                                .join(' ');
                            return (
                                <li key={line.id}>
                                    <label className={lineRow}>
                                        <input
                                            type="checkbox"
                                            className={checkbox}
                                            checked={selected.has(line.id)}
                                            onChange={(event) =>
                                                setSelected((current) => {
                                                    const next = new Set(current);
                                                    if (event.target.checked) next.add(line.id);
                                                    else next.delete(line.id);
                                                    return next;
                                                })
                                            }
                                        />
                                        <span className={lineName}>
                                            {line.name}
                                            {line.isOptional && (
                                                <span className={optionalTag}>optional</span>
                                            )}
                                        </span>
                                        <span className={lineAmount}>{amount}</span>
                                    </label>
                                </li>
                            );
                        })}
                        {!loaded && !message && (
                            <li className={messageStyle} role="status">
                                Zutaten werden geladen …
                            </li>
                        )}
                    </ul>

                    <div className={footer}>
                        {message && (
                            <p className={messageStyle} role="status">
                                {message.text}{' '}
                                {message.done && (
                                    <Link href="/shopping-list" className={linkStyle}>
                                        Zur Liste
                                    </Link>
                                )}
                            </p>
                        )}
                        <Button onClick={submit} disabled={pending || count === 0}>
                            {pending
                                ? 'Wird hinzugefügt …'
                                : count === 0
                                  ? 'Keine Zutat gewählt'
                                  : `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} hinzufügen`}
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
