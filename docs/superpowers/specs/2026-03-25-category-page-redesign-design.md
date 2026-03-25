# Category Page Redesign — Design Spec

**Date:** 2026-03-25
**Goal:** Transform category landing pages from repetitive horizontal-scroll layouts into a dynamic discovery hub with varied section types, a rich sidebar, and seasonal context — all fully automatic with zero manual curation.

## Design Principles

1. **Visual variety** — no two adjacent sections look the same (grid vs scroll vs spotlight vs activity)
2. **Zero curation** — every section auto-populates from existing DB data (ratings, cook counts, activity logs, FilterSets)
3. **Sidebar = nice-to-have** — enriching context, not critical content. Hidden on mobile.
4. **~4 viewport heights max** — enough to explore, not enough to overwhelm
5. **Existing hero banner unchanged** — no additional hero element needed

## Page Structure (top to bottom)

### Full-Width Elements

#### 1. Hero Banner (EXISTING — no changes)

- Category name, icon, description, recipe count pill
- Animated gradient background with category color

#### 2. Seasonal Teaser Bar (CONDITIONAL)

- **Visible only when** a FOOD_PERIOD FilterSet is currently active (via `detectContext()`)
- **Layout:** Horizontal bar — left: emoji + period name + subtitle; center: 3-4 compact recipe cards from that period filtered to current category; right: "Alle →" link
- **Data source:** `detectContext()` returns active FOOD_PERIOD → fetch recipes matching that FilterSet's tags/categories intersected with current category
- **Link target:** `/recipes?category={slug}&filterSet={foodPeriodId}`
- **Mobile:** Stacks vertically — title above, cards as horizontal scroll below

### Main + Sidebar Grid (Desktop: `1fr 220px`, gap 16px)

On mobile (< 1024px): Sidebar hidden entirely. Main goes full-width.

### Main Content (left column)

#### 3. Featured Trio — "Meistgekocht"

- **Layout:** 3-column grid of large cards with gradient background (category color)
- **Card content:** Recipe image as background, cook count badge (top-left), title + rating + time (bottom)
- **Data:** Top 3 recipes by `cookCount DESC` in this category
- **Mobile:** 3 columns stay, cards get shorter

#### 4. Neueste Rezepte (compact horizontal scroll)

- **Layout:** `HorizontalRecipeScroll` with `compact` variant cards (existing component)
- **Card size:** Small — ~130px width, 65px image height
- **Data:** `createdAt DESC`, take 8
- **Unchanged from current** except for visual context (now follows the Trio instead of leading)

#### 5. Bestbewertet (larger horizontal scroll)

- **Layout:** `HorizontalRecipeScroll` but with **larger cards** (~160px width, 85px image height)
- **Rating prominent:** Full 5-star visual + numeric rating below title
- **Additional meta:** Time + difficulty shown
- **Data:** `rating DESC, ratingCount DESC`, take 8
- **Differentiation from "Neueste":** Bigger cards, star rating visually dominant — breaks the monotony

#### 6. Zufalls-Entdecker (Random Recipe Spotlight)

- **Layout:** Horizontal card with purple/violet gradient background
    - Left: Recipe image or dice emoji placeholder (90x70px)
    - Center: "Zufaelliger Fund" label, recipe title (large), rating + time + difficulty, description snippet (1-line italic)
    - Right: "Neues 🎲" button
- **Data:** 1 random published recipe from this category (server-side `ORDER BY random() LIMIT 1` or equivalent)
- **"Neues" button:** Client-side fetch to `/api/category/{slug}/random` → replaces card content without page reload
- **Mobile:** Stacks — image on top, text below, button full-width

#### 7. Community-Puls (Activity Feed)

- **Layout:** Horizontal row of 3 activity cards
    - Each card: User avatar (circle) + "{Name} hat {Recipe} {action}" + relative timestamp
    - Actions: gekocht, bewertet (with star), erstellt, kommentiert, favorisiert
- **Data:** `ActivityLog` filtered by category, last 3 unique entries, respects `showInActivity` flag
- **Empty state:** Section hidden if no recent activity (< 3 entries)
- **Mobile:** Cards stack vertically or scroll horizontally

#### 8. CTA Button

- **Layout:** Full-width button, category-colored gradient, bold text
- **Text:** "Alle {count} {category}-Rezepte durchsuchen →"
- **Link:** `/recipes?category={slug}`

### Sidebar (right column, `position: sticky; top: 100px`)

All sidebar modules are **hidden on mobile** (< 1024px). The sidebar is informational/navigational — no critical content.

#### S1. Schwierigkeits-Schnellfilter

- **Layout:** 3 stacked rows — Einfach (green), Mittel (orange), Anspruchsvoll (pink)
- **Each row:** Emoji + label, right-aligned count badge (colored pill)
- **Click action:** Navigate to `/recipes?category={slug}&difficulty={level}`
- **Data:** `COUNT(*) GROUP BY difficulty WHERE categorySlug = ...`

#### S2. Kategorie-Statistiken

- **Layout:** Key-value list with separators
- **Fields:**
    - Ø Zubereitungszeit → `AVG(totalTime)`
    - Ø Kalorien → `AVG(calories)` (only if > 50% of recipes have calories)
    - Top-Zutat → Most frequent ingredient in this category
    - Schnellstes → `MIN(totalTime)` recipe name
    - Beliebtestes → Top recipe by `viewCount`
- **Data:** Single aggregate query, cached (ISR 60s like rest of page)

#### S3. Top 5 Rangliste

- **Layout:** Numbered list (1-5) with small thumbnail, title, rating + cook count
- **Ranking:** Bold colored numbers (category accent), small recipe image (32x32 rounded)
- **Data:** Top 5 by `viewCount DESC` (different from "Bestbewertet" which uses rating)
- **Click:** Each item links to recipe page

#### S4. Tag- & Zutaten-Wolke

- **Layout:** Flex-wrap chips
- **Two chip styles:**
    - Tags: Pink background, prefixed with `#` (e.g., `#Kuchen (28)`)
    - Ingredients: Orange background, prefixed with emoji if available (e.g., `🍫 Schokolade (47)`)
- **Data:** Top 10 tags + top 10 ingredients by recipe count in this category
- **Click action:** Navigate to `/recipes?category={slug}&tags={tag}` or `&ingredients={ingredient}`
- **Sorting:** By count descending

## Data Fetching Strategy

All data is fetched **server-side** in the category page's RSC, using `Promise.allSettled` for parallel fetching (existing pattern). New queries to add:

| Query                                          | Returns                                        | Cache                        |
| ---------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| `fetchCategoryMostCooked(slug, 3)`             | Top 3 by cookCount                             | ISR 60s                      |
| `fetchCategoryRandom(slug, 1)`                 | 1 random recipe                                | No cache (fresh per request) |
| `fetchCategoryActivity(slug, 3)`               | Last 3 activity entries                        | ISR 60s                      |
| `fetchActiveSeasonalRecipes(slug)`             | Recipes matching active FOOD_PERIOD + category | ISR 300s                     |
| `fetchCategoryDifficultyStats(slug)`           | Count per difficulty                           | ISR 60s                      |
| `fetchCategoryAggregateStats(slug)`            | AVG time, AVG calories, top ingredient, etc.   | ISR 60s                      |
| `fetchCategoryTopByViews(slug, 5)`             | Top 5 by viewCount                             | ISR 60s                      |
| `fetchCategoryTopTagsAndIngredients(slug, 10)` | Top tags + ingredients by count                | ISR 60s                      |

Existing queries remain:

- `fetchCategoryNewest(slug, 8)` — unchanged
- `fetchCategoryTopRated(slug, 8)` — unchanged

Removed queries (no longer needed):

- `fetchCategoryPopular` — replaced by Featured Trio (mostCooked) + Top 5 sidebar (viewCount)
- `fetchCategoryQuickRecipes` — removed section, quick recipes discoverable via difficulty filter

### Client-Side API

One new API route for the random recipe refresh button:

```
GET /api/category/[slug]/random
Response: { recipe: RecipeCardData }
```

Returns 1 random published recipe from the category. Called on "Neues 🎲" button click.

## Component Architecture

### New Components

| Component               | Location                                                            | Props                                                                        |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `FeaturedTrio`          | `src/app/category/[slug]/components/FeaturedTrio.tsx`               | `recipes: RecipeCardData[]`, `categoryColor: string`                         |
| `RandomRecipeSpotlight` | `src/app/category/[slug]/components/RandomRecipeSpotlight.tsx`      | `initialRecipe: RecipeCardData`, `categorySlug: string`                      |
| `CommunityPulse`        | `src/app/category/[slug]/components/CommunityPulse.tsx`             | `activities: ActivityFeedItem[]`                                             |
| `SeasonalTeaserBar`     | `src/app/category/[slug]/components/SeasonalTeaserBar.tsx`          | `period: FoodPeriod`, `recipes: RecipeCardData[]`, `categorySlug: string`    |
| `CategorySidebar`       | `src/app/category/[slug]/components/CategorySidebar.tsx`            | All sidebar data as props                                                    |
| `DifficultyFilter`      | `src/app/category/[slug]/components/sidebar/DifficultyFilter.tsx`   | `counts: Record<string, number>`, `categorySlug: string`                     |
| `CategoryStats`         | `src/app/category/[slug]/components/sidebar/CategoryStats.tsx`      | `stats: CategoryAggregateStats`                                              |
| `TopRankedList`         | `src/app/category/[slug]/components/sidebar/TopRankedList.tsx`      | `recipes: RecipeCardData[]`                                                  |
| `TagIngredientCloud`    | `src/app/category/[slug]/components/sidebar/TagIngredientCloud.tsx` | `tags: TagCount[]`, `ingredients: IngredientCount[]`, `categorySlug: string` |

### Modified Components/Files

| File                                          | Change                                            |
| --------------------------------------------- | ------------------------------------------------- |
| `src/app/category/[slug]/page.tsx`            | Add new data fetches, pass to CategoryLanding     |
| `src/app/category/[slug]/CategoryLanding.tsx` | Replace current layout with new section structure |
| `src/app/actions/category.ts`                 | Add new query functions                           |

### Reused Components

- `HorizontalRecipeScroll` — for "Neueste" and "Bestbewertet" sections
- `RecipeCard` — compact variant for scrolls, could add a `'featured'` variant for Trio
- `SmartImage` — all recipe images
- `CustomScrollbar` — horizontal scroll containers

## Mobile Behavior (< 1024px)

- **Sidebar:** Completely hidden (`display: none` on lg breakpoint)
- **Seasonal Teaser:** Title stacks above recipe cards, cards become horizontal scroll
- **Featured Trio:** 3 columns remain but cards get shorter (80px instead of 100px)
- **Horizontal Scrolls:** Unchanged (already mobile-friendly)
- **Random Spotlight:** Image on top, text below, "Neues" button full-width
- **Community Pulse:** Cards scroll horizontally or stack in single column
- **Main column:** Goes full-width (`grid-template-columns: 1fr`)

## Empty States

| Section              | Condition                      | Behavior                                      |
| -------------------- | ------------------------------ | --------------------------------------------- |
| Seasonal Teaser      | No active FOOD_PERIOD          | Entire bar hidden                             |
| Featured Trio        | < 3 recipes with cookCount > 0 | Show as many as available (1-2), or hide if 0 |
| Community Pulse      | < 1 recent activity            | Section hidden                                |
| Difficulty Filter    | All recipes same difficulty    | Still show, just one row has high count       |
| Stats: Ø Kalorien    | < 50% of recipes have calories | Row hidden                                    |
| Tag/Ingredient Cloud | < 3 tags+ingredients           | Section hidden                                |

## Styling

- Follow existing Panda CSS patterns (`css()` calls, tokens from `panda.config.ts`)
- Category color used for: Featured Trio gradient, section header icon backgrounds, CTA button gradient
- Sidebar cards: White background, 1px border `#f0f0f0`, 10px border-radius, subtle shadow
- Random Spotlight: Purple/violet gradient (distinct from category color — always stands out)
- Community Pulse: Neutral gray background (not category-colored — represents community, not category)
