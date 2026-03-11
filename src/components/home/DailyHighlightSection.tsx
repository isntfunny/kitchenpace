import { fetchFeaturedRecipe } from '@app/app/actions/recipes';
import { FadeInSection } from '@app/components/motion/FadeInSection';
import { DailyHighlight } from '@app/components/sections/DailyHighlight';

export async function DailyHighlightSection() {
    const recipe = await fetchFeaturedRecipe();
    return (
        <FadeInSection>
            <DailyHighlight recipe={recipe} />
        </FadeInSection>
    );
}
