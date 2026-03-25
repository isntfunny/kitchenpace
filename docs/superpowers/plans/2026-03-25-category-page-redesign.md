# Category Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monotonous category landing page (identical horizontal scrolls, empty sidebar) with a dynamic discovery hub featuring varied section types and a rich sidebar.

**Architecture:** Server-side data fetching in the RSC page component using `Promise.allSettled()` (existing pattern). New components for each section type. OpenSearch for tag/ingredient aggregations. Server action for random recipe (client component). Seasonal teaser rendered above PageShell for full-width.

**Tech Stack:** Next.js 16 App Router, Panda CSS, Prisma 7, OpenSearch, `@xyflow/react` (not used here), Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-25-category-page-redesign-design.md`

---

## File Map

### New Files

| File                                                                | Responsibility                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/app/category/[slug]/components/FeaturedTrio.tsx`               | 3-column grid of top cooked recipes with gradient cards |
| `src/app/category/[slug]/components/RandomRecipeSpotlight.tsx`      | Client component, calls server action for random recipe |
| `src/app/category/[slug]/components/CommunityPulse.tsx`             | Horizontal row of 3 recent activity cards               |
| `src/app/category/[slug]/components/SeasonalTeaserBar.tsx`          | Full-width conditional bar above PageShell              |
| `src/app/category/[slug]/components/CategorySidebar.tsx`            | Container for all 4 sidebar modules                     |
| `src/app/category/[slug]/components/sidebar/DifficultyFilter.tsx`   | 3-row difficulty quick filter                           |
| `src/app/category/[slug]/components/sidebar/CategoryStats.tsx`      | Key-value stats list                                    |
| `src/app/category/[slug]/components/sidebar/TopRankedList.tsx`      | Numbered top-5 recipe list                              |
| `src/app/category/[slug]/components/sidebar/TagIngredientCloud.tsx` | Flex-wrap clickable tag/ingredient chips                |

### Modified Files

| File                                                 | Changes                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/lib/recipe-card.ts`                             | Add `cookCount`, `ratingCount`, `viewCount` to `RecipeCardData`; update `toRecipeCardData()` |
| `src/components/features/HorizontalRecipeScroll.tsx` | Add `cardVariant` prop                                                                       |
| `src/app/actions/category.ts`                        | Add 6 new query functions + `getRandomCategoryRecipe` server action                          |
| `src/lib/recipeSearch.ts`                            | Add `fetchCategoryFacets()` OpenSearch helper                                                |
| `src/app/category/[slug]/page.tsx`                   | Wire up new data fetches, render SeasonalTeaserBar above PageShell                           |
| `src/app/category/[slug]/CategoryLanding.tsx`        | Replace layout with new section structure                                                    |

---

## Task 1: Extend RecipeCardData type and mapper

**Files:**

- Modify: `src/lib/recipe-card.ts`

- [ ] **Step 1: Add new optional fields to RecipeCardData interface**

In `src/lib/recipe-card.ts`, add after the `difficulty` field:

```typescript
cookCount?: number;
ratingCount?: number;
viewCount?: number;
```

- [ ] **Step 2: Update toRecipeCardData mapper to populate new fields**

In the `toRecipeCardData` function body, add these lines (the Prisma result already has these fields on the Recipe model):

```typescript
cookCount: recipe.cookCount ?? undefined,
ratingCount: recipe.ratingCount ?? undefined,
viewCount: recipe.viewCount ?? undefined,
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```
git add src/lib/recipe-card.ts
git commit -m "feat(category): extend RecipeCardData with cookCount/ratingCount/viewCount"
```

---

## Task 2: Add cardVariant prop to HorizontalRecipeScroll

**Files:**

- Modify: `src/components/features/HorizontalRecipeScroll.tsx`

- [ ] **Step 1: Add cardVariant prop to interface**

Add to `HorizontalRecipeScrollProps`:

```typescript
cardVariant?: 'compact' | 'default';
```

- [ ] **Step 2: Pass variant through to RecipeCard**

Change the `RecipeCard` render to use `variant={cardVariant ?? 'compact'}` instead of hardcoded `variant="compact"`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```
git add src/components/features/HorizontalRecipeScroll.tsx
git commit -m "feat(category): add cardVariant prop to HorizontalRecipeScroll"
```

---

## Task 3: Add new data-fetching queries to category actions

**Files:**

- Modify: `src/app/actions/category.ts`

- [ ] **Step 1: Add `fetchCategoryMostCooked` (top 3 by cookCount)**

`fetchCategoryMostCooked(categoryId, take = 8)` already exists with a `take` parameter. No new function needed — call with `take: 3` from page.tsx.

- [ ] **Step 2: Add `fetchCategoryTopByViews` query**

```typescript
export async function fetchCategoryTopByViews(
    categoryId: string,
    take = 5,
): Promise<RecipeCardData[]> {
    const recipes = await prisma.recipe.findMany({
        where: publishedInCategory(categoryId),
        include: { categories: { include: { category: true } } },
        orderBy: { viewCount: 'desc' },
        take,
    });
    return recipes.map(toRecipeCardData);
}
```

- [ ] **Step 3: Add `fetchCategoryDifficultyStats` query**

```typescript
export async function fetchCategoryDifficultyStats(
    categoryId: string,
): Promise<Record<string, number>> {
    const groups = await prisma.recipe.groupBy({
        by: ['difficulty'],
        where: publishedInCategory(categoryId),
        _count: { id: true },
    });
    const result: Record<string, number> = {};
    for (const g of groups) {
        if (g.difficulty) result[g.difficulty] = g._count.id;
    }
    return result;
}
```

- [ ] **Step 4: Add `fetchCategoryAggregateStats` query**

```typescript
export interface CategoryAggregateStats {
    avgTime: number | null;
    avgCalories: number | null;
    caloriesCoverage: number; // fraction of recipes with calories > 0
    fastestRecipe: { title: string; slug: string; time: number } | null;
    mostPopularRecipe: { title: string; slug: string } | null;
}

export async function fetchCategoryAggregateStats(
    categoryId: string,
): Promise<CategoryAggregateStats> {
    const where = publishedInCategory(categoryId);

    const [agg, total, withCalories, fastest, popular] = await Promise.all([
        prisma.recipe.aggregate({
            where,
            _avg: { totalTime: true, calories: true },
        }),
        prisma.recipe.count({ where }),
        prisma.recipe.count({ where: { ...where, calories: { gt: 0 } } }),
        prisma.recipe.findFirst({
            where: { ...where, totalTime: { gt: 0 } },
            orderBy: { totalTime: 'asc' },
            select: { title: true, slug: true, totalTime: true },
        }),
        prisma.recipe.findFirst({
            where,
            orderBy: { viewCount: 'desc' },
            select: { title: true, slug: true },
        }),
    ]);

    return {
        avgTime: agg._avg.totalTime ? Math.round(agg._avg.totalTime) : null,
        avgCalories: agg._avg.calories ? Math.round(agg._avg.calories) : null,
        caloriesCoverage: total > 0 ? withCalories / total : 0,
        fastestRecipe: fastest
            ? { title: fastest.title, slug: fastest.slug, time: fastest.totalTime ?? 0 }
            : null,
        mostPopularRecipe: popular ? { title: popular.title, slug: popular.slug } : null,
    };
}
```

- [ ] **Step 5: Add `getRandomCategoryRecipe` server action**

```typescript
// No 'use server' needed — category.ts already has file-level directive
export async function getRandomCategoryRecipe(
    categorySlug: string,
): Promise<RecipeCardData | null> {
    const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
    });
    if (!category) return null;

    const count = await prisma.recipe.count({
        where: publishedInCategory(category.id),
    });
    if (count === 0) return null;

    const skip = Math.floor(Math.random() * count);
    const recipes = await prisma.recipe.findMany({
        where: publishedInCategory(category.id),
        include: { categories: { include: { category: true } } },
        skip,
        take: 1,
    });
    return recipes[0] ? toRecipeCardData(recipes[0]) : null;
}
```

- [ ] **Step 6: Add `fetchActiveSeasonalRecipes` query**

This function intersects an active FOOD_PERIOD's tags with the current category to find seasonal recipes:

```typescript
export async function fetchActiveSeasonalRecipes(
    categoryId: string,
    filterSet: FilterSetWithRelations,
    take = 4,
): Promise<RecipeCardData[]> {
    const tagNames = filterSet.tags.map((t) => t.tag.name);
    if (tagNames.length === 0) return [];

    const recipes = await prisma.recipe.findMany({
        where: {
            ...publishedInCategory(categoryId),
            tags: { some: { tag: { name: { in: tagNames } } } },
        },
        include: { categories: { include: { category: true } } },
        orderBy: { rating: 'desc' },
        take,
    });
    return recipes.map(toRecipeCardData);
}
```

Import `FilterSetWithRelations` from `@app/lib/fits-now/db-queries`.

- [ ] **Step 7: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 8: Commit**

```
git add src/app/actions/category.ts
git commit -m "feat(category): add new query functions for redesigned landing page"
```

---

## Task 4: Add OpenSearch category facets helper

**Files:**

- Modify: `src/lib/recipeSearch.ts`

- [ ] **Step 1: Add `fetchCategoryFacets` function**

Add at the end of the file. Follow the existing `queryRecipes` pattern for OpenSearch client usage. Import `opensearchClient` and index constant from `shared/opensearch/client`.

```typescript
export async function fetchCategoryFacets(
    categorySlug: string,
    tagLimit = 10,
    ingredientLimit = 10,
): Promise<{ tags: TermFacet; ingredients: TermFacet; difficulties: TermFacet }> {
    const { body } = await opensearchClient.search({
        index: OPENSEARCH_INDEX,
        body: {
            size: 0,
            query: {
                bool: {
                    filter: [{ term: { status: 'PUBLISHED' } }, { term: { categorySlug } }],
                },
            },
            aggs: {
                tags: { terms: { field: 'tags', size: tagLimit } },
                ingredients: { terms: { field: 'ingredients', size: ingredientLimit } },
                difficulties: { terms: { field: 'difficulty', size: 5 } },
            },
        },
    });

    const aggs = body.aggregations as
        | Record<string, { buckets?: Array<{ key: string; doc_count: number }> }>
        | undefined;
    return {
        tags: buildTermsAggregation(aggs?.tags?.buckets),
        ingredients: buildTermsAggregation(aggs?.ingredients?.buckets),
        difficulties: buildTermsAggregation(aggs?.difficulties?.buckets),
    };
}
```

Note: `buildTermsAggregation` takes a flat bucket array (not `(aggs, key)`). Follow the same pattern used in `queryRecipes()` which extracts `.buckets` from each aggregation before passing to `buildTermsAggregation`.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```
git add src/lib/recipeSearch.ts
git commit -m "feat(category): add fetchCategoryFacets OpenSearch helper"
```

---

## Task 5: Build sidebar components

**Files:**

- Create: `src/app/category/[slug]/components/sidebar/DifficultyFilter.tsx`
- Create: `src/app/category/[slug]/components/sidebar/CategoryStats.tsx`
- Create: `src/app/category/[slug]/components/sidebar/TopRankedList.tsx`
- Create: `src/app/category/[slug]/components/sidebar/TagIngredientCloud.tsx`
- Create: `src/app/category/[slug]/components/CategorySidebar.tsx`

- [ ] **Step 1: Create DifficultyFilter component**

3 clickable rows (Einfach/Mittel/Anspruchsvoll) with count badges. Each row is an `<a>` linking to `/recipes?category={categorySlug}&difficulty={level}`. Use Panda CSS. Colors: green for Einfach, orange for Mittel, pink for Anspruchsvoll.

Props: `{ counts: Record<string, number>; categorySlug: string }`

- [ ] **Step 2: Create CategoryStats component**

Key-value list with separators. Props: `{ stats: CategoryAggregateStats; topIngredient: string | null }`.

Show rows conditionally:

- Ø Zubereitungszeit: always if `avgTime` exists
- Ø Kalorien: only if `caloriesCoverage > 0.5`
- Top-Zutat: only if `topIngredient` is non-null
- Schnellstes: link to recipe if `fastestRecipe` exists
- Beliebtestes: link to recipe if `mostPopularRecipe` exists

- [ ] **Step 3: Create TopRankedList component**

Numbered list 1-5 with thumbnail, title, rating + cook count. Each item is a link to the recipe. Props: `{ recipes: RecipeCardData[] }`. Use `SmartImage` for thumbnails (32x32, aspect `'1:1'`).

- [ ] **Step 4: Create TagIngredientCloud component**

Flex-wrap chips. Tags get pink background + `#` prefix, ingredients get orange background. Each chip links to `/recipes?category={categorySlug}&tags={name}` or `&ingredients={name}`. Show count in parentheses. Props: `{ tags: TermFacet; ingredients: TermFacet; categorySlug: string }`. Hide entire component if combined length < 3.

- [ ] **Step 5: Create CategorySidebar wrapper**

Composes all 4 sidebar modules in a sticky column. Props contain all sidebar data. Wraps in `position: sticky; top: 100px` container. Hidden below `lg` breakpoint.

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```
git add src/app/category/[slug]/components/sidebar/ src/app/category/[slug]/components/CategorySidebar.tsx
git commit -m "feat(category): add sidebar components (difficulty, stats, top5, tags)"
```

---

## Task 6: Build main content components

**Files:**

- Create: `src/app/category/[slug]/components/FeaturedTrio.tsx`
- Create: `src/app/category/[slug]/components/RandomRecipeSpotlight.tsx`
- Create: `src/app/category/[slug]/components/CommunityPulse.tsx`

- [ ] **Step 1: Create FeaturedTrio component**

3-column grid. Each card: gradient background using `categoryColor`, recipe image via `SmartImage` as background, cook count badge top-left, title + rating + time at bottom. Props: `{ recipes: RecipeCardData[]; categoryColor: string }`. Return null if `recipes.length === 0`. On mobile <= 480px: horizontal scroll instead of grid.

- [ ] **Step 2: Create RandomRecipeSpotlight client component**

`'use client'` component. Props: `{ categorySlug: string }`.

- On mount: call `getRandomCategoryRecipe(categorySlug)` server action
- State: `recipe: RecipeCardData | null`, `loading: boolean`
- Layout: horizontal card with purple gradient (`#ede7f6` → `#d1c4e9`), recipe image left (or dice emoji placeholder), recipe details center, "Neues 🎲" button right
- Loading state: skeleton matching dimensions
- "Neues" button: calls server action again, shows spinning state
- Mobile: stacks vertically

- [ ] **Step 3: Create CommunityPulse component**

Horizontal row of 3 activity cards. Each card: user avatar circle + "{Name} hat {Recipe} {action}" + relative time. Props: `{ activities: ActivityFeedItem[] }`. Return null if `activities.length < 3`. User avatars use `SmartImage` with userId if `userPhotoKey` exists, else colored circle with initial.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```
git add src/app/category/[slug]/components/FeaturedTrio.tsx src/app/category/[slug]/components/RandomRecipeSpotlight.tsx src/app/category/[slug]/components/CommunityPulse.tsx
git commit -m "feat(category): add main content components (trio, random, pulse)"
```

---

## Task 7: Build SeasonalTeaserBar

**Files:**

- Create: `src/app/category/[slug]/components/SeasonalTeaserBar.tsx`

- [ ] **Step 1: Create SeasonalTeaserBar component**

Full viewport width bar with centered content. Props: `{ period: FilterSetWithRelations; recipes: RecipeCardData[]; categorySlug: string }`.

Import: `import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries'`

Layout:

- Left: period label + description
- Center: 3-4 compact recipe cards (reuse `RecipeCard` variant `compact`)
- Right: "Alle →" link to `/recipes?category={categorySlug}` with period's tags/categories as query params

Return null if `recipes.length === 0`.

Gradient background: warm yellow (`#fff8e1` → `#ffecb3`).
Mobile: stack vertically — title above, cards as horizontal scroll below.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```
git add src/app/category/[slug]/components/SeasonalTeaserBar.tsx
git commit -m "feat(category): add SeasonalTeaserBar component"
```

---

## Task 8: Wire up page.tsx and CategoryLanding.tsx

**Files:**

- Modify: `src/app/category/[slug]/page.tsx`
- Modify: `src/app/category/[slug]/CategoryLanding.tsx`

- [ ] **Step 1: Update page.tsx data fetching**

**Important notes:**

- All Prisma query functions take `category.id` (UUID), NOT `category.slug`
- `fetchCategoryFacets` (OpenSearch) takes `category.slug` (the indexed field is `categorySlug`)
- `fetchCategoryActivity` already exists and takes `category.id` — keep it in the fetch block
- `CategoryLanding.tsx` is `'use client'` — all sub-components must receive data as props (no async components inside)

Add new parallel fetches inside `Promise.allSettled`:

- `fetchCategoryMostCooked(category.id, 3)` — already exists, just change `take` from 8 to 3
- `fetchCategoryTopByViews(category.id, 5)` — new
- `fetchCategoryDifficultyStats(category.id)` — new
- `fetchCategoryAggregateStats(category.id)` — new
- `fetchCategoryFacets(category.slug)` — new, OpenSearch (uses slug)
- `detectContext()` — import from `@app/lib/fits-now/context`

For the seasonal teaser, after `Promise.allSettled`:

```typescript
const detectResult = safe(results[indexOfDetectContext], { context: null, activePeriods: [] });
const activePeriod = detectResult.activePeriods[0]?.filterSet ?? null;
let seasonalRecipes: RecipeCardData[] = [];
if (activePeriod) {
    seasonalRecipes = await fetchActiveSeasonalRecipes(category.id, activePeriod, 4);
}
```

Render `SeasonalTeaserBar` **above** `<PageShell>` conditionally:

```tsx
{
    activePeriod && seasonalRecipes.length > 0 && (
        <SeasonalTeaserBar
            period={activePeriod}
            recipes={seasonalRecipes}
            categorySlug={category.slug}
        />
    );
}
<PageShell>{/* existing hero + CategoryLanding */}</PageShell>;
```

Pass all results (with `safe()` fallbacks) to `CategoryLanding`.

- [ ] **Step 2: Update CategoryLanding props interface**

Add new props:

```typescript
mostCooked: RecipeCardData[];      // replaces old mostCooked (now take 3)
topByViews: RecipeCardData[];      // new: top 5 for sidebar
difficultyStats: Record<string, number>;
aggregateStats: CategoryAggregateStats;
facets: { tags: TermFacet; ingredients: TermFacet };
```

Remove props that are no longer used: `quick`, `popular` (replaced by new sections).

- [ ] **Step 3: Rewrite CategoryLanding layout**

Replace the current 12-column grid with the new structure:

```
<div className={grid({ columns: { base: 1, lg: '1fr 220px' }, gap: '4' })}>
  {/* Main content */}
  <div className={flex({ direction: 'column', gap: '5' })}>
    <FeaturedTrio recipes={mostCooked} categoryColor={category.color} />
    <RecipeSection title="Neueste Rezepte" icon="clock" ...>
      <HorizontalRecipeScroll recipes={newest} />
    </RecipeSection>
    <RecipeSection title="Bestbewertet" icon="star" ...>
      <HorizontalRecipeScroll recipes={topRated} cardVariant="default" />
    </RecipeSection>
    <RandomRecipeSpotlight categorySlug={category.slug} />
    <CommunityPulse activities={activity} />
    {/* CTA button */}
  </div>

  {/* Sidebar */}
  <CategorySidebar
    difficultyStats={difficultyStats}
    aggregateStats={aggregateStats}
    topByViews={topByViews}
    tags={facets.tags}
    ingredients={facets.ingredients}
    categorySlug={category.slug}
    topIngredient={facets.ingredients[0]?.key ?? null}
  />
</div>
```

Keep the existing Hero Banner section unchanged. Keep the `RecipeSection` helper component (icon + title wrapper) — reuse for the two scroll sections.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Visual check**

Run: `npm run dev` and navigate to `/category/dessert` (or any category with data). Verify:

- Seasonal teaser shows above hero if a FOOD_PERIOD is active
- Featured trio shows 3 large cards
- Neueste and Bestbewertet scroll sections have different card sizes
- Random spotlight loads a recipe and "Neues" button works
- Community pulse shows 3 activity cards (or is hidden if < 3)
- Sidebar shows all 4 modules
- On mobile (< 1024px): sidebar hidden, sections stack full-width

- [ ] **Step 6: Commit**

```
git add src/app/category/[slug]/page.tsx src/app/category/[slug]/CategoryLanding.tsx
git commit -m "feat(category): wire up redesigned landing page with all new sections"
```

---

## Task 9: Responsive polish and empty states

**Files:**

- Modify: Various components from tasks 5-7

- [ ] **Step 1: Verify empty states**

Test with a category that has:

- No activity → Community Pulse should be hidden
- Few recipes → Featured Trio shows 1-2 cards or hides
- No active FOOD_PERIOD → Seasonal teaser hidden entirely

- [ ] **Step 2: Test mobile breakpoints**

Resize to 700px and 375px. Check:

- Sidebar hidden at < 1024px
- Featured Trio: 3 cols at > 480px, horizontal scroll at <= 480px
- Random Spotlight: stacked layout
- All horizontal scrolls work

- [ ] **Step 3: Fix any responsive issues found**

Adjust Panda CSS breakpoints and spacing as needed.

- [ ] **Step 4: Run lint and format**

```
npm run lint
npm run format:check
```

Fix any issues.

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "fix(category): responsive polish and empty state handling"
```

---

## Task 10: Clean up removed code

**Files:**

- Modify: `src/app/actions/category.ts`
- Modify: `src/app/category/[slug]/page.tsx`

- [ ] **Step 1: Verify no external callers, then remove unused query functions**

First verify no other files import these functions:

```
grep -r "fetchCategoryPopular\|fetchCategoryQuickRecipes" src/
```

Expected: only `category.ts` definition and old `page.tsx` references (which were removed in Task 8).

Then remove `fetchCategoryPopular` and `fetchCategoryQuickRecipes` from `category.ts`.

- [ ] **Step 2: Remove unused imports and props**

Clean up `page.tsx` and `CategoryLanding.tsx` — remove references to `quick`, `popular` props and their data fetches.

- [ ] **Step 3: Verify build and lint**

```
npx tsc --noEmit && npm run lint
```

- [ ] **Step 4: Commit**

```
git add src/app/actions/category.ts src/app/category/[slug]/page.tsx src/app/category/[slug]/CategoryLanding.tsx
git commit -m "refactor(category): remove unused query functions and props"
```
