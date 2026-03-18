import { fetchTrendingTags } from '@app/app/actions/community';
import { TrendingTags } from '@app/components/features/TrendingTags';

export async function TrendingTagsSection() {
    const tags = await fetchTrendingTags();
    return <TrendingTags tags={tags} />;
}
