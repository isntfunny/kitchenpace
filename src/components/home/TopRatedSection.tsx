import { Star } from 'lucide-react';

import { fetchTopRatedRecipes } from '@app/app/actions/recipes';
import { RecipeScrollServer } from '@app/components/features/RecipeScrollServer';
import { PALETTE } from '@app/lib/palette';

export async function TopRatedSection() {
    const recipes = await fetchTopRatedRecipes();
    return (
        <RecipeScrollServer
            title="Top Rated"
            recipes={recipes}
            icon={Star}
            accentColor={PALETTE.gold}
        />
    );
}
