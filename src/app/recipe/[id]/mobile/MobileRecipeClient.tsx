'use client';

import { useEffect } from 'react';

import { RecipeStepsViewer } from '@app/components/flow/RecipeStepsViewer';

import { css } from 'styled-system/css';

import type { Recipe } from '../data';

type MobileRecipeClientProps = {
    recipe: Recipe;
};

export function MobileRecipeClient({ recipe }: MobileRecipeClientProps) {
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
                overflow: 'hidden',
            })}
        >
            <RecipeStepsViewer
                nodes={(recipe.flow?.nodes ?? []) as any}
                edges={(recipe.flow?.edges ?? []) as any}
                ingredients={recipe.ingredients?.map((ing: any) => ({
                    id: ing.id ?? ing.name,
                    name: ing.name,
                    amount: ing.amount?.toString(),
                    unit: ing.unit,
                }))}
                embedded
            />
        </div>
    );
}
