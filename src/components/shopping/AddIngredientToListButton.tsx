'use client';

import { ShoppingBasket } from 'lucide-react';
import { useTransition } from 'react';

import { addManualShoppingItem } from '@app/app/shopping-list/actions';
import { Button } from '@app/components/atoms/Button';
import { useToastContext } from '@app/components/providers/ToastProvider';

/** "Auf die Einkaufsliste" for a single ingredient (ingredient page): adds it to the own list. */
export function AddIngredientToListButton({ id, name }: { id: string; name: string }) {
    const { showToast } = useToastContext();
    const [pending, startTransition] = useTransition();

    const add = () =>
        startTransition(async () => {
            const result = await addManualShoppingItem({ name, ingredientId: id });
            showToast(
                result.ok
                    ? { type: 'success', title: `${name} steht auf der Einkaufsliste` }
                    : {
                          type: 'error',
                          title:
                              result.code === 'SIGN_IN'
                                  ? 'Bitte melde dich an, um die Einkaufsliste zu nutzen.'
                                  : result.error,
                      },
            );
        });

    return (
        <Button variant="secondary" size="sm" onClick={add} disabled={pending}>
            <ShoppingBasket size={16} aria-hidden="true" />
            Auf die Einkaufsliste
        </Button>
    );
}
