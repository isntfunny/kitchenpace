# Curated Recipe Collections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-created recipe collections with optional MDX blog content, 4 layout templates, moderation, and discovery pages.

**Architecture:** New `Collection` model with MDX content stored as text, compiled at render time via `next-mdx-remote`. MDX components are thin wrappers around existing category redesign components (`FeaturedTrio`, `HorizontalRecipeScroll`, etc.). Collections go through the same AI moderation pipeline as recipes. Auto-save editor mirrors the existing `useRecipeAutoSave` pattern.

**Tech Stack:** Next.js 16, Prisma 7, `next-mdx-remote`, Panda CSS, `lucide-react`, OpenAI Moderation API

**Spec:** `docs/superpowers/specs/2026-03-25-curated-collections-design.md`

---

## File Structure

### New Files

| File                                                      | Responsibility                                         |
| --------------------------------------------------------- | ------------------------------------------------------ |
| `prisma/migrations/YYYYMMDD_collections/migration.sql`    | Schema migration                                       |
| `src/lib/collections/types.ts`                            | Shared types (CollectionCardData, filter props, etc.)  |
| `src/lib/collections/mdx.ts`                              | MDX compilation with LRU cache                         |
| `src/lib/collections/mdx-components.tsx`                  | Custom MDX component registry                          |
| `src/lib/collections/mdx-queries.ts`                      | Filter props → Prisma query resolution                 |
| `src/lib/collections/sync-recipes.ts`                     | MDX → CollectionRecipe sync on save                    |
| `src/app/actions/collections.ts`                          | Server actions: CRUD, publish, favorite, view tracking |
| `src/components/collections/CollectionEditor.tsx`         | Split-view MDX editor (textarea + preview)             |
| `src/components/collections/CollectionEditorToolbar.tsx`  | Toolbar with template picker, formatting, snippets     |
| `src/components/collections/RecipeSearchModal.tsx`        | Recipe search + insert modal                           |
| `src/components/collections/useCollectionAutoSave.ts`     | Auto-save hook (mirrors useRecipeAutoSave)             |
| `src/components/collections/CollectionCard.tsx`           | Collection card for browse/homepage                    |
| `src/components/collections/CollectionFavoriteButton.tsx` | Favorite toggle                                        |
| `src/app/collection/create/page.tsx`                      | Create collection page                                 |
| `src/app/collection/[slug]/page.tsx`                      | Collection detail (ISR)                                |
| `src/app/collection/[slug]/CollectionDetailClient.tsx`    | Client component for detail page                       |
| `src/app/collection/[slug]/edit/page.tsx`                 | Edit collection page                                   |
| `src/app/collection/[slug]/templates/SidebarLayout.tsx`   | Sidebar template                                       |
| `src/app/collection/[slug]/templates/GridBelowLayout.tsx` | Grid Below template                                    |
| `src/app/collection/[slug]/templates/HeroPicksLayout.tsx` | Hero Picks template                                    |
| `src/app/collection/[slug]/templates/InlineLayout.tsx`    | Inline template                                        |
| `src/app/collections/page.tsx`                            | Browse page                                            |
| `src/app/collections/CollectionsBrowseClient.tsx`         | Browse page client component                           |
| `src/app/profile/collections/page.tsx`                    | User's own collections                                 |

### Modified Files

| File                                       | Change                                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `prisma/schema.prisma`                     | New models, enums, relation arrays on User/Recipe/Tag/Category   |
| `src/lib/moderation/moderationService.ts`  | Add `"collection"` to contentType in `getModerationNotification` |
| `src/lib/events/persist.ts`                | No changes needed — uses string-based types                      |
| `src/app/recipe/[id]/page.tsx`             | Read `searchParams.ref` and pass to view tracking                |
| `src/app/moderation/page.tsx` (or similar) | Add collections tab to mod queue                                 |
| `src/app/page.tsx` (homepage)              | Add "Beliebte Collections" section                               |

---

## Phase 1: Schema & Migration

### Task 1: Add Enums and Collection Model to Prisma Schema

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums after existing enums (after line 81)**

Add after the `ActivityType` enum closing brace:

```prisma
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

- [ ] **Step 2: Add COLLECTION_CREATED and COLLECTION_FAVORITED to ActivityType enum**

Add these two values to the existing `ActivityType` enum (before the closing `}`):

```prisma
  COLLECTION_CREATED
  COLLECTION_FAVORITED
```

- [ ] **Step 3: Add Collection model and junction tables**

Add a new section before the `// SITE SETTINGS` comment (before line 1010):

```prisma
// ============================================
// CURATED COLLECTIONS
// ============================================

model Collection {
  id               String              @id @default(cuid())
  title            String
  slug             String              @unique
  description      String?
  coverImageKey    String?
  template         CollectionTemplate  @default(INLINE)
  mdxContent       String?
  published        Boolean             @default(false)
  viewCount        Int                 @default(0)

  // Content moderation
  moderationStatus ModerationStatus    @default(PENDING)
  moderationNote   String?
  aiModerationScore Float?

  authorId         String
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  // Relations
  author           User                @relation(fields: [authorId], references: [id], onDelete: Cascade)
  recipes          CollectionRecipe[]
  tags             CollectionTag[]
  categories       CollectionCategory[]
  favorites        CollectionFavorite[]
  views            CollectionView[]

  @@index([authorId])
  @@index([slug])
  @@index([published, moderationStatus])
  @@index([createdAt])
  @@index([viewCount])
}

model CollectionRecipe {
  id           String               @id @default(cuid())
  collectionId String
  recipeId     String
  position     Int                  @default(0)
  role         CollectionRecipeRole @default(INLINE)

  collection   Collection           @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  recipe       Recipe               @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([collectionId, recipeId])
  @@index([recipeId])
}

model CollectionFavorite {
  id           String     @id @default(cuid())
  collectionId String
  userId       String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())

  @@unique([collectionId, userId])
  @@index([userId])
}

model CollectionView {
  id           String     @id @default(cuid())
  collectionId String
  userId       String?
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())

  @@index([collectionId])
}

model CollectionTag {
  collectionId String
  tagId        String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  tag          Tag        @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([collectionId, tagId])
  @@index([tagId])
}

model CollectionCategory {
  collectionId String
  categoryId   String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  category     Category   @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([collectionId, categoryId])
  @@index([categoryId])
}
```

- [ ] **Step 4: Add `source` field to UserViewHistory**

In the `UserViewHistory` model (around line 871), add after the `pinned` field:

```prisma
  source   String?   // e.g. "collection:cuid123", "category:pasta", "search"
```

- [ ] **Step 5: Add relation arrays to existing models**

Add to `User` model (after `plannedStreams` relation, around line 224):

```prisma
  collections               Collection[]
  collectionFavorites       CollectionFavorite[]
```

Add to `Recipe` model (after `plannedStreams` relation, around line 356):

```prisma
  collectionRecipes         CollectionRecipe[]
```

Add to `Tag` model (after `filterSets` relation, around line 650):

```prisma
  collectionTags            CollectionTag[]
```

Add to `Category` model (after `filterSets` relation, around line 629):

```prisma
  collectionCategories      CollectionCategory[]
```

### Task 2: Create and Run Migration

**Files:**

- Create: `prisma/migrations/<timestamp>_collections/migration.sql` (auto-generated)

- [ ] **Step 1: Generate migration**

Run: `npx prisma migrate dev --name collections`

This will:

1. Create the migration SQL file
2. Apply it to the dev database
3. Regenerate the Prisma client

Expected: Migration created successfully, no errors.

- [ ] **Step 2: Verify Prisma client generation**

Run: `npx prisma generate`

Expected: `✔ Generated Prisma Client`

---

## Phase 2: MDX Infrastructure

### Task 3: Install next-mdx-remote

- [ ] **Step 1: Install dependency**

Run: `npm install next-mdx-remote`

### Task 4: Create Collection Types

**Files:**

- Create: `src/lib/collections/types.ts`

- [ ] **Step 1: Write shared types**

```typescript
import type { CollectionTemplate, ModerationStatus } from '@prisma/client';

/** Card data for collection browse/homepage displays */
export interface CollectionCardData {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverImageKey: string | null;
    template: CollectionTemplate;
    recipeCount: number;
    viewCount: number;
    favoriteCount: number;
    authorName: string;
    authorSlug: string;
    authorPhotoKey: string | null;
    createdAt: string;
}

/** Shared filter props for MDX recipe components */
export interface RecipeFilterProps {
    ids?: string[];
    byUser?: string;
    byMyself?: boolean;
    tags?: string[];
    category?: string;
    sort?: 'rating' | 'newest' | 'popular';
    limit?: number;
}

/** Props passed to all MDX recipe components */
export interface MdxRecipeComponentProps extends RecipeFilterProps {
    /** Referrer param for tracking */
    collectionId?: string;
}

/** Collection detail data for the detail page */
export interface CollectionDetail {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverImageKey: string | null;
    template: CollectionTemplate;
    mdxContent: string | null;
    published: boolean;
    moderationStatus: ModerationStatus;
    viewCount: number;
    authorId: string;
    author: {
        id: string;
        name: string | null;
        slug: string;
        photoKey: string | null;
    };
    favoriteCount: number;
    isFavorited: boolean;
    recipeCount: number;
    createdAt: string;
    updatedAt: string;
}

/** Input for creating/updating a collection */
export interface CollectionMutationInput {
    title: string;
    description?: string;
    coverImageKey?: string;
    template: CollectionTemplate;
    mdxContent?: string;
    categoryIds?: string[];
    tagIds?: string[];
}
```

### Task 5: Create MDX Query Resolution

**Files:**

- Create: `src/lib/collections/mdx-queries.ts`

- [ ] **Step 1: Write filter-to-Prisma query resolver**

```typescript
import { prisma } from '@shared/prisma';
import { toRecipeCardData, type RecipeCardData } from '@app/lib/recipe-card';
import type { RecipeFilterProps } from './types';
import type { Prisma } from '@prisma/client';

/**
 * Resolves RecipeFilterProps into actual recipe data.
 * Used by MDX components to fetch recipes based on filters or explicit IDs.
 */
export async function resolveRecipeFilter(
    props: RecipeFilterProps,
    viewerUserId?: string | null,
): Promise<RecipeCardData[]> {
    // Explicit IDs take priority
    if (props.ids && props.ids.length > 0) {
        const recipes = await prisma.recipe.findMany({
            where: {
                id: { in: props.ids },
                status: 'PUBLISHED',
                moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
            },
            include: { categories: { include: { category: true } } },
        });

        // Preserve ID order
        const byId = new Map(recipes.map((r) => [r.id, r]));
        return props.ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => toRecipeCardData(r!));
    }

    // Build dynamic query from filter props
    const where: Prisma.RecipeWhereInput = {
        status: 'PUBLISHED',
        moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
    };

    // byMyself resolves to viewer's user ID
    const userId = props.byMyself
        ? viewerUserId
        : props.byUser
          ? await resolveUserSlug(props.byUser)
          : null;
    if (userId) {
        where.authorId = userId;
    }
    // If byMyself but no viewer, return empty (will be hydrated client-side)
    if (props.byMyself && !viewerUserId) {
        return [];
    }

    if (props.tags && props.tags.length > 0) {
        where.tags = { some: { tag: { slug: { in: props.tags } } } };
    }

    if (props.category) {
        where.categories = { some: { category: { slug: props.category } } };
    }

    const orderBy = buildOrderBy(props.sort ?? 'newest');
    const limit = props.limit ?? 8;

    const recipes = await prisma.recipe.findMany({
        where,
        orderBy,
        take: limit,
        include: { categories: { include: { category: true } } },
    });

    return recipes.map(toRecipeCardData);
}

async function resolveUserSlug(slug: string): Promise<string | null> {
    const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { userId: true },
    });
    return profile?.userId ?? null;
}

function buildOrderBy(
    sort: 'rating' | 'newest' | 'popular',
): Prisma.RecipeOrderByWithRelationInput {
    switch (sort) {
        case 'rating':
            return { rating: 'desc' };
        case 'popular':
            return { viewCount: 'desc' };
        case 'newest':
        default:
            return { createdAt: 'desc' };
    }
}
```

### Task 6: Create MDX Components

**Files:**

- Create: `src/lib/collections/mdx-components.tsx`

- [ ] **Step 1: Write MDX component wrappers**

These are **server components** that wrap existing category redesign components. They receive filter props from MDX, resolve data, and render.

```tsx
import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import { FeaturedTrio } from '@app/app/category/[slug]/components/FeaturedTrio';
import { TopRankedList } from '@app/app/category/[slug]/components/sidebar/TopRankedList';
import { RecipeCard as BaseRecipeCard } from '@app/components/features/RecipeCard';
import { resolveRecipeFilter } from './mdx-queries';
import type { MdxRecipeComponentProps } from './types';

/**
 * Creates the MDX component map for a given collection context.
 * Components are pre-bound with collectionId for referrer tracking
 * and viewerUserId for byMyself resolution.
 */
export function createMdxComponents(collectionId: string, viewerUserId?: string | null) {
    return {
        RecipeCard: async (props: MdxRecipeComponentProps & { id?: string }) => {
            const ids = props.id ? [props.id] : props.ids;
            const recipes = await resolveRecipeFilter({ ...props, ids }, viewerUserId);
            if (recipes.length === 0) {
                return <MissingRecipePlaceholder />;
            }
            const recipe = recipes[0];
            return (
                <div style={{ maxWidth: 400, margin: '1.5rem 0' }}>
                    <BaseRecipeCard
                        recipe={recipe}
                        variant="default"
                        categoryOnImage
                        categoryLink
                        starRating
                        refParam={`col_${collectionId}`}
                    />
                </div>
            );
        },

        RecipeSlider: async (props: MdxRecipeComponentProps) => {
            const recipes = await resolveRecipeFilter(
                { ...props, limit: props.limit ?? 8 },
                viewerUserId,
            );
            if (recipes.length === 0) return null;
            return <HorizontalRecipeScroll recipes={recipes} />;
        },

        FeaturedTrio: async (props: MdxRecipeComponentProps) => {
            const recipes = await resolveRecipeFilter(
                { ...props, limit: props.limit ?? 3 },
                viewerUserId,
            );
            if (recipes.length === 0) return null;
            return <FeaturedTrio recipes={recipes} categoryColor="#f97316" />;
        },

        TopList: async (props: MdxRecipeComponentProps) => {
            const recipes = await resolveRecipeFilter(
                { ...props, limit: props.limit ?? 5 },
                viewerUserId,
            );
            if (recipes.length === 0) return null;
            return <TopRankedList recipes={recipes} />;
        },

        RandomPick: async (props: MdxRecipeComponentProps) => {
            const recipes = await resolveRecipeFilter(
                { ...props, limit: 1, sort: 'popular' },
                viewerUserId,
            );
            if (recipes.length === 0) return null;
            const recipe = recipes[0];
            return (
                <div style={{ maxWidth: 400, margin: '1.5rem 0' }}>
                    <BaseRecipeCard
                        recipe={recipe}
                        variant="default"
                        categoryOnImage
                        starRating
                        refParam={`col_${collectionId}`}
                    />
                </div>
            );
        },
    };
}

function MissingRecipePlaceholder() {
    return (
        <div
            style={{
                padding: '1rem',
                border: '1px dashed #ccc',
                borderRadius: '8px',
                color: '#999',
                textAlign: 'center',
                margin: '1rem 0',
            }}
        >
            Rezept nicht mehr verfuegbar
        </div>
    );
}
```

**Note:** The `refParam` prop may not exist on `BaseRecipeCard` yet. If not, we'll add it — it appends `?ref=col_<id>` to the recipe link. This is a small modification to `RecipeCard.tsx`.

### Task 7: Create MDX Compilation Service

**Files:**

- Create: `src/lib/collections/mdx.ts`

- [ ] **Step 1: Write MDX compiler with LRU cache**

```typescript
import { compileMDX } from 'next-mdx-remote/rsc';
import type { ReactNode } from 'react';

/** Simple LRU cache for compiled MDX */
const MDX_CACHE = new Map<string, { node: ReactNode; accessedAt: number }>();
const MAX_CACHE_SIZE = 100;

function evictLRU() {
    if (MDX_CACHE.size <= MAX_CACHE_SIZE) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of MDX_CACHE) {
        if (entry.accessedAt < oldestTime) {
            oldestTime = entry.accessedAt;
            oldestKey = key;
        }
    }
    if (oldestKey) MDX_CACHE.delete(oldestKey);
}

/**
 * Compile MDX content with custom components.
 * Cache key includes updatedAt so edits automatically invalidate.
 */
export async function compileCollectionMdx(
    collectionId: string,
    mdxContent: string,
    updatedAt: Date,
    components: Record<string, React.ComponentType<any>>,
): Promise<ReactNode> {
    const cacheKey = `collection:${collectionId}:${updatedAt.getTime()}`;

    const cached = MDX_CACHE.get(cacheKey);
    if (cached) {
        cached.accessedAt = Date.now();
        return cached.node;
    }

    try {
        const { content } = await compileMDX({
            source: mdxContent,
            components,
            options: {
                parseFrontmatter: false,
            },
        });

        MDX_CACHE.set(cacheKey, { node: content, accessedAt: Date.now() });
        evictLRU();

        return content;
    } catch (error) {
        console.error('[MDX] Compilation failed for collection', collectionId, error);
        return null;
    }
}

/**
 * Extract explicit recipe IDs from MDX content.
 * Parses <RecipeCard id="..."> and ids={["...", "..."]} patterns.
 */
export function extractRecipeIdsFromMdx(mdxContent: string): string[] {
    const ids = new Set<string>();

    // Match id="clx..." or id='clx...'
    const singleIdPattern = /\bid=["']([a-z0-9]+)["']/gi;
    for (const match of mdxContent.matchAll(singleIdPattern)) {
        ids.add(match[1]);
    }

    // Match ids={["clx...", "clx..."]} or ids={['clx...', 'clx...']}
    const arrayPattern = /\bids=\{?\[([^\]]+)\]\}?/gi;
    for (const match of mdxContent.matchAll(arrayPattern)) {
        const inner = match[1];
        const idPattern = /["']([a-z0-9]+)["']/gi;
        for (const idMatch of inner.matchAll(idPattern)) {
            ids.add(idMatch[1]);
        }
    }

    return Array.from(ids);
}
```

### Task 8: Create CollectionRecipe Sync Service

**Files:**

- Create: `src/lib/collections/sync-recipes.ts`

- [ ] **Step 1: Write MDX → CollectionRecipe sync**

```typescript
import { prisma } from '@shared/prisma';
import { extractRecipeIdsFromMdx } from './mdx';
import type { CollectionRecipeRole } from '@prisma/client';

/**
 * Syncs CollectionRecipe rows based on MDX content.
 * Deletes all existing rows and re-inserts from parsed MDX.
 * Called on every collection save.
 */
export async function syncCollectionRecipes(
    collectionId: string,
    mdxContent: string | null | undefined,
): Promise<void> {
    if (!mdxContent) {
        // No MDX content — clear all rows
        await prisma.collectionRecipe.deleteMany({ where: { collectionId } });
        return;
    }

    const recipeIds = extractRecipeIdsFromMdx(mdxContent);

    // Derive role from component context (simplified: check which component wraps each ID)
    const entries = recipeIds.map((recipeId, index) => ({
        collectionId,
        recipeId,
        position: index,
        role: inferRole(mdxContent, recipeId),
    }));

    await prisma.$transaction([
        prisma.collectionRecipe.deleteMany({ where: { collectionId } }),
        ...entries.map((entry) => prisma.collectionRecipe.create({ data: entry })),
    ]);
}

/**
 * Infers the CollectionRecipeRole from the MDX context around the recipe ID.
 */
function inferRole(mdxContent: string, recipeId: string): CollectionRecipeRole {
    // Find the component that contains this ID
    const escapedId = recipeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns: [RegExp, CollectionRecipeRole][] = [
        [new RegExp(`<FeaturedTrio[^>]*${escapedId}`), 'HERO'],
        [new RegExp(`<TopList[^>]*${escapedId}`), 'SIDEBAR'],
        [new RegExp(`<RecipeSlider[^>]*${escapedId}`), 'GRID'],
        [new RegExp(`<RecipeCard[^>]*${escapedId}`), 'INLINE'],
    ];

    for (const [pattern, role] of patterns) {
        if (pattern.test(mdxContent)) return role;
    }

    return 'INLINE';
}
```

---

## Phase 3: Collection CRUD (Server Actions)

### Task 9: Create Collection Server Actions

**Files:**

- Create: `src/app/actions/collections.ts`

- [ ] **Step 1: Write CRUD server actions**

```typescript
'use server';

import { getServerAuthSession } from '@app/lib/auth';
import { createActivityLog, createUserNotification } from '@app/lib/events/persist';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { generateUniqueSlug } from '@app/lib/slug';
import { syncCollectionRecipes } from '@app/lib/collections/sync-recipes';
import { prisma } from '@shared/prisma';
import type {
    CollectionMutationInput,
    CollectionDetail,
    CollectionCardData,
} from '@app/lib/collections/types';
import type { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';

// ── Create ──────────────────────────────────────────────────────────────────

export async function createCollection(
    data: CollectionMutationInput,
    authorId: string,
): Promise<{ id: string; slug: string }> {
    const slug = await generateUniqueSlug(data.title, async (s) => {
        const existing = await prisma.collection.findUnique({ where: { slug: s } });
        return !!existing;
    });

    // Moderate text content
    const textToModerate = [data.title, data.description, data.mdxContent]
        .filter(Boolean)
        .join('\n\n');

    const modResult = await moderateContent({ text: textToModerate });

    if (modResult.decision === 'REJECTED') {
        throw new Error('CONTENT_REJECTED: Deine Sammlung entspricht nicht unseren Richtlinien.');
    }

    const collection = await prisma.collection.create({
        data: {
            title: data.title,
            slug,
            description: data.description ?? null,
            coverImageKey: data.coverImageKey ?? null,
            template: data.template,
            mdxContent: data.mdxContent ?? null,
            authorId,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
        },
    });

    // Sync CollectionRecipe rows from MDX
    await syncCollectionRecipes(collection.id, data.mdxContent).catch((err) =>
        console.error('[collections] Failed to sync recipes:', err),
    );

    // Sync tags and categories
    if (data.tagIds?.length) {
        await prisma.collectionTag.createMany({
            data: data.tagIds.map((tagId) => ({ collectionId: collection.id, tagId })),
            skipDuplicates: true,
        });
    }
    if (data.categoryIds?.length) {
        await prisma.collectionCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({
                collectionId: collection.id,
                categoryId,
            })),
            skipDuplicates: true,
        });
    }

    // Persist moderation result
    await persistModerationResult('collection', collection.id, authorId, modResult, {
        title: data.title,
        description: data.description,
        text: data.mdxContent,
    }).catch((err) => console.error('[collections] Failed to persist moderation:', err));

    return { id: collection.id, slug: collection.slug };
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateCollection(
    collectionId: string,
    data: CollectionMutationInput,
    authorId: string,
    isUserAdmin = false,
): Promise<{ id: string; slug: string }> {
    const existing = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!existing) throw new Error('Collection not found');
    if (existing.authorId !== authorId && !isUserAdmin) throw new Error('Unauthorized');

    // Moderate text content
    const textToModerate = [data.title, data.description, data.mdxContent]
        .filter(Boolean)
        .join('\n\n');

    const modResult = await moderateContent({ text: textToModerate });

    if (modResult.decision === 'REJECTED') {
        throw new Error('CONTENT_REJECTED: Deine Sammlung entspricht nicht unseren Richtlinien.');
    }

    const collection = await prisma.collection.update({
        where: { id: collectionId },
        data: {
            title: data.title,
            description: data.description ?? null,
            coverImageKey: data.coverImageKey ?? null,
            template: data.template,
            mdxContent: data.mdxContent ?? null,
            moderationStatus: modResult.decision === 'PENDING' ? 'PENDING' : 'AUTO_APPROVED',
            aiModerationScore: modResult.score,
        },
    });

    // Sync CollectionRecipe rows from MDX
    await syncCollectionRecipes(collection.id, data.mdxContent).catch((err) =>
        console.error('[collections] Failed to sync recipes:', err),
    );

    // Sync tags: delete all, re-insert
    await prisma.collectionTag.deleteMany({ where: { collectionId } });
    if (data.tagIds?.length) {
        await prisma.collectionTag.createMany({
            data: data.tagIds.map((tagId) => ({ collectionId, tagId })),
            skipDuplicates: true,
        });
    }

    // Sync categories: delete all, re-insert
    await prisma.collectionCategory.deleteMany({ where: { collectionId } });
    if (data.categoryIds?.length) {
        await prisma.collectionCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({ collectionId, categoryId })),
            skipDuplicates: true,
        });
    }

    // Persist moderation result
    await persistModerationResult('collection', collection.id, authorId, modResult, {
        title: data.title,
        description: data.description,
        text: data.mdxContent,
    }).catch((err) => console.error('[collections] Failed to persist moderation:', err));

    revalidateTag(`collection:${collection.slug}`);

    return { id: collection.id, slug: collection.slug };
}

// ── Publish ─────────────────────────────────────────────────────────────────

export async function publishCollection(collectionId: string, authorId: string): Promise<void> {
    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new Error('Collection not found');
    if (collection.authorId !== authorId) throw new Error('Unauthorized');

    await prisma.collection.update({
        where: { id: collectionId },
        data: { published: true },
    });

    await createActivityLog({
        userId: authorId,
        type: 'COLLECTION_CREATED',
        targetId: collectionId,
        targetType: 'collection',
    }).catch((err) => console.error('[collections] Failed to log activity:', err));

    revalidateTag(`collection:${collection.slug}`);
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteCollection(
    collectionId: string,
    authorId: string,
    isUserAdmin = false,
): Promise<void> {
    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new Error('Collection not found');
    if (collection.authorId !== authorId && !isUserAdmin) throw new Error('Unauthorized');

    await prisma.collection.delete({ where: { id: collectionId } });
    revalidateTag(`collection:${collection.slug}`);
}

// ── Favorite ────────────────────────────────────────────────────────────────

export async function toggleCollectionFavorite(collectionId: string): Promise<boolean> {
    const session = await getServerAuthSession('collection-favorite');
    if (!session?.user?.id) throw new Error('Unauthorized');

    const existing = await prisma.collectionFavorite.findUnique({
        where: { collectionId_userId: { collectionId, userId: session.user.id } },
    });

    if (existing) {
        await prisma.collectionFavorite.delete({ where: { id: existing.id } });
        return false;
    }

    await prisma.collectionFavorite.create({
        data: { collectionId, userId: session.user.id },
    });

    await createActivityLog({
        userId: session.user.id,
        type: 'COLLECTION_FAVORITED',
        targetId: collectionId,
        targetType: 'collection',
    }).catch((err) => console.error('[collections] Failed to log favorite:', err));

    return true;
}

// ── View Tracking ───────────────────────────────────────────────────────────

export async function trackCollectionView(collectionId: string): Promise<void> {
    const session = await getServerAuthSession('collection-view');

    await prisma.$transaction([
        prisma.collectionView.create({
            data: {
                collectionId,
                userId: session?.user?.id ?? null,
            },
        }),
        prisma.collection.update({
            where: { id: collectionId },
            data: { viewCount: { increment: 1 } },
        }),
    ]);
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function fetchCollectionBySlug(
    slug: string,
    viewerId?: string | null,
    includeDrafts = false,
): Promise<CollectionDetail | null> {
    const where: Prisma.CollectionWhereInput = {
        OR: [{ slug }, { id: slug }],
    };

    if (!includeDrafts) {
        where.published = true;
        where.moderationStatus = { in: ['AUTO_APPROVED', 'APPROVED'] };
    }

    const collection = await prisma.collection.findFirst({
        where,
        include: {
            author: {
                include: { profile: { select: { slug: true, photoKey: true, nickname: true } } },
            },
            _count: {
                select: {
                    recipes: true,
                    favorites: true,
                },
            },
            ...(viewerId
                ? {
                      favorites: {
                          where: { userId: viewerId },
                          take: 1,
                      },
                  }
                : {}),
        },
    });

    if (!collection) return null;

    return {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        coverImageKey: collection.coverImageKey,
        template: collection.template,
        mdxContent: collection.mdxContent,
        published: collection.published,
        moderationStatus: collection.moderationStatus,
        viewCount: collection.viewCount,
        authorId: collection.authorId,
        author: {
            id: collection.author.id,
            name: collection.author.profile?.nickname ?? collection.author.name,
            slug: collection.author.profile?.slug ?? collection.author.id,
            photoKey: collection.author.profile?.photoKey ?? null,
        },
        favoriteCount: collection._count.favorites,
        isFavorited: viewerId ? (collection.favorites?.length ?? 0) > 0 : false,
        recipeCount: collection._count.recipes,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
    };
}

export async function fetchPopularCollections(limit = 8): Promise<CollectionCardData[]> {
    const collections = await prisma.collection.findMany({
        where: {
            published: true,
            moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
        },
        orderBy: { viewCount: 'desc' },
        take: limit,
        include: {
            author: {
                include: { profile: { select: { slug: true, photoKey: true, nickname: true } } },
            },
            _count: { select: { recipes: true, favorites: true } },
        },
    });

    return collections.map(toCollectionCardData);
}

export async function fetchNewestCollections(limit = 8): Promise<CollectionCardData[]> {
    const collections = await prisma.collection.findMany({
        where: {
            published: true,
            moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            author: {
                include: { profile: { select: { slug: true, photoKey: true, nickname: true } } },
            },
            _count: { select: { recipes: true, favorites: true } },
        },
    });

    return collections.map(toCollectionCardData);
}

export async function fetchUserCollections(userId: string): Promise<CollectionCardData[]> {
    const collections = await prisma.collection.findMany({
        where: { authorId: userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            author: {
                include: { profile: { select: { slug: true, photoKey: true, nickname: true } } },
            },
            _count: { select: { recipes: true, favorites: true } },
        },
    });

    return collections.map(toCollectionCardData);
}

function toCollectionCardData(collection: any): CollectionCardData {
    return {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        coverImageKey: collection.coverImageKey,
        template: collection.template,
        recipeCount: collection._count.recipes,
        viewCount: collection.viewCount,
        favoriteCount: collection._count.favorites,
        authorName: collection.author.profile?.nickname ?? collection.author.name ?? 'Anonym',
        authorSlug: collection.author.profile?.slug ?? collection.author.id,
        authorPhotoKey: collection.author.profile?.photoKey ?? null,
        createdAt: collection.createdAt.toISOString(),
    };
}
```

### Task 10: Update Moderation Service for Collections

**Files:**

- Modify: `src/lib/moderation/moderationService.ts`

- [ ] **Step 1: Add collection to getModerationNotification**

In the `getModerationNotification` function, add a check for `contentType === 'collection'`:

After the `const isRecipe = contentType === 'recipe';` line, add:

```typescript
const isCollection = contentType === 'collection';
```

Then in each decision branch, add collection-specific messages. For `AUTO_APPROVED`:

```typescript
if (isCollection)
    return {
        title: 'Sammlung freigegeben',
        message: 'Deine Sammlung ist jetzt oeffentlich sichtbar!',
    };
```

For `PENDING`:

```typescript
if (isCollection)
    return {
        title: 'Sammlung wird geprueft',
        message: 'Wir pruefen deine Sammlung noch – sie wird bald sichtbar.',
    };
```

For `REJECTED`:

```typescript
if (isCollection)
    return {
        title: 'Sammlung abgelehnt',
        message: 'Deine Sammlung entspricht leider nicht unseren Richtlinien.',
    };
```

---

## Phase 4: Editor UI

### Task 11: Create Collection Auto-Save Hook

**Files:**

- Create: `src/components/collections/useCollectionAutoSave.ts`

- [ ] **Step 1: Write auto-save hook mirroring useRecipeAutoSave pattern**

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createCollection, updateCollection } from '@app/app/actions/collections';
import type { CollectionTemplate } from '@prisma/client';
import type { CollectionMutationInput } from '@app/lib/collections/types';

interface AutoSaveDeps {
    title: string;
    description: string;
    mdxContent: string;
    template: CollectionTemplate;
    coverImageKey: string | null;
    categoryIds: string[];
    tagIds: string[];
    authorId: string;
    isAdmin: boolean;
    isPublished: boolean;
    initialId: string | null;
}

export interface CollectionAutoSaveResult {
    autoSavedIdRef: React.RefObject<string | null>;
    savedCollectionId: string | undefined;
    autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
    autoSaveLabel: string | null;
    buildPayload: () => CollectionMutationInput;
}

export function useCollectionAutoSave(deps: AutoSaveDeps): CollectionAutoSaveResult {
    const {
        title,
        description,
        mdxContent,
        template,
        coverImageKey,
        categoryIds,
        tagIds,
        authorId,
        isAdmin,
        isPublished,
        initialId,
    } = deps;

    const autoSavedIdRef = useRef<string | null>(initialId);
    const [savedCollectionId, setSavedCollectionId] = useState<string | undefined>(
        initialId ?? undefined,
    );
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
        'idle',
    );
    const [autoSaveLabel, setAutoSaveLabel] = useState<string | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const buildPayload = useCallback((): CollectionMutationInput => {
        return {
            title: title.trim(),
            description: description.trim() || undefined,
            mdxContent: mdxContent || undefined,
            template,
            coverImageKey: coverImageKey ?? undefined,
            categoryIds,
            tagIds,
        };
    }, [title, description, mdxContent, template, coverImageKey, categoryIds, tagIds]);

    const performAutoSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle || isPublished) return;

        setAutoSaveStatus('saving');
        setAutoSaveLabel('Wird gespeichert\u2026');

        try {
            const payload = buildPayload();

            if (autoSavedIdRef.current) {
                await updateCollection(autoSavedIdRef.current, payload, authorId, isAdmin);
            } else {
                const result = await createCollection(payload, authorId);
                autoSavedIdRef.current = result.id;
                setSavedCollectionId(result.id);
                window.history.replaceState({}, '', `/collection/${result.slug}/edit`);
            }

            setAutoSaveStatus('saved');
            const time = new Date().toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
            });
            setAutoSaveLabel(`Entwurf gespeichert ${time}`);
        } catch (error) {
            setAutoSaveStatus('error');
            const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
            if (message.startsWith('CONTENT_REJECTED:')) {
                setAutoSaveLabel(message.replace('CONTENT_REJECTED: ', ''));
            } else {
                setAutoSaveLabel('Fehler beim Speichern');
            }
        }
    }, [title, isPublished, buildPayload, authorId, isAdmin]);

    const performAutoSaveRef = useRef(performAutoSave);
    performAutoSaveRef.current = performAutoSave;

    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => performAutoSaveRef.current(), 2500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [title, description, mdxContent, template, coverImageKey, categoryIds, tagIds]);

    return { autoSavedIdRef, savedCollectionId, autoSaveStatus, autoSaveLabel, buildPayload };
}
```

### Task 12: Create Recipe Search Modal

**Files:**

- Create: `src/components/collections/RecipeSearchModal.tsx`

- [ ] **Step 1: Write recipe search modal component**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { css } from 'styled-system/css';
import { X, Search } from 'lucide-react';

interface RecipeSearchResult {
    id: string;
    slug: string;
    title: string;
    imageKey: string | null;
}

interface RecipeSearchModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (recipes: RecipeSearchResult[]) => void;
    multiSelect?: boolean;
}

export function RecipeSearchModal({
    open,
    onClose,
    onSelect,
    multiSelect = false,
}: RecipeSearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RecipeSearchResult[]>([]);
    const [selected, setSelected] = useState<RecipeSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const search = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}&limit=20`);
            const data = await res.json();
            setResults(data.recipes ?? []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleQueryChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setQuery(val);
            // Debounce search
            const timer = setTimeout(() => search(val), 300);
            return () => clearTimeout(timer);
        },
        [search],
    );

    const handleToggle = (recipe: RecipeSearchResult) => {
        if (multiSelect) {
            setSelected((prev) =>
                prev.some((r) => r.id === recipe.id)
                    ? prev.filter((r) => r.id !== recipe.id)
                    : [...prev, recipe],
            );
        } else {
            onSelect([recipe]);
            onClose();
        }
    };

    const handleConfirm = () => {
        if (selected.length > 0) {
            onSelect(selected);
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div
            className={css({
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            })}
        >
            <div
                className={css({ position: 'absolute', inset: 0, bg: 'rgba(0,0,0,0.5)' })}
                onClick={onClose}
            />
            <div
                className={css({
                    position: 'relative',
                    bg: 'white',
                    borderRadius: 'xl',
                    p: '6',
                    w: '100%',
                    maxW: '560px',
                    maxH: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: '4',
                    })}
                >
                    <h3 className={css({ fontSize: 'lg', fontWeight: 'bold' })}>
                        Rezept einfuegen
                    </h3>
                    <button onClick={onClose} className={css({ cursor: 'pointer', p: '1' })}>
                        <X size={20} />
                    </button>
                </div>

                <div className={css({ position: 'relative', mb: '4' })}>
                    <Search
                        size={16}
                        className={css({
                            position: 'absolute',
                            left: '3',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'gray.400',
                        })}
                    />
                    <input
                        type="text"
                        placeholder="Rezept suchen..."
                        value={query}
                        onChange={handleQueryChange}
                        autoFocus
                        className={css({
                            w: '100%',
                            pl: '10',
                            pr: '4',
                            py: '2',
                            border: '1px solid',
                            borderColor: 'gray.300',
                            borderRadius: 'lg',
                            fontSize: 'sm',
                        })}
                    />
                </div>

                <div className={css({ flex: 1, overflowY: 'auto' })}>
                    {loading && (
                        <p className={css({ color: 'gray.500', textAlign: 'center', py: '4' })}>
                            Suche...
                        </p>
                    )}
                    {results.map((recipe) => {
                        const isSelected = selected.some((r) => r.id === recipe.id);
                        return (
                            <button
                                key={recipe.id}
                                onClick={() => handleToggle(recipe)}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3',
                                    w: '100%',
                                    p: '3',
                                    borderRadius: 'lg',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    bg: isSelected ? 'orange.50' : 'transparent',
                                    _hover: { bg: isSelected ? 'orange.100' : 'gray.50' },
                                })}
                            >
                                <span
                                    className={css({
                                        flex: 1,
                                        fontSize: 'sm',
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                    })}
                                >
                                    {recipe.title}
                                </span>
                                {isSelected && (
                                    <span className={css({ color: 'orange.500', fontSize: 'xs' })}>
                                        Ausgewaehlt
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {multiSelect && selected.length > 0 && (
                    <div
                        className={css({
                            mt: '4',
                            pt: '4',
                            borderTop: '1px solid',
                            borderColor: 'gray.200',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        })}
                    >
                        <span className={css({ fontSize: 'sm', color: 'gray.600' })}>
                            {selected.length} ausgewaehlt
                        </span>
                        <button
                            onClick={handleConfirm}
                            className={css({
                                px: '4',
                                py: '2',
                                bg: 'orange.500',
                                color: 'white',
                                borderRadius: 'lg',
                                fontWeight: 'bold',
                                fontSize: 'sm',
                                cursor: 'pointer',
                                _hover: { bg: 'orange.600' },
                            })}
                        >
                            Einfuegen
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

### Task 13: Create Collection Editor Toolbar

**Files:**

- Create: `src/components/collections/CollectionEditorToolbar.tsx`

- [ ] **Step 1: Write toolbar with template picker and snippet buttons**

```tsx
'use client';

import { css } from 'styled-system/css';
import {
    LayoutTemplate,
    BookOpen,
    Image,
    Bold,
    Italic,
    Heading,
    Link,
    ListOrdered,
    Shuffle,
    Star,
} from 'lucide-react';
import type { CollectionTemplate } from '@prisma/client';

interface CollectionEditorToolbarProps {
    template: CollectionTemplate;
    onTemplateChange: (template: CollectionTemplate) => void;
    onInsertSnippet: (snippet: string) => void;
    onOpenRecipeSearch: (mode: 'single' | 'multi') => void;
    onFormatting: (type: 'bold' | 'italic' | 'heading' | 'link' | 'image') => void;
}

const TEMPLATES: { value: CollectionTemplate; label: string }[] = [
    { value: 'SIDEBAR', label: 'Sidebar' },
    { value: 'GRID_BELOW', label: 'Grid' },
    { value: 'HERO_PICKS', label: 'Hero Picks' },
    { value: 'INLINE', label: 'Inline' },
];

const SNIPPETS = [
    { label: 'Rezept-Slider', icon: BookOpen, snippet: '<RecipeSlider sort="newest" limit={8} />' },
    { label: 'Featured Trio', icon: Star, snippet: '<FeaturedTrio sort="rating" limit={3} />' },
    { label: 'Top-Liste', icon: ListOrdered, snippet: '<TopList sort="rating" limit={5} />' },
    { label: 'Zufalls-Pick', icon: Shuffle, snippet: '<RandomPick limit={1} />' },
];

export function CollectionEditorToolbar({
    template,
    onTemplateChange,
    onInsertSnippet,
    onOpenRecipeSearch,
    onFormatting,
}: CollectionEditorToolbarProps) {
    return (
        <div
            className={css({
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2',
                p: '2',
                borderBottom: '1px solid',
                borderColor: 'gray.200',
                bg: 'gray.50',
            })}
        >
            {/* Template picker */}
            <div className={css({ display: 'flex', alignItems: 'center', gap: '1', mr: '2' })}>
                <LayoutTemplate size={16} />
                <select
                    value={template}
                    onChange={(e) => onTemplateChange(e.target.value as CollectionTemplate)}
                    className={css({
                        fontSize: 'xs',
                        px: '2',
                        py: '1',
                        border: '1px solid',
                        borderColor: 'gray.300',
                        borderRadius: 'md',
                        bg: 'white',
                    })}
                >
                    {TEMPLATES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Formatting buttons */}
            <div
                className={css({
                    display: 'flex',
                    gap: '1',
                    mr: '2',
                    borderLeft: '1px solid',
                    borderColor: 'gray.300',
                    pl: '2',
                })}
            >
                {(['bold', 'italic', 'heading', 'link', 'image'] as const).map((type) => {
                    const Icon = {
                        bold: Bold,
                        italic: Italic,
                        heading: Heading,
                        link: Link,
                        image: Image,
                    }[type];
                    return (
                        <button
                            key={type}
                            onClick={() => onFormatting(type)}
                            className={css({
                                p: '1',
                                borderRadius: 'md',
                                cursor: 'pointer',
                                _hover: { bg: 'gray.200' },
                            })}
                            title={type}
                        >
                            <Icon size={16} />
                        </button>
                    );
                })}
            </div>

            {/* Recipe insert */}
            <button
                onClick={() => onOpenRecipeSearch('single')}
                className={css({
                    fontSize: 'xs',
                    px: '3',
                    py: '1',
                    bg: 'orange.500',
                    color: 'white',
                    borderRadius: 'md',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    _hover: { bg: 'orange.600' },
                })}
            >
                + Rezept einfuegen
            </button>

            {/* Component snippets */}
            <div className={css({ display: 'flex', gap: '1', ml: 'auto' })}>
                {SNIPPETS.map((s) => (
                    <button
                        key={s.label}
                        onClick={() => onInsertSnippet(s.snippet)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'xs',
                            px: '2',
                            py: '1',
                            borderRadius: 'md',
                            cursor: 'pointer',
                            border: '1px solid',
                            borderColor: 'gray.300',
                            _hover: { bg: 'gray.100' },
                        })}
                        title={s.label}
                    >
                        <s.icon size={14} />
                        <span className={css({ display: { base: 'none', md: 'inline' } })}>
                            {s.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
```

### Task 14: Create Collection Editor

**Files:**

- Create: `src/components/collections/CollectionEditor.tsx`

- [ ] **Step 1: Write split-view MDX editor with live preview**

```tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { css } from 'styled-system/css';
import { useCollectionAutoSave } from './useCollectionAutoSave';
import { CollectionEditorToolbar } from './CollectionEditorToolbar';
import { RecipeSearchModal } from './RecipeSearchModal';
import type { CollectionTemplate } from '@prisma/client';
import { publishCollection } from '@app/app/actions/collections';
import { useRouter } from 'next/navigation';
import { Eye, Send } from 'lucide-react';

interface CollectionEditorProps {
    initialData?: {
        id: string;
        slug: string;
        title: string;
        description: string | null;
        mdxContent: string | null;
        template: CollectionTemplate;
        coverImageKey: string | null;
        categoryIds: string[];
        tagIds: string[];
        published: boolean;
    };
    authorId: string;
    isAdmin: boolean;
}

export function CollectionEditor({ initialData, authorId, isAdmin }: CollectionEditorProps) {
    const router = useRouter();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [title, setTitle] = useState(initialData?.title ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [mdxContent, setMdxContent] = useState(initialData?.mdxContent ?? '');
    const [template, setTemplate] = useState<CollectionTemplate>(initialData?.template ?? 'INLINE');
    const [coverImageKey, setCoverImageKey] = useState<string | null>(
        initialData?.coverImageKey ?? null,
    );
    const [categoryIds, setCategoryIds] = useState<string[]>(initialData?.categoryIds ?? []);
    const [tagIds, setTagIds] = useState<string[]>(initialData?.tagIds ?? []);
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');
    const [publishing, setPublishing] = useState(false);

    const autoSave = useCollectionAutoSave({
        title,
        description,
        mdxContent,
        template,
        coverImageKey,
        categoryIds,
        tagIds,
        authorId,
        isAdmin,
        isPublished: initialData?.published ?? false,
        initialId: initialData?.id ?? null,
    });

    const insertAtCursor = useCallback(
        (text: string) => {
            const textarea = textareaRef.current;
            if (!textarea) {
                setMdxContent((prev) => prev + '\n' + text + '\n');
                return;
            }
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = mdxContent.slice(0, start);
            const after = mdxContent.slice(end);
            const newContent = before + '\n' + text + '\n' + after;
            setMdxContent(newContent);
            // Restore cursor position after insert
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + text.length + 2;
                textarea.focus();
            });
        },
        [mdxContent],
    );

    const handleRecipeSelect = useCallback(
        (recipes: { id: string; title: string }[]) => {
            if (recipes.length === 1) {
                insertAtCursor(`<RecipeCard id="${recipes[0].id}" />`);
            } else {
                const ids = recipes.map((r) => `"${r.id}"`).join(', ');
                insertAtCursor(`<RecipeSlider ids={[${ids}]} />`);
            }
        },
        [insertAtCursor],
    );

    const handleFormatting = useCallback(
        (type: 'bold' | 'italic' | 'heading' | 'link' | 'image') => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selected = mdxContent.slice(start, end);

            const wrappers: Record<string, [string, string]> = {
                bold: ['**', '**'],
                italic: ['*', '*'],
                heading: ['## ', ''],
                link: ['[', '](url)'],
                image: ['![', '](url)'],
            };

            const [pre, post] = wrappers[type];
            const newContent =
                mdxContent.slice(0, start) +
                pre +
                (selected || 'Text') +
                post +
                mdxContent.slice(end);
            setMdxContent(newContent);
        },
        [mdxContent],
    );

    const handlePublish = async () => {
        const id = autoSave.autoSavedIdRef.current;
        if (!id) return;
        setPublishing(true);
        try {
            await publishCollection(id, authorId);
            router.push(`/collection/${initialData?.slug ?? id}`);
        } catch (error) {
            console.error('[CollectionEditor] Publish failed:', error);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div
            className={css({ display: 'flex', flexDirection: 'column', h: '100vh', maxH: '100vh' })}
        >
            {/* Header */}
            <div
                className={css({
                    p: '4',
                    borderBottom: '1px solid',
                    borderColor: 'gray.200',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4',
                })}
            >
                <input
                    type="text"
                    placeholder="Sammlungstitel..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={css({
                        flex: 1,
                        fontSize: 'xl',
                        fontWeight: 'bold',
                        border: 'none',
                        outline: 'none',
                        bg: 'transparent',
                    })}
                />
                <span
                    className={css({
                        fontSize: 'xs',
                        color: autoSave.autoSaveStatus === 'error' ? 'red.500' : 'gray.500',
                    })}
                >
                    {autoSave.autoSaveLabel}
                </span>
                <button
                    onClick={handlePublish}
                    disabled={publishing || !autoSave.autoSavedIdRef.current}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        px: '4',
                        py: '2',
                        bg: 'orange.500',
                        color: 'white',
                        borderRadius: 'lg',
                        fontWeight: 'bold',
                        fontSize: 'sm',
                        cursor: 'pointer',
                        _hover: { bg: 'orange.600' },
                        _disabled: { opacity: 0.5, cursor: 'not-allowed' },
                    })}
                >
                    <Send size={16} />
                    Veroeffentlichen
                </button>
            </div>

            {/* Description */}
            <div
                className={css({
                    px: '4',
                    py: '2',
                    borderBottom: '1px solid',
                    borderColor: 'gray.100',
                })}
            >
                <input
                    type="text"
                    placeholder="Kurzbeschreibung (optional)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={css({
                        w: '100%',
                        fontSize: 'sm',
                        border: 'none',
                        outline: 'none',
                        bg: 'transparent',
                        color: 'gray.600',
                    })}
                />
            </div>

            {/* Toolbar */}
            <CollectionEditorToolbar
                template={template}
                onTemplateChange={setTemplate}
                onInsertSnippet={insertAtCursor}
                onOpenRecipeSearch={(mode) => {
                    setSearchMode(mode);
                    setSearchModalOpen(true);
                }}
                onFormatting={handleFormatting}
            />

            {/* Split view: Editor + Preview */}
            <div
                className={css({
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                    overflow: 'hidden',
                })}
            >
                {/* MDX Textarea */}
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: { md: '1px solid' },
                        borderColor: 'gray.200',
                    })}
                >
                    <div
                        className={css({
                            px: '3',
                            py: '1',
                            fontSize: 'xs',
                            color: 'gray.500',
                            bg: 'gray.50',
                            borderBottom: '1px solid',
                            borderColor: 'gray.100',
                        })}
                    >
                        MDX Editor
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={mdxContent}
                        onChange={(e) => setMdxContent(e.target.value)}
                        placeholder="Schreibe deinen Beitrag hier...\n\nVerwende die Toolbar oben, um Rezepte und Komponenten einzufuegen."
                        className={css({
                            flex: 1,
                            p: '4',
                            fontFamily: 'mono',
                            fontSize: 'sm',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            lineHeight: '1.6',
                        })}
                        spellCheck={false}
                    />
                </div>

                {/* Live Preview */}
                <div
                    className={css({
                        display: { base: 'none', md: 'flex' },
                        flexDirection: 'column',
                        overflow: 'auto',
                    })}
                >
                    <div
                        className={css({
                            px: '3',
                            py: '1',
                            fontSize: 'xs',
                            color: 'gray.500',
                            bg: 'gray.50',
                            borderBottom: '1px solid',
                            borderColor: 'gray.100',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                        })}
                    >
                        <Eye size={12} />
                        Vorschau
                    </div>
                    <div className={css({ flex: 1, p: '4', overflow: 'auto' })}>
                        <CollectionPreview mdxContent={mdxContent} template={template} />
                    </div>
                </div>
            </div>

            <RecipeSearchModal
                open={searchModalOpen}
                onClose={() => setSearchModalOpen(false)}
                onSelect={handleRecipeSelect}
                multiSelect={searchMode === 'multi'}
            />
        </div>
    );
}

/** Simple preview — renders MDX as markdown-like text. Full MDX preview is server-side only. */
function CollectionPreview({
    mdxContent,
    template,
}: {
    mdxContent: string;
    template: CollectionTemplate;
}) {
    if (!mdxContent.trim()) {
        return (
            <p className={css({ color: 'gray.400', fontStyle: 'italic' })}>
                Die Vorschau erscheint hier, sobald du Inhalte schreibst...
            </p>
        );
    }

    // For now, render as raw text with component tags highlighted
    const lines = mdxContent.split('\n');
    return (
        <div className={css({ fontSize: 'sm', lineHeight: '1.8' })}>
            <div
                className={css({
                    mb: '2',
                    px: '2',
                    py: '1',
                    bg: 'blue.50',
                    borderRadius: 'md',
                    fontSize: 'xs',
                    color: 'blue.600',
                })}
            >
                Template: {template}
            </div>
            {lines.map((line, i) => {
                const isComponent = line.trim().startsWith('<');
                return (
                    <div
                        key={i}
                        className={css({
                            py: '0.5',
                            ...(isComponent
                                ? {
                                      bg: 'orange.50',
                                      px: '2',
                                      borderRadius: 'md',
                                      fontFamily: 'mono',
                                      fontSize: 'xs',
                                      color: 'orange.700',
                                  }
                                : {}),
                            ...(line.startsWith('#') ? { fontSize: 'lg', fontWeight: 'bold' } : {}),
                        })}
                    >
                        {line || '\u00A0'}
                    </div>
                );
            })}
        </div>
    );
}
```

### Task 15: Create Collection Create/Edit Pages

**Files:**

- Create: `src/app/collection/create/page.tsx`
- Create: `src/app/collection/[slug]/edit/page.tsx`

- [ ] **Step 1: Write create page**

```tsx
import { getServerAuthSession } from '@app/lib/auth';
import { redirect } from 'next/navigation';
import { CollectionEditor } from '@app/components/collections/CollectionEditor';

export default async function CreateCollectionPage() {
    const session = await getServerAuthSession('collection-create');
    if (!session?.user?.id) redirect('/auth/login');

    const isAdmin = session.user.role === 'admin' || session.user.role === 'moderator';

    return <CollectionEditor authorId={session.user.id} isAdmin={isAdmin} />;
}
```

- [ ] **Step 2: Write edit page**

```tsx
import { getServerAuthSession } from '@app/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { CollectionEditor } from '@app/components/collections/CollectionEditor';
import { prisma } from '@shared/prisma';

interface EditCollectionPageProps {
    params: Promise<{ slug: string }>;
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
    const resolvedParams = await params;
    const session = await getServerAuthSession('collection-edit');
    if (!session?.user?.id) redirect('/auth/login');

    const isAdmin = session.user.role === 'admin' || session.user.role === 'moderator';

    const collection = await prisma.collection.findFirst({
        where: { OR: [{ slug: resolvedParams.slug }, { id: resolvedParams.slug }] },
        include: {
            tags: { select: { tagId: true } },
            categories: { select: { categoryId: true } },
        },
    });

    if (!collection) notFound();
    if (collection.authorId !== session.user.id && !isAdmin) notFound();

    return (
        <CollectionEditor
            initialData={{
                id: collection.id,
                slug: collection.slug,
                title: collection.title,
                description: collection.description,
                mdxContent: collection.mdxContent,
                template: collection.template,
                coverImageKey: collection.coverImageKey,
                categoryIds: collection.categories.map((c) => c.categoryId),
                tagIds: collection.tags.map((t) => t.tagId),
                published: collection.published,
            }}
            authorId={session.user.id}
            isAdmin={isAdmin}
        />
    );
}
```

---

## Phase 5: Detail Page

### Task 16: Create Template Layouts

**Files:**

- Create: `src/app/collection/[slug]/templates/SidebarLayout.tsx`
- Create: `src/app/collection/[slug]/templates/GridBelowLayout.tsx`
- Create: `src/app/collection/[slug]/templates/HeroPicksLayout.tsx`
- Create: `src/app/collection/[slug]/templates/InlineLayout.tsx`

- [ ] **Step 1: Write SidebarLayout — MDX left, recipe cards right**

```tsx
import { css } from 'styled-system/css';
import type { ReactNode } from 'react';
import type { RecipeCardData } from '@app/lib/recipe-card';
import { RecipeCard } from '@app/components/features/RecipeCard';

interface SidebarLayoutProps {
    mdxContent: ReactNode;
    sidebarRecipes: RecipeCardData[];
    collectionId: string;
}

export function SidebarLayout({ mdxContent, sidebarRecipes, collectionId }: SidebarLayoutProps) {
    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: '1fr 320px' },
                gap: '8',
                maxW: '1200px',
                mx: 'auto',
                px: '4',
                py: '8',
            })}
        >
            <article
                className={css({
                    fontSize: 'base',
                    lineHeight: '1.8',
                    '& h1': { fontSize: '2xl', fontWeight: 'bold', mb: '4' },
                    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '6', mb: '3' },
                    '& p': { mb: '4' },
                })}
            >
                {mdxContent}
            </article>
            <aside className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                {sidebarRecipes.map((recipe) => (
                    <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        variant="compact"
                        categoryOnImage
                        starRating
                        refParam={`col_${collectionId}`}
                    />
                ))}
            </aside>
        </div>
    );
}
```

- [ ] **Step 2: Write GridBelowLayout — MDX top, recipe grid below**

```tsx
import { css } from 'styled-system/css';
import type { ReactNode } from 'react';
import type { RecipeCardData } from '@app/lib/recipe-card';
import { RecipeCard } from '@app/components/features/RecipeCard';

interface GridBelowLayoutProps {
    mdxContent: ReactNode;
    recipes: RecipeCardData[];
    collectionId: string;
}

export function GridBelowLayout({ mdxContent, recipes, collectionId }: GridBelowLayoutProps) {
    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            <article
                className={css({
                    maxW: '768px',
                    mx: 'auto',
                    fontSize: 'base',
                    lineHeight: '1.8',
                    mb: '8',
                    '& h1': { fontSize: '2xl', fontWeight: 'bold', mb: '4' },
                    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '6', mb: '3' },
                    '& p': { mb: '4' },
                })}
            >
                {mdxContent}
            </article>
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: {
                        base: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)',
                    },
                    gap: '6',
                })}
            >
                {recipes.map((recipe) => (
                    <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        variant="default"
                        categoryOnImage
                        categoryLink
                        starRating
                        refParam={`col_${collectionId}`}
                    />
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Write HeroPicksLayout — hero cards top, MDX below**

```tsx
import { css } from 'styled-system/css';
import type { ReactNode } from 'react';
import type { RecipeCardData } from '@app/lib/recipe-card';
import { FeaturedTrio } from '@app/app/category/[slug]/components/FeaturedTrio';

interface HeroPicksLayoutProps {
    mdxContent: ReactNode;
    heroRecipes: RecipeCardData[];
}

export function HeroPicksLayout({ mdxContent, heroRecipes }: HeroPicksLayoutProps) {
    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            {heroRecipes.length > 0 && (
                <div className={css({ mb: '8' })}>
                    <FeaturedTrio recipes={heroRecipes} categoryColor="#f97316" />
                </div>
            )}
            <article
                className={css({
                    maxW: '768px',
                    mx: 'auto',
                    fontSize: 'base',
                    lineHeight: '1.8',
                    '& h1': { fontSize: '2xl', fontWeight: 'bold', mb: '4' },
                    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '6', mb: '3' },
                    '& p': { mb: '4' },
                })}
            >
                {mdxContent}
            </article>
        </div>
    );
}
```

- [ ] **Step 4: Write InlineLayout — pure MDX flow**

```tsx
import { css } from 'styled-system/css';
import type { ReactNode } from 'react';

interface InlineLayoutProps {
    mdxContent: ReactNode;
}

export function InlineLayout({ mdxContent }: InlineLayoutProps) {
    return (
        <div className={css({ maxW: '768px', mx: 'auto', px: '4', py: '8' })}>
            <article
                className={css({
                    fontSize: 'base',
                    lineHeight: '1.8',
                    '& h1': { fontSize: '2xl', fontWeight: 'bold', mb: '4' },
                    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '6', mb: '3' },
                    '& p': { mb: '4' },
                })}
            >
                {mdxContent}
            </article>
        </div>
    );
}
```

### Task 17: Create Collection Detail Page

**Files:**

- Create: `src/app/collection/[slug]/page.tsx`
- Create: `src/app/collection/[slug]/CollectionDetailClient.tsx`

- [ ] **Step 1: Write server page with ISR**

```tsx
import { notFound } from 'next/navigation';
import { getServerAuthSession } from '@app/lib/auth';
import { fetchCollectionBySlug } from '@app/app/actions/collections';
import { compileCollectionMdx } from '@app/lib/collections/mdx';
import { createMdxComponents } from '@app/lib/collections/mdx-components';
import { toRecipeCardData } from '@app/lib/recipe-card';
import { prisma } from '@shared/prisma';
import { SidebarLayout } from './templates/SidebarLayout';
import { GridBelowLayout } from './templates/GridBelowLayout';
import { HeroPicksLayout } from './templates/HeroPicksLayout';
import { InlineLayout } from './templates/InlineLayout';
import { CollectionDetailClient } from './CollectionDetailClient';
import type { Metadata } from 'next';

export const revalidate = 60;
export const dynamicParams = true;

interface CollectionPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
    const { slug } = await params;
    const collection = await fetchCollectionBySlug(slug);
    if (!collection) return { title: 'Sammlung nicht gefunden' };
    return {
        title: `${collection.title} | Kuechentakt`,
        description: collection.description ?? `Rezeptsammlung von ${collection.author.name}`,
    };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
    const { slug } = await params;
    const session = await getServerAuthSession('collection-detail');
    const viewerId = session?.user?.id ?? null;

    // Try published first, then drafts for author/admin
    let collection = await fetchCollectionBySlug(slug, viewerId);
    if (!collection && viewerId) {
        collection = await fetchCollectionBySlug(slug, viewerId, true);
        if (collection && collection.authorId !== viewerId) {
            const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'moderator';
            if (!isAdmin) collection = null;
        }
    }

    if (!collection) notFound();

    // Compile MDX
    let mdxContent = null;
    if (collection.mdxContent) {
        const components = createMdxComponents(collection.id, viewerId);
        mdxContent = await compileCollectionMdx(
            collection.id,
            collection.mdxContent,
            new Date(collection.updatedAt),
            components,
        );
    }

    // Fetch recipes for template layouts (Sidebar, GridBelow, HeroPicks need them)
    let templateRecipes: any[] = [];
    if (collection.template !== 'INLINE') {
        const collectionRecipes = await prisma.collectionRecipe.findMany({
            where: { collectionId: collection.id },
            orderBy: { position: 'asc' },
            include: {
                recipe: {
                    include: { categories: { include: { category: true } } },
                },
            },
        });
        templateRecipes = collectionRecipes
            .filter((cr) => cr.recipe.status === 'PUBLISHED')
            .map((cr) => toRecipeCardData(cr.recipe));
    }

    // Render based on template
    let layout = null;
    switch (collection.template) {
        case 'SIDEBAR':
            layout = (
                <SidebarLayout
                    mdxContent={mdxContent}
                    sidebarRecipes={templateRecipes}
                    collectionId={collection.id}
                />
            );
            break;
        case 'GRID_BELOW':
            layout = (
                <GridBelowLayout
                    mdxContent={mdxContent}
                    recipes={templateRecipes}
                    collectionId={collection.id}
                />
            );
            break;
        case 'HERO_PICKS':
            layout = (
                <HeroPicksLayout
                    mdxContent={mdxContent}
                    heroRecipes={templateRecipes.slice(0, 3)}
                />
            );
            break;
        case 'INLINE':
        default:
            layout = <InlineLayout mdxContent={mdxContent} />;
            break;
    }

    return (
        <CollectionDetailClient collection={collection} isAuthenticated={!!viewerId}>
            {layout}
        </CollectionDetailClient>
    );
}
```

- [ ] **Step 2: Write client component for interactivity (favorite, view tracking)**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { css } from 'styled-system/css';
import { Heart, Eye, BookOpen, Calendar } from 'lucide-react';
import { toggleCollectionFavorite, trackCollectionView } from '@app/app/actions/collections';
import { useState } from 'react';
import type { CollectionDetail } from '@app/lib/collections/types';
import { SmartImage } from '@app/components/features/SmartImage';

interface CollectionDetailClientProps {
    collection: CollectionDetail;
    isAuthenticated: boolean;
    children: React.ReactNode;
}

export function CollectionDetailClient({
    collection,
    isAuthenticated,
    children,
}: CollectionDetailClientProps) {
    const [isFavorited, setIsFavorited] = useState(collection.isFavorited);
    const [favoriteCount, setFavoriteCount] = useState(collection.favoriteCount);
    const trackedRef = useRef(false);

    // Track view once
    useEffect(() => {
        if (trackedRef.current) return;
        trackedRef.current = true;
        trackCollectionView(collection.id).catch(() => {});
    }, [collection.id]);

    const handleFavorite = async () => {
        if (!isAuthenticated) return;
        const newState = await toggleCollectionFavorite(collection.id);
        setIsFavorited(newState);
        setFavoriteCount((prev) => prev + (newState ? 1 : -1));
    };

    const date = new Date(collection.createdAt).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const isDraft = !collection.published;
    const isPending = collection.moderationStatus === 'PENDING';
    const isRejected = collection.moderationStatus === 'REJECTED';

    return (
        <div>
            {/* Moderation banners (author only) */}
            {isDraft && (
                <div
                    className={css({
                        bg: 'yellow.50',
                        color: 'yellow.800',
                        p: '3',
                        textAlign: 'center',
                        fontSize: 'sm',
                    })}
                >
                    Diese Sammlung ist ein Entwurf und nur fuer dich sichtbar.
                </div>
            )}
            {isPending && (
                <div
                    className={css({
                        bg: 'blue.50',
                        color: 'blue.800',
                        p: '3',
                        textAlign: 'center',
                        fontSize: 'sm',
                    })}
                >
                    Diese Sammlung wird noch geprueft.
                </div>
            )}
            {isRejected && (
                <div
                    className={css({
                        bg: 'red.50',
                        color: 'red.800',
                        p: '3',
                        textAlign: 'center',
                        fontSize: 'sm',
                    })}
                >
                    Diese Sammlung wurde abgelehnt.
                </div>
            )}

            {/* Cover + Header */}
            <div className={css({ maxW: '1200px', mx: 'auto', px: '4', pt: '6' })}>
                {collection.coverImageKey && (
                    <div
                        className={css({
                            mb: '6',
                            borderRadius: 'xl',
                            overflow: 'hidden',
                            maxH: '300px',
                        })}
                    >
                        <SmartImage
                            imageKey={collection.coverImageKey}
                            aspect="3:1"
                            sizes="(max-width: 768px) 100vw, 1200px"
                            fill
                        />
                    </div>
                )}

                <h1 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '2' })}>
                    {collection.title}
                </h1>
                {collection.description && (
                    <p className={css({ fontSize: 'lg', color: 'gray.600', mb: '4' })}>
                        {collection.description}
                    </p>
                )}

                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4',
                        mb: '6',
                        flexWrap: 'wrap',
                    })}
                >
                    <span
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'sm',
                            color: 'gray.500',
                        })}
                    >
                        <Calendar size={14} /> {date}
                    </span>
                    <span
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'sm',
                            color: 'gray.500',
                        })}
                    >
                        <BookOpen size={14} /> {collection.recipeCount} Rezepte
                    </span>
                    <span
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1',
                            fontSize: 'sm',
                            color: 'gray.500',
                        })}
                    >
                        <Eye size={14} /> {collection.viewCount}
                    </span>

                    {isAuthenticated && (
                        <button
                            onClick={handleFavorite}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1',
                                fontSize: 'sm',
                                cursor: 'pointer',
                                color: isFavorited ? 'red.500' : 'gray.500',
                                _hover: { color: isFavorited ? 'red.600' : 'gray.700' },
                            })}
                        >
                            <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                            {favoriteCount}
                        </button>
                    )}

                    <a
                        href={`/user/${collection.author.slug}`}
                        className={css({
                            fontSize: 'sm',
                            color: 'orange.600',
                            _hover: { textDecoration: 'underline' },
                        })}
                    >
                        von {collection.author.name}
                    </a>
                </div>
            </div>

            {/* Template Layout */}
            {children}
        </div>
    );
}
```

---

## Phase 6: Browse & Discovery

### Task 18: Create Collection Card Component

**Files:**

- Create: `src/components/collections/CollectionCard.tsx`

- [ ] **Step 1: Write CollectionCard for browse/homepage**

```tsx
import { css } from 'styled-system/css';
import { Eye, Heart, BookOpen } from 'lucide-react';
import { SmartImage } from '@app/components/features/SmartImage';
import type { CollectionCardData } from '@app/lib/collections/types';

interface CollectionCardProps {
    collection: CollectionCardData;
}

export function CollectionCard({ collection }: CollectionCardProps) {
    return (
        <a
            href={`/collection/${collection.slug}`}
            className={css({
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'xl',
                overflow: 'hidden',
                bg: 'white',
                boxShadow: 'sm',
                transition: 'all 0.2s',
                _hover: { boxShadow: 'md', transform: 'translateY(-2px)' },
                minW: '280px',
                maxW: '340px',
            })}
        >
            {/* Cover */}
            <div className={css({ position: 'relative', aspectRatio: '16/9', bg: 'gray.100' })}>
                {collection.coverImageKey ? (
                    <SmartImage
                        imageKey={collection.coverImageKey}
                        aspect="16:9"
                        sizes="340px"
                        fill
                    />
                ) : (
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            h: '100%',
                            color: 'gray.400',
                        })}
                    >
                        <BookOpen size={32} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className={css({ p: '4' })}>
                <h3
                    className={css({ fontSize: 'md', fontWeight: 'bold', mb: '1', lineClamp: '1' })}
                >
                    {collection.title}
                </h3>
                {collection.description && (
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'gray.500',
                            mb: '3',
                            lineClamp: '2',
                        })}
                    >
                        {collection.description}
                    </p>
                )}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 'xs',
                        color: 'gray.400',
                    })}
                >
                    <span>{collection.authorName}</span>
                    <div className={css({ display: 'flex', gap: '3' })}>
                        <span className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
                            <BookOpen size={12} /> {collection.recipeCount}
                        </span>
                        <span className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
                            <Eye size={12} /> {collection.viewCount}
                        </span>
                        <span className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
                            <Heart size={12} /> {collection.favoriteCount}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
}
```

### Task 19: Create Collections Browse Page

**Files:**

- Create: `src/app/collections/page.tsx`

- [ ] **Step 1: Write browse page**

```tsx
import { css } from 'styled-system/css';
import { fetchPopularCollections, fetchNewestCollections } from '@app/app/actions/collections';
import { CollectionCard } from '@app/components/collections/CollectionCard';
import { CustomScrollbar } from '@app/components/features/CustomScrollbar';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Sammlungen | Kuechentakt',
    description: 'Entdecke kuratierte Rezeptsammlungen der Community.',
};

export default async function CollectionsPage() {
    const [popular, newest] = await Promise.all([
        fetchPopularCollections(12),
        fetchNewestCollections(12),
    ]);

    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            <h1 className={css({ fontSize: '3xl', fontWeight: 'bold', mb: '8' })}>Sammlungen</h1>

            {popular.length > 0 && (
                <section className={css({ mb: '10' })}>
                    <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '4' })}>
                        Beliebt
                    </h2>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: {
                                base: '1fr',
                                sm: 'repeat(2, 1fr)',
                                lg: 'repeat(3, 1fr)',
                            },
                            gap: '6',
                        })}
                    >
                        {popular.map((c) => (
                            <CollectionCard key={c.id} collection={c} />
                        ))}
                    </div>
                </section>
            )}

            {newest.length > 0 && (
                <section>
                    <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '4' })}>
                        Neueste
                    </h2>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: {
                                base: '1fr',
                                sm: 'repeat(2, 1fr)',
                                lg: 'repeat(3, 1fr)',
                            },
                            gap: '6',
                        })}
                    >
                        {newest.map((c) => (
                            <CollectionCard key={c.id} collection={c} />
                        ))}
                    </div>
                </section>
            )}

            {popular.length === 0 && newest.length === 0 && (
                <p className={css({ color: 'gray.500', textAlign: 'center', py: '16' })}>
                    Noch keine Sammlungen vorhanden. Erstelle die erste!
                </p>
            )}
        </div>
    );
}
```

### Task 20: Create User Collections Page

**Files:**

- Create: `src/app/profile/collections/page.tsx`

- [ ] **Step 1: Write user's collections management page**

```tsx
import { css } from 'styled-system/css';
import { getServerAuthSession } from '@app/lib/auth';
import { redirect } from 'next/navigation';
import { fetchUserCollections } from '@app/app/actions/collections';
import { CollectionCard } from '@app/components/collections/CollectionCard';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Meine Sammlungen | Kuechentakt',
};

export default async function UserCollectionsPage() {
    const session = await getServerAuthSession('profile-collections');
    if (!session?.user?.id) redirect('/auth/login');

    const collections = await fetchUserCollections(session.user.id);

    return (
        <div className={css({ maxW: '1200px', mx: 'auto', px: '4', py: '8' })}>
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: '6',
                })}
            >
                <h1 className={css({ fontSize: '2xl', fontWeight: 'bold' })}>Meine Sammlungen</h1>
                <a
                    href="/collection/create"
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        px: '4',
                        py: '2',
                        bg: 'orange.500',
                        color: 'white',
                        borderRadius: 'lg',
                        fontWeight: 'bold',
                        fontSize: 'sm',
                        _hover: { bg: 'orange.600' },
                    })}
                >
                    <Plus size={16} />
                    Neue Sammlung
                </a>
            </div>

            {collections.length > 0 ? (
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: {
                            base: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: 'repeat(3, 1fr)',
                        },
                        gap: '6',
                    })}
                >
                    {collections.map((c) => (
                        <CollectionCard key={c.id} collection={c} />
                    ))}
                </div>
            ) : (
                <p className={css({ color: 'gray.500', textAlign: 'center', py: '16' })}>
                    Du hast noch keine Sammlungen erstellt.
                </p>
            )}
        </div>
    );
}
```

---

## Phase 7: Orphan Detection & Referrer Tracking

### Task 21: Add Referrer Tracking to Recipe View

**Files:**

- Modify: `src/app/recipe/[id]/page.tsx`

- [ ] **Step 1: Read `searchParams.ref` and pass to client**

In the recipe detail page's server component, read the `ref` search param:

```typescript
interface RecipePageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ ref?: string }>;
}
```

Pass `ref` to the client component. In the client, when logging a view to `UserViewHistory`, include the `source` field:

```typescript
// When tracking view, include source from ref param
if (ref) {
    await trackRecipeView(recipe.id, ref);
}
```

### Task 22: Add Orphan Detection on Recipe Delete/Unpublish

**Files:**

- Modify: `src/components/recipe/recipeMutations.ts` (or wherever recipe delete happens)

- [ ] **Step 1: On recipe delete/unpublish, detect affected collections**

After a recipe is deleted or status is changed away from PUBLISHED, add:

```typescript
import { handleOrphanedRecipeInCollections } from '@app/lib/collections/sync-recipes';

// After recipe delete or unpublish:
await handleOrphanedRecipeInCollections(recipeId).catch((err) =>
    console.error('[recipes] Failed to handle orphaned collections:', err),
);
```

- [ ] **Step 2: Add `handleOrphanedRecipeInCollections` to sync-recipes.ts**

Append to `src/lib/collections/sync-recipes.ts`:

```typescript
import { createUserNotification } from '@app/lib/events/persist';

/**
 * When a recipe is deleted/unpublished, find all collections referencing it,
 * set them to draft (published: false), and notify the collection author.
 */
export async function handleOrphanedRecipeInCollections(recipeId: string): Promise<void> {
    const affected = await prisma.collectionRecipe.findMany({
        where: { recipeId },
        include: {
            collection: {
                select: { id: true, title: true, published: true, authorId: true },
            },
        },
    });

    if (affected.length === 0) return;

    // Get unique collections that are currently published
    const publishedCollections = new Map<string, { id: string; title: string; authorId: string }>();
    for (const cr of affected) {
        if (cr.collection.published && !publishedCollections.has(cr.collection.id)) {
            publishedCollections.set(cr.collection.id, {
                id: cr.collection.id,
                title: cr.collection.title,
                authorId: cr.collection.authorId,
            });
        }
    }

    // Set affected published collections to draft and notify authors
    for (const [, col] of publishedCollections) {
        await prisma.collection.update({
            where: { id: col.id },
            data: { published: false },
        });

        await createUserNotification({
            userId: col.authorId,
            type: 'SYSTEM',
            title: 'Sammlung deaktiviert',
            message: `Ein Rezept in deiner Sammlung "${col.title}" wurde entfernt. Bitte pruefe und aktualisiere deine Sammlung.`,
            data: { collectionId: col.id },
        }).catch((err) => console.error('[collections] Failed to notify author:', err));
    }
}
```

---

## Summary of All Tasks

| #   | Task                        | Phase | Files                                                           |
| --- | --------------------------- | ----- | --------------------------------------------------------------- |
| 1   | Prisma schema changes       | 1     | `prisma/schema.prisma`                                          |
| 2   | Create & run migration      | 1     | `prisma/migrations/`                                            |
| 3   | Install next-mdx-remote     | 2     | `package.json`                                                  |
| 4   | Collection types            | 2     | `src/lib/collections/types.ts`                                  |
| 5   | MDX query resolution        | 2     | `src/lib/collections/mdx-queries.ts`                            |
| 6   | MDX components              | 2     | `src/lib/collections/mdx-components.tsx`                        |
| 7   | MDX compilation + LRU cache | 2     | `src/lib/collections/mdx.ts`                                    |
| 8   | CollectionRecipe sync       | 2     | `src/lib/collections/sync-recipes.ts`                           |
| 9   | Server actions (CRUD)       | 3     | `src/app/actions/collections.ts`                                |
| 10  | Update moderation service   | 3     | `src/lib/moderation/moderationService.ts`                       |
| 11  | Auto-save hook              | 4     | `src/components/collections/useCollectionAutoSave.ts`           |
| 12  | Recipe search modal         | 4     | `src/components/collections/RecipeSearchModal.tsx`              |
| 13  | Editor toolbar              | 4     | `src/components/collections/CollectionEditorToolbar.tsx`        |
| 14  | Collection editor           | 4     | `src/components/collections/CollectionEditor.tsx`               |
| 15  | Create/Edit pages           | 4     | `src/app/collection/create/`, `src/app/collection/[slug]/edit/` |
| 16  | Template layouts (4)        | 5     | `src/app/collection/[slug]/templates/`                          |
| 17  | Collection detail page      | 5     | `src/app/collection/[slug]/page.tsx`                            |
| 18  | CollectionCard component    | 6     | `src/components/collections/CollectionCard.tsx`                 |
| 19  | Collections browse page     | 6     | `src/app/collections/page.tsx`                                  |
| 20  | User collections page       | 6     | `src/app/profile/collections/page.tsx`                          |
| 21  | Referrer tracking           | 7     | `src/app/recipe/[id]/page.tsx`                                  |
| 22  | Orphan detection            | 7     | `src/lib/collections/sync-recipes.ts`, recipe mutations         |
