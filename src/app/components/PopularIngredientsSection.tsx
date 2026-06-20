import { fetchPopularIngredients } from '@app/app/actions/community';
import { PopularIngredients } from '@app/components/features/PopularIngredients';

export async function PopularIngredientsSection() {
    const ingredients = await fetchPopularIngredients(18);
    return <PopularIngredients ingredients={ingredients} />;
}
