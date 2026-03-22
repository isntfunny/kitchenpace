import { fetchFitsNowRecipes } from '@app/app/actions/recipes';

import { FitsNowClient } from './FitsNowClient';

export async function FitsNow() {
    const { recipes, context } = await fetchFitsNowRecipes(undefined, 3);

    return <FitsNowClient initialRecipes={recipes} initialContext={context} />;
}
