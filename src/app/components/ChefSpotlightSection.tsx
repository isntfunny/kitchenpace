import { fetchChefSpotlight } from '@app/app/actions/community';
import { ChefSpotlight } from '@app/components/features/ChefSpotlight';

export async function ChefSpotlightSection() {
    const chef = await fetchChefSpotlight();
    return <ChefSpotlight chef={chef} />;
}
