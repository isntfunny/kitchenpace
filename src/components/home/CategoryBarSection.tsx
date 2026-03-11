import { fetchCategoriesForBar } from '@app/app/actions/category';
import { CategoryBar } from '@app/components/features/CategoryBar';

export async function CategoryBarSection() {
    const categories = await fetchCategoriesForBar();
    return <CategoryBar categories={categories} />;
}
