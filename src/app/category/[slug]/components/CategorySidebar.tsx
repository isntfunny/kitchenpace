import type { CategoryAggregateStats } from '@app/app/actions/category';
import type { RecipeCardData } from '@app/app/actions/recipes';
import type { TermFacet } from '@app/lib/recipeSearchTypes';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

import { CategoryStats } from './sidebar/CategoryStats';
import { DifficultyFilter } from './sidebar/DifficultyFilter';
import { TagIngredientCloud } from './sidebar/TagIngredientCloud';
import { TopRankedList } from './sidebar/TopRankedList';

// ─── Boring ingredient filter ────────────────────────────────────────────────

/** Generic staple ingredients that aren't interesting for discovery */
const BORING_INGREDIENTS = new Set([
    'salz',
    'pfeffer',
    'wasser',
    'öl',
    'zucker',
    'mehl',
    'ei',
    'eier',
    'butter',
    'milch',
    'olivenöl',
    'knoblauch',
    'zwiebel',
    'sahne',
    'backpulver',
    'vanillezucker',
    'jodsalz',
    'sonnenblumenöl',
    'rapsöl',
    'petersilie',
    'paprikapulver',
    'muskatnuss',
    'oregano',
    'thymian',
    'essig',
    'senf',
    'tomatenmark',
    'gemüsebrühe',
    'hühnerbrühe',
]);

function filterBoringIngredients(ingredients: TermFacet): TermFacet {
    return ingredients.filter((i) => !BORING_INGREDIENTS.has(i.key.toLowerCase()));
}

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
    const interestingIngredients = filterBoringIngredients(ingredients);
    const filteredTopIngredient =
        topIngredient && BORING_INGREDIENTS.has(topIngredient.toLowerCase())
            ? (interestingIngredients[0]?.key ?? null)
            : topIngredient;

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
                <CategoryStats
                    stats={aggregateStats}
                    topIngredient={filteredTopIngredient}
                    categorySlug={categorySlug}
                />
                <TopRankedList recipes={topByViews} />
                <TagIngredientCloud
                    tags={tags}
                    ingredients={interestingIngredients}
                    categorySlug={categorySlug}
                />
            </div>
        </aside>
    );
}
