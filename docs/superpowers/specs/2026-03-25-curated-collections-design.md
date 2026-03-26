# Curated Recipe Collections — Design Spec

**Date:** 2026-03-25
**Status:** Draft
**Author:** AI-assisted

---

## Summary

User- and admin-created recipe collections with optional MDX blog-post content, multiple layout templates, and dynamic recipe embedding. Collections are a first-class content type — browseable, favoritable, and integrated into recipe search and the homepage.

---

## Requirements

### Core

- Any user can create, edit, and publish collections
- Collections have an optional MDX body with live-preview editor
- 4 layout templates: Sidebar, Grid Below, Hero Picks, Inline
- MDX supports custom components for embedding recipes (single cards, sliders, ranked lists, trios, random picks)
- Recipe components accept either explicit IDs or dynamic filters (byUser, tags, category, sort, limit, byMyself)
- Collections go through the same AI moderation pipeline as recipes (OpenAI Moderation API, auto-approve/review/reject thresholds)
- Collections have views, favorites, and contribute referrer tracking to recipe views

### Non-Goals (for now)

- Comments on collections
- Share tracking
- Likes (separate from favorites)

---

## Data Model

### New Models

```prisma
model Collection {
  id               String              @id @default(cuid())
  title            String
  slug             String              @unique
  description      String?
  coverImageKey    String?
  template         CollectionTemplate
  mdxContent       String?
  published        Boolean             @default(false)
  moderationStatus ModerationStatus    @default(PENDING)
  viewCount        Int                 @default(0)

  authorId         String
  author           User                @relation(fields: [authorId], references: [id])

  recipes          CollectionRecipe[]
  tags             CollectionTag[]
  categories       CollectionCategory[]
  favorites        CollectionFavorite[]
  views            CollectionView[]

  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
}

model CollectionRecipe {
  id           String               @id @default(cuid())
  collectionId String
  recipeId     String
  position     Int
  role         CollectionRecipeRole
  collection   Collection           @relation(fields: [collectionId], references: [id])
  recipe       Recipe               @relation(fields: [recipeId], references: [id])

  @@unique([collectionId, recipeId])
}

model CollectionFavorite {
  id           String     @id @default(cuid())
  collectionId String
  userId       String
  collection   Collection @relation(fields: [collectionId], references: [id])
  user         User       @relation(fields: [userId], references: [id])
  createdAt    DateTime   @default(now())

  @@unique([collectionId, userId])
}

model CollectionView {
  id           String     @id @default(cuid())
  collectionId String
  userId       String?
  collection   Collection @relation(fields: [collectionId], references: [id])
  createdAt    DateTime   @default(now())
}

model CollectionTag {
  id           String     @id @default(cuid())
  collectionId String
  tagId        String
  collection   Collection @relation(fields: [collectionId], references: [id])
  tag          Tag        @relation(fields: [tagId], references: [id])

  @@unique([collectionId, tagId])
}

model CollectionCategory {
  id           String     @id @default(cuid())
  collectionId String
  categoryId   String
  collection   Collection @relation(fields: [collectionId], references: [id])
  category     Category   @relation(fields: [categoryId], references: [id])

  @@unique([collectionId, categoryId])
}

enum CollectionTemplate {
  SIDEBAR
  GRID_BELOW
  HERO_PICKS
  INLINE
}

enum CollectionRecipeRole {
  HERO
  SIDEBAR
  INLINE
  GRID
}
```

### Notes on Join Tables

- **CollectionTag / CollectionCategory:** Manually assigned by the collection author (like recipe tags), not auto-derived from embedded recipes
- **CollectionView:** One row per view (no dedup). A denormalized `viewCount Int` field on `Collection` avoids COUNT queries on browse pages (increment on view insert, same pattern as Recipe.viewCount)
- **CollectionRecipe.position:** Reflects MDX document order, set during the sync-on-save step. Used for browse page card ordering when showing a collection's recipes outside the MDX context

### Modified Models

```prisma
model UserViewHistory {
  // ... existing fields ...
  source    String?   // e.g. "collection:cuid123", "category:pasta", "search"
}
```

---

## Layout Templates

### A) Sidebar

MDX article on the left, recipe cards as a scrollable sidebar on the right. Each sidebar entry is a single recipe card (image, title, rating, time). Good for longer editorial content where the reader wants to browse recipes in parallel.

### B) Grid Below

MDX article on top, recipe grid below. Classic blog layout — read first, browse recipes after.

### C) Hero Picks

2-3 large hero recipe cards at the top (with optional ranking numbers), MDX text below. Ideal for "Top 3" or "Our Favorites" style collections.

### D) Inline

Pure MDX flow — recipes are embedded directly between paragraphs using MDX components. Most flexible template. Supports both single cards and horizontal sliders within the text.

Templates are extensible — new `CollectionTemplate` enum values can be added later without schema changes.

---

## MDX Components

All recipe-embedding components share a common set of optional filter props. If `ids` is provided, filters are ignored. If `byMyself` is true, it resolves to the logged-in user's ID server-side.

### Shared Filter Props

| Prop       | Type                                | Description                                 |
| ---------- | ----------------------------------- | ------------------------------------------- |
| `ids`      | `string[]`                          | Explicit recipe IDs (overrides all filters) |
| `byUser`   | `string`                            | User slug — filter to that user's recipes   |
| `byMyself` | `boolean`                           | Shorthand for `byUser={loggedInUserId}`     |
| `tags`     | `string[]`                          | Tag slugs                                   |
| `category` | `string`                            | Category slug                               |
| `sort`     | `"rating" \| "newest" \| "popular"` | Sort order (default: `"newest"`)            |
| `limit`    | `number`                            | Max results (default varies by component)   |

### Components

| Component                 | Default limit | Description                           | Reuses                                       |
| ------------------------- | ------------- | ------------------------------------- | -------------------------------------------- |
| `<RecipeCard id="..." />` | 1             | Single recipe card between paragraphs | Existing `RecipeCard`                        |
| `<RecipeSlider>`          | 8             | Horizontal scroll carousel            | `HorizontalRecipeScroll` (category redesign) |
| `<FeaturedTrio>`          | 3             | 3 large gradient cards                | `FeaturedTrio` (category redesign)           |
| `<TopList>`               | 5             | Numbered ranked list                  | `TopRankedList` (category redesign)          |
| `<RandomPick>`            | 1             | "Surprise me" interactive card        | `RandomRecipeSpotlight` (category redesign)  |

### Examples

```mdx
# Mein Weihnachtsmenue

Als Vorspeise empfehle ich diesen Klassiker:

<RecipeCard id="clx1abc..." />

Fuer den Hauptgang, hier meine Pasta-Favoriten:

<RecipeSlider byMyself tags={['pasta']} sort="rating" limit={6} />

Und die Top 3 Desserts der Community:

<TopList tags={['dessert']} sort="rating" limit={3} />
```

---

## MDX Editor

### Layout

Split-view: Markdown textarea (left), live preview (right).

### Toolbar

- Template dropdown (Sidebar / Grid Below / Hero Picks / Inline)
- "Rezept einfuegen" button → opens recipe search modal
- Formatting buttons (Bold, Italic, Heading, Link, Image)
- Component snippets dropdown (RecipeSlider, FeaturedTrio, TopList, RandomPick)

### Recipe Search Modal

1. User clicks "Rezept einfuegen" or selects a component from dropdown
2. Modal opens with search field + result list (reuse existing recipe search)
3. User selects recipe(s) — multi-select for Slider/Trio/TopList
4. Modal inserts MDX syntax at cursor position

### Live Preview

- Renders MDX in real-time (debounced ~500ms)
- Shows the selected template layout
- Recipe components rendered with real data (server fetch)
- Parse errors show friendly message instead of crash

### Auto-Save

- Same pattern as RecipeForm: debounced 2.5s, draft status
- First save creates collection, URL changes to `/collection/[slug]/edit`
- `autoSavedIdRef` pattern for tracking created/existing collection ID

---

## Routing

| Route                     | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `/collections`            | Browse page: popular, newest, filterable by category/tag |
| `/collection/[slug]`      | Collection detail — template-based layout + rendered MDX |
| `/collection/create`      | Editor: choose template → write MDX → embed recipes      |
| `/collection/[slug]/edit` | Same editor, pre-filled                                  |
| `/profile/collections`    | User's own collections (like `/profile/recipes`)         |

### Collection Detail Page (`/collection/[slug]`)

- Next.js ISR with on-demand revalidation (`revalidateTag('collection:<slug>')`)
- MDX compiled and cached in LRU in-memory cache (cache key: `collection:${id}:${updatedAt.getTime()}`)
- Cache invalidation: `updatedAt` changes on every edit → new cache key → old entry naturally expires
- Additional `revalidateTag` call after save for ISR layer
- Template determines base layout; MDX components render within it
- All recipe links include `?ref=col_<collectionId>`
- Favorite button + view tracking
- Author card (same pattern as recipe detail)

### Browse Page (`/collections`)

- Sections: "Beliebte Collections", "Neueste"
- Filterable by category and tags
- Collections also appear in `/recipes` search results (own tab or mixed)

### Homepage Integration

- New "Beliebte Collections" section — horizontal scroll with collection cards (cover, title, author, recipe count)

---

## Moderation

Same pipeline as recipes (Phase 7):

- **On create/update:** MDX text sent to OpenAI Moderation API (`omni-moderation-latest`)
- **Thresholds:** auto-approve <0.40, review 0.40-0.85, reject >=0.85
- **Cover image:** same upload flow as recipe images (S3 → moderation)
- **Mod queue:** new tab in `/moderation` alongside recipes/comments
- **Author banners:** PENDING/REJECTED shown to author only (same pattern as recipes)

### Visibility Rules

| State                                            | Who sees it                          |
| ------------------------------------------------ | ------------------------------------ |
| `published: false`                               | Author only (draft)                  |
| `published: true` + `PENDING`                    | Author only + "Wird geprueft" banner |
| `published: true` + `AUTO_APPROVED` / `APPROVED` | Public                               |
| `published: true` + `REJECTED`                   | Author only + rejected banner        |

---

## Caching Strategy

### Layer 1: Next.js ISR

- Collection detail pages are statically rendered at first request
- Revalidated on-demand via `revalidateTag('collection:<slug>')` after saves
- Effectively static pages for most visitors

### Layer 2: In-Memory LRU (compiled MDX)

- Compiled MDX output cached in memory (like thumbnail cache pattern)
- Cache key: `collection:${id}:${updatedAt.getTime()}`
- Natural invalidation: edit changes `updatedAt` → new key → old entry expires via LRU eviction
- Avoids re-compilation on ISR revalidation

---

## Referrer Tracking

- All recipe links within collections include `?ref=col_<collectionId>`
- Recipe detail page reads `searchParams.ref` and logs to `UserViewHistory.source`
- Enables analytics: "Which collections drive the most recipe views?"
- `source` field is generic string — extensible for other referrers later (e.g. `category:pasta`, `search`, `homepage`)

---

## Synergies with Category Page Redesign

The following components from the category page redesign (spec: `2026-03-25-category-page-redesign-design.md`) are directly reusable as MDX component wrappers:

| Category Redesign Component | Collection MDX Component |
| --------------------------- | ------------------------ |
| `HorizontalRecipeScroll`    | `<RecipeSlider>`         |
| `FeaturedTrio`              | `<FeaturedTrio>`         |
| `TopRankedList`             | `<TopList>`              |
| `RandomRecipeSpotlight`     | `<RandomPick>`           |
| `RecipeCard`                | `<RecipeCard>`           |

MDX components are thin wrappers that resolve filter props to recipe data, then delegate rendering to these shared components.

---

## Source of Truth: CollectionRecipe vs. MDX

The `CollectionRecipe` join table and MDX content serve different purposes:

- **MDX** is the rendering source — it determines what the user sees and how recipes are laid out
- **`CollectionRecipe`** is the indexing/search source — it enables "find collections containing recipe X", browse page queries, and recipe count display

**Sync mechanism:** On every collection save, the server parses the MDX content, extracts all explicit recipe IDs from components (`<RecipeCard id="...">`, `<RecipeSlider ids={[...]}>`, etc.), and upserts `CollectionRecipe` rows accordingly. Dynamic filter-based components (e.g. `<RecipeSlider byMyself tags={["pasta"]}>`) do NOT create `CollectionRecipe` rows — they resolve at render time.

The `role` field on `CollectionRecipe` is derived from the component type used in MDX (RecipeCard → INLINE, FeaturedTrio → HERO, etc.) and is used for template-aware rendering on browse pages (e.g. showing the HERO recipes as the collection's preview card).

**Sync on save (case 1 — user edits MDX):** Full sync — delete all existing `CollectionRecipe` rows for the collection, then re-insert from the parsed MDX. Recipes the user removed from the MDX are simply gone from the join table.

**Parse failure on save:** If MDX parsing fails during the sync step, the save proceeds (MDX content is stored as-is) but `CollectionRecipe` rows are left unchanged from the last successful sync. The editor's live preview already validates MDX — parse failures on save are an edge case (e.g. manual API call with malformed MDX).

---

## Orphaned Recipe Handling

When a recipe referenced in a collection is deleted or unpublished by its author (case 2 — external deletion):

- **Detection:** On recipe delete/unpublish, query `CollectionRecipe` for all collections referencing that recipe
- **Action:** Set affected collections to `published: false` (reverts to draft)
- **Notification:** Notify the collection author that a referenced recipe was removed and their collection needs review
- **MDX rendering:** The `<RecipeCard>` / other components render a "Rezept nicht mehr verfuegbar" placeholder for missing recipe IDs instead of crashing — allows the author to see what broke when editing

---

## `byMyself` and ISR: Personalization Strategy

Components using `byMyself` or other session-dependent props cannot be statically rendered. These components use a hybrid approach:

- **Static shell:** The ISR-cached page renders a placeholder/skeleton for personalized components
- **Client hydration:** A client component fetches the personalized recipe data on mount via a server action (same pattern as `RandomRecipeSpotlight` in the category redesign)
- **Non-personalized components** (explicit IDs, `byUser` with a slug, tag/category filters) are fully server-rendered and cached

This means a collection page with `byMyself` components loads fast (ISR shell) and then hydrates the personal sections client-side.

---

## Implementation Phases (suggested)

1. **Schema & Migration** — Collection, CollectionRecipe, CollectionFavorite, CollectionView, CollectionTag, CollectionCategory models + UserViewHistory.source field
2. **MDX Infrastructure** — `next-mdx-remote` setup, LRU cache, custom component registry, filter-to-query resolution
3. **Collection CRUD** — Server actions for create/update/delete/publish, slug generation, moderation integration
4. **Editor UI** — Split-view editor, toolbar, recipe search modal, template picker, auto-save
5. **Detail Page** — Template-based layouts, ISR, view tracking, referrer param, favorite button
6. **Browse & Discovery** — `/collections` browse page, homepage section, integration in recipe search
7. **Profile & Admin** — `/profile/collections`, moderation queue tab, admin management
