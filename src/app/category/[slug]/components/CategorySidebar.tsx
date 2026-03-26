import type { CategoryAggregateStats } from '@app/app/actions/category';
import type { RecipeCardData } from '@app/app/actions/recipes';
import type { TermFacet } from '@app/lib/recipeSearchTypes';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { CategoryStats } from './sidebar/CategoryStats';
import { DifficultyFilter } from './sidebar/DifficultyFilter';
import { TagIngredientCloud } from './sidebar/TagIngredientCloud';
import { TopRankedList } from './sidebar/TopRankedList';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategorySidebarProps {
    difficultyStats: Record<string, number>;
    aggregateStats: CategoryAggregateStats;
    topByViews: RecipeCardData[];
    tags: TermFacet;
    ingredients: TermFacet;
    categorySlug: string;
    topIngredient: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategorySidebar({
    difficultyStats,
    aggregateStats,
    topByViews,
    tags,
    ingredients,
    categorySlug,
    topIngredient,
}: CategorySidebarProps) {
    return (
        <aside
            className={css({
                display: 'none',
                lg: { display: 'block' },
                position: 'sticky',
                top: '100px',
                alignSelf: 'flex-start',
            })}
        >
            <div className={flex({ direction: 'column', gap: '4' })}>
                <DifficultyFilter counts={difficultyStats} categorySlug={categorySlug} />
                <CategoryStats stats={aggregateStats} topIngredient={topIngredient} />
                <TopRankedList recipes={topByViews} />
                <TagIngredientCloud
                    tags={tags}
                    ingredients={ingredients}
                    categorySlug={categorySlug}
                />
            </div>
        </aside>
    );
}
