import { Clock } from 'lucide-react';

import { fetchNewestRecipes } from '@app/app/actions/recipes';
import { RecipeScrollServer } from '@app/components/features/RecipeScrollServer';
import { PALETTE } from '@app/lib/palette';

export async function NewestRecipesSection() {
    const recipes = await fetchNewestRecipes();
    return (
        <RecipeScrollServer
            title="Neuste Rezepte"
            recipes={recipes}
            icon={Clock}
            accentColor={PALETTE.orange}
        />
    );
}
