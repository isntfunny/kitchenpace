'use client';

import { ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { addRecipeToShoppingList, getRecipeShoppingLines } from '@app/app/shopping-list/actions';
import { Button } from '@app/components/atoms/Button';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { Sheet } from '@app/components/ui/Sheet';
import { portionFactor } from '@app/lib/ingredients/quantities';
import { scaledAmount, type RecipeLine } from '@app/lib/shopping/recipe-items';

import { css } from 'styled-system/css';

const listBox = css({ m: '0', p: '0', listStyle: 'none' });
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
const footer = css({ display: 'flex', flexDirection: 'column', gap: '2', pt: '4' });
const servingsRow = css({
    pb: '3',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderColor: 'border.muted',
});
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
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    setServings(initialServings);
                    setMessage(null);
                }
            }}
            title="Auf die Einkaufsliste"
            size="sm"
            trigger={
                <Button variant="outline" size="sm" data-testid="add-to-shopping-list">
                    <ShoppingBasket size={16} aria-hidden="true" />
                    Auf die Einkaufsliste
                </Button>
            }
        >
            <div className={servingsRow}>
                <ServingsStepper
                    value={servings}
                    onChange={setServings}
                    layout="inline"
                    size="sm"
                />
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
                <Button variant="primary" onClick={submit} disabled={pending || count === 0}>
                    {pending
                        ? 'Wird hinzugefügt …'
                        : count === 0
                          ? 'Keine Zutat gewählt'
                          : `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} hinzufügen`}
                </Button>
            </div>
        </Sheet>
    );
}
