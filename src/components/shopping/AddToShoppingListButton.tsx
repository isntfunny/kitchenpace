'use client';

import { ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { addRecipeToShoppingList } from '@app/app/shopping-list/actions';
import { Button } from '@app/components/atoms/Button';

import { css } from 'styled-system/css';

const messageStyle = css({ fontFamily: 'body', fontSize: 'sm', color: 'text-muted' });
const linkStyle = css({
    color: 'primary',
    fontWeight: '500',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
});

/**
 * "Auf die Einkaufsliste" (KUC-104): puts all ingredients of the recipe, scaled
 * to the chosen servings, on the user's own list. The selection dialog with
 * pre-checked ingredients comes with KUC-105.
 */
export function AddToShoppingListButton({
    recipeId,
    servings,
}: {
    recipeId: string;
    servings: number;
}) {
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ text: string; done: boolean } | null>(null);

    const add = () =>
        startTransition(async () => {
            const result = await addRecipeToShoppingList(recipeId, servings);
            if (!result.ok) {
                setMessage({
                    text:
                        result.code === 'SIGN_IN'
                            ? 'Bitte melde dich an, um die Einkaufsliste zu nutzen.'
                            : result.error,
                    done: false,
                });
                return;
            }
            const count = result.data.added;
            setMessage({
                text:
                    count === 0
                        ? 'Das Rezept hat keine Zutaten.'
                        : `${count} ${count === 1 ? 'Zutat steht' : 'Zutaten stehen'} auf deiner Einkaufsliste.`,
                done: count > 0,
            });
        });

    return (
        <div
            className={css({ display: 'flex', flexDirection: 'column', gap: '2', mb: '3' })}
            data-testid="add-to-shopping-list"
        >
            <Button variant="secondary" size="sm" onClick={add} disabled={pending}>
                <ShoppingBasket size={16} aria-hidden="true" />
                {pending ? 'Wird hinzugefügt…' : 'Auf die Einkaufsliste'}
            </Button>
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
        </div>
    );
}
