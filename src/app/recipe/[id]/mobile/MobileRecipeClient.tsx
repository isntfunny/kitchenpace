'use client';

import { useEffect, useState } from 'react';

import { RecipeStepsViewer } from '@app/components/flow/RecipeStepsViewer';
import { servingCount } from '@app/lib/cast-recipe';

import { css } from 'styled-system/css';

import type { Recipe } from '../data';

type MobileRecipeClientProps = {
    recipe: Recipe;
    initialServings?: number;
};

export function MobileRecipeClient({ recipe, initialServings }: MobileRecipeClientProps) {
    const [servings, setServings] = useState(() => servingCount(initialServings, recipe.servings));
    // Hide Chatwoot widget on embedded mobile view
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent =
            '.woot-widget-bubble, .woot-widget-holder { display: none !important; }';
        document.head.appendChild(style);
        return () => style.remove();
    }, []);

    return (
        <div
            className={css({
                width: '100vw',
                height: '100vh',
                overflow: 'auto',
            })}
        >
            <label
                style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                }}
            >
                Portionen
                <input
                    aria-label="Portionen"
                    type="number"
                    min="1"
                    step="1"
                    value={servings}
                    style={{ width: 72 }}
                    onChange={(event) => setServings(servingCount(event.target.value, servings))}
                />
            </label>
            <RecipeStepsViewer
                servings={servings}
                originalServings={recipe.servings}
                nodes={(recipe.flow?.nodes ?? []) as any}
                edges={(recipe.flow?.edges ?? []) as any}
                ingredients={recipe.ingredients?.map((ing: any) => ({
                    id: ing.id,
                    ingredientId: ing.ingredientId,
                    name: ing.name,
                    amount: ing.rawAmount ?? ing.amount?.toString(),
                    unit: ing.unit,
                    notes: ing.notes,
                }))}
                embedded
            />
        </div>
    );
}
