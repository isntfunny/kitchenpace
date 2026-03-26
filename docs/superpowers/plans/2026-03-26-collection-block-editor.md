# Collection Block-Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MDX textarea editor with a Tiptap v3 block-editor that stores content as JSON, with custom recipe block nodes, slash commands, and server-side rendering.

**Architecture:** Tiptap React editor with custom atom nodes for recipe blocks. Content stored as Tiptap JSON in `Collection.blocks` (replaces `mdxContent`). Detail page renders blocks via `@tiptap/static-renderer`. MDX pipeline (`next-mdx-remote`) removed entirely.

**Tech Stack:** Tiptap v3 (3.20.5), `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/suggestion`, `@tiptap/static-renderer`, `@floating-ui/dom`, Panda CSS, `lucide-react`

**Spec:** `docs/superpowers/specs/2026-03-26-collection-block-editor-design.md`

---

## File Structure

### New Files

| File                                                                    | Responsibility                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------- |
| `src/components/collections/editor/CollectionBlockEditor.tsx`           | Main Tiptap editor wrapper                      |
| `src/components/collections/editor/EditorToolbar.tsx`                   | Formatting toolbar                              |
| `src/components/collections/editor/SlashCommandMenu.tsx`                | Slash command floating menu + suggestion config |
| `src/components/collections/editor/nodes/RecipeCardNode.tsx`            | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/RecipeCardWithTextNode.tsx`    | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/RecipeSliderNode.tsx`          | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/FeaturedTrioNode.tsx`          | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/TopListNode.tsx`               | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/RandomPickNode.tsx`            | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/RecipeFlowNode.tsx`            | Extension + React NodeView                      |
| `src/components/collections/editor/nodes/shared/RecipeSearchInline.tsx` | Shared inline recipe search (useMultiSearch)    |
| `src/components/collections/editor/nodes/shared/NodeWrapper.tsx`        | Shared node chrome (label, delete button)       |
| `src/components/collections/editor/nodes/shared/FilterConfigPanel.tsx`  | Shared filter UI (category, tags, sort, limit)  |
| `src/lib/collections/block-renderer.tsx`                                | Server-side Tiptap JSON → React renderer        |
| `src/lib/collections/extract-recipe-ids.ts`                             | Extract recipe IDs from Tiptap JSON             |

### Files to Modify

| File                                                  | Change                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `prisma/schema.prisma`                                | `mdxContent String?` → `blocks Json?`                               |
| `src/lib/collections/types.ts`                        | `mdxContent` → `blocks` in interfaces                               |
| `src/app/actions/collections.ts`                      | Save/load `blocks` instead of `mdxContent`, moderate extracted text |
| `src/lib/collections/sync-recipes.ts`                 | Use `extractRecipeIdsFromBlocks` instead of MDX parser              |
| `src/components/collections/CollectionEditor.tsx`     | Replace textarea+toolbar with `CollectionBlockEditor`               |
| `src/components/collections/useCollectionAutoSave.ts` | `mdxContent` → `blocks`                                             |
| `src/app/collection/[slug]/page.tsx`                  | Use block-renderer instead of MDX compiler                          |
| `src/app/collection/[slug]/templates/*.tsx`           | Accept `blockContent` ReactNode instead of `mdxContent`             |
| `src/app/collection/[slug]/edit/page.tsx`             | Pass `blocks` instead of `mdxContent` to editor                     |

### Files to Delete

| File                                                     | Reason                                                |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `src/lib/collections/mdx.ts`                             | MDX compilation replaced by block-renderer            |
| `src/lib/collections/mdx-components.tsx`                 | MDX components replaced by block-renderer nodeMapping |
| `src/lib/collections/mdx-queries.ts`                     | Renamed to block-queries.ts (content preserved)       |
| `src/components/collections/CollectionEditorToolbar.tsx` | Replaced by editor/EditorToolbar                      |
| `src/components/collections/RecipeSearchModal.tsx`       | Replaced by inline search in NodeViews                |

---

## Phase 1: Schema & Plumbing (mdxContent → blocks)

### Task 1: Install Tiptap and update schema

**Files:**

- Modify: `package.json`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install Tiptap packages**

```bash
cd /root/projects/kitchenpace && npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extensions @tiptap/suggestion @tiptap/static-renderer @floating-ui/dom
```

- [ ] **Step 2: Uninstall next-mdx-remote**

```bash
npm uninstall next-mdx-remote
```

- [ ] **Step 3: Update Prisma schema — replace mdxContent with blocks**

In `prisma/schema.prisma`, in the Collection model, replace:

```prisma
  mdxContent       String?
```

with:

```prisma
  blocks           Json?
```

- [ ] **Step 4: Create and apply migration**

```bash
npx prisma migrate dev --name collection_blocks_json
```

### Task 2: Update types and server actions

**Files:**

- Modify: `src/lib/collections/types.ts`
- Modify: `src/app/actions/collections.ts`

- [ ] **Step 1: Update types — replace mdxContent with blocks**

In `src/lib/collections/types.ts`:

Replace `MdxRecipeComponentProps` interface with:

```typescript
/** Tiptap JSON document type */
export type TiptapJSON = {
    type: string;
    content?: TiptapJSON[];
    attrs?: Record<string, unknown>;
    text?: string;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};
```

In `CollectionDetail`, replace:

```typescript
mdxContent: string | null;
```

with:

```typescript
blocks: TiptapJSON | null;
```

In `CollectionMutationInput`, replace:

```typescript
    mdxContent?: string;
```

with:

```typescript
    blocks?: unknown; // Tiptap JSON
```

Remove the `MdxRecipeComponentProps` interface entirely.

- [ ] **Step 2: Create extract-recipe-ids utility**

Create `src/lib/collections/extract-recipe-ids.ts`:

```typescript
import type { TiptapJSON } from './types';

const RECIPE_NODE_TYPES = new Set([
    'recipeCard',
    'recipeCardWithText',
    'recipeSlider',
    'featuredTrio',
    'topList',
    'randomPick',
    'recipeFlow',
]);

/**
 * Extracts all explicit recipe IDs from a Tiptap JSON document.
 * Walks the document tree and collects recipeId/recipeIds from custom nodes.
 */
export function extractRecipeIdsFromBlocks(doc: TiptapJSON | null | undefined): string[] {
    if (!doc) return [];
    const ids = new Set<string>();

    function walk(node: TiptapJSON) {
        if (RECIPE_NODE_TYPES.has(node.type)) {
            const attrs = node.attrs ?? {};
            if (typeof attrs.recipeId === 'string' && attrs.recipeId) {
                ids.add(attrs.recipeId);
            }
            if (Array.isArray(attrs.recipeIds)) {
                for (const id of attrs.recipeIds) {
                    if (typeof id === 'string' && id) ids.add(id);
                }
            }
        }
        if (node.content) {
            for (const child of node.content) walk(child);
        }
    }

    walk(doc);
    return Array.from(ids);
}

/**
 * Extracts plain text from a Tiptap JSON document for moderation.
 */
export function extractTextFromBlocks(doc: TiptapJSON | null | undefined): string {
    if (!doc) return '';
    const parts: string[] = [];

    function walk(node: TiptapJSON) {
        if (node.text) parts.push(node.text);
        if (node.content) {
            for (const child of node.content) walk(child);
        }
    }

    walk(doc);
    return parts.join(' ');
}
```

- [ ] **Step 3: Update sync-recipes to use new extractor**

In `src/lib/collections/sync-recipes.ts`, replace:

```typescript
import { extractRecipeIdsFromMdx } from './mdx';
```

with:

```typescript
import { extractRecipeIdsFromBlocks } from './extract-recipe-ids';
import type { TiptapJSON } from './types';
```

Change the `syncCollectionRecipes` function signature from:

```typescript
export async function syncCollectionRecipes(
    collectionId: string,
    mdxContent: string | null | undefined,
): Promise<void> {
    if (!mdxContent) {
```

to:

```typescript
export async function syncCollectionRecipes(
    collectionId: string,
    blocks: TiptapJSON | null | undefined,
): Promise<void> {
    if (!blocks) {
```

Replace:

```typescript
const rawIds = extractRecipeIdsFromMdx(mdxContent).slice(0, MAX_COLLECTION_RECIPES);
```

with:

```typescript
const rawIds = extractRecipeIdsFromBlocks(blocks).slice(0, MAX_COLLECTION_RECIPES);
```

Remove the `inferRole` function. Replace the role mapping in the entries builder with a simple function that maps node types from the JSON:

```typescript
function inferRoleFromBlocks(blocks: TiptapJSON, recipeId: string): CollectionRecipeRole {
    let role: CollectionRecipeRole = 'INLINE';
    function walk(node: TiptapJSON) {
        const id = node.attrs?.recipeId;
        const ids = node.attrs?.recipeIds as string[] | undefined;
        const hasId = id === recipeId || ids?.includes(recipeId);
        if (hasId) {
            if (node.type === 'featuredTrio') role = 'HERO';
            else if (node.type === 'topList') role = 'SIDEBAR';
            else if (node.type === 'recipeSlider') role = 'GRID';
            else role = 'INLINE';
        }
        if (node.content) for (const child of node.content) walk(child);
    }
    walk(blocks);
    return role;
}
```

Update the entries builder to use `inferRoleFromBlocks(blocks, recipeId)` instead of `inferRole(mdxContent, recipeId)`.

- [ ] **Step 4: Update server actions — blocks instead of mdxContent**

In `src/app/actions/collections.ts`:

Add import:

```typescript
import { extractTextFromBlocks } from '@app/lib/collections/extract-recipe-ids';
import type { TiptapJSON } from '@app/lib/collections/types';
```

In `createCollection` and `updateCollection`, change moderation text extraction from:

```typescript
const textToModerate = [data.title, data.description, data.mdxContent].filter(Boolean).join('\n\n');
```

to:

```typescript
const blockText = extractTextFromBlocks(data.blocks as TiptapJSON | null);
const textToModerate = [data.title, data.description, blockText].filter(Boolean).join('\n\n');
```

Change all `mdxContent` references in prisma create/update data to `blocks`:

```typescript
    // was: mdxContent: data.mdxContent ?? null,
    blocks: data.blocks ?? null,
```

Change `syncCollectionRecipes` calls:

```typescript
// was: await syncCollectionRecipes(collection.id, data.mdxContent)
await syncCollectionRecipes(collection.id, data.blocks as TiptapJSON | null);
```

Change moderation snapshot:

```typescript
    // was: text: data.mdxContent,
    text: blockText,
```

In `fetchCollectionBySlug`, change:

```typescript
    // was: mdxContent: collection.mdxContent,
    blocks: collection.blocks as TiptapJSON | null,
```

- [ ] **Step 5: Update auto-save hook**

In `src/components/collections/useCollectionAutoSave.ts`:

Change `AutoSaveDeps` interface: replace `mdxContent: string` with `blocks: unknown`.

Change `buildPayload`: replace `mdxContent: mdxContent || undefined` with `blocks: blocks || undefined`.

Change the `useEffect` dependency array: replace `mdxContent` with `blocks`.

- [ ] **Step 6: Delete MDX files**

```bash
rm src/lib/collections/mdx.ts src/lib/collections/mdx-components.tsx
```

Rename `mdx-queries.ts` to `block-queries.ts`:

```bash
mv src/lib/collections/mdx-queries.ts src/lib/collections/block-queries.ts
```

Update any imports of `mdx-queries` to `block-queries` (check `src/lib/collections/mdx-components.tsx` was the only importer — it's deleted now, so no import updates needed).

---

## Phase 2: Tiptap Editor Core

### Task 3: Create shared node utilities

**Files:**

- Create: `src/components/collections/editor/nodes/shared/NodeWrapper.tsx`
- Create: `src/components/collections/editor/nodes/shared/RecipeSearchInline.tsx`

- [ ] **Step 1: Create NodeWrapper — shared chrome for all custom nodes**

```tsx
'use client';

import { css } from 'styled-system/css';
import { GripVertical, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NodeWrapperProps {
    icon: LucideIcon;
    label: string;
    selected?: boolean;
    onDelete: () => void;
    children: React.ReactNode;
}

export function NodeWrapper({ icon: Icon, label, selected, onDelete, children }: NodeWrapperProps) {
    return (
        <div
            className={css({
                my: '3',
                borderRadius: 'xl',
                border: '2px solid',
                borderColor: selected ? 'accent' : 'border',
                bg: 'surface.elevated',
                overflow: 'hidden',
                transition: 'border-color 150ms ease',
                _hover: { borderColor: selected ? 'accent' : 'border.muted' },
            })}
            data-drag-handle
        >
            {/* Header bar */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '3',
                    py: '2',
                    bg: 'surface.muted',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    cursor: 'grab',
                })}
            >
                <GripVertical
                    size={14}
                    className={css({ color: 'foreground.muted', flexShrink: 0 })}
                />
                <Icon size={14} className={css({ color: 'accent', flexShrink: 0 })} />
                <span
                    className={css({ fontSize: 'xs', fontWeight: '600', color: 'text', flex: 1 })}
                >
                    {label}
                </span>
                <button
                    type="button"
                    onClick={onDelete}
                    className={css({
                        p: '1',
                        borderRadius: 'md',
                        cursor: 'pointer',
                        color: 'foreground.muted',
                        _hover: { color: 'red.500', bg: 'surface.muted' },
                    })}
                >
                    <X size={14} />
                </button>
            </div>
            {/* Content */}
            <div className={css({ p: '3' })}>{children}</div>
        </div>
    );
}
```

- [ ] **Step 2: Create RecipeSearchInline — inline recipe search for NodeViews**

```tsx
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { SmartImage } from '@app/components/atoms/SmartImage';
import type { MultiSearchRecipe } from '@app/lib/hooks/useMultiSearch';
import { useMultiSearch } from '@app/lib/hooks/useMultiSearch';
import { css } from 'styled-system/css';

interface RecipeSearchInlineProps {
    onSelect: (recipe: MultiSearchRecipe) => void;
    placeholder?: string;
}

export function RecipeSearchInline({
    onSelect,
    placeholder = 'Rezept suchen…',
}: RecipeSearchInlineProps) {
    const [query, setQuery] = useState('');
    const trimmed = query.trim();
    const { recipes, loading } = useMultiSearch(trimmed, {
        enabled: trimmed.length >= 2,
        types: 'recipes',
    });

    return (
        <div className={css({ position: 'relative' })}>
            <div className={css({ position: 'relative' })}>
                <span
                    className={css({
                        position: 'absolute',
                        left: '3',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'foreground.muted',
                    })}
                >
                    <Search size={14} />
                </span>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={css({
                        w: '100%',
                        height: '36px',
                        pl: '9',
                        pr: '3',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'lg',
                        bg: 'background',
                        fontSize: 'sm',
                        outline: 'none',
                        _focus: { borderColor: 'accent' },
                    })}
                />
            </div>
            {trimmed.length >= 2 && (
                <div
                    className={css({
                        mt: '1',
                        maxH: '200px',
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'lg',
                        bg: 'surface.elevated',
                        boxShadow: 'sm',
                    })}
                >
                    {loading && (
                        <p className={css({ p: '3', fontSize: 'xs', color: 'foreground.muted' })}>
                            Suche…
                        </p>
                    )}
                    {!loading && recipes.length === 0 && (
                        <p className={css({ p: '3', fontSize: 'xs', color: 'foreground.muted' })}>
                            Keine Rezepte gefunden
                        </p>
                    )}
                    {recipes.map((recipe) => (
                        <button
                            key={recipe.id}
                            type="button"
                            onClick={() => {
                                onSelect(recipe);
                                setQuery('');
                            }}
                            className={css({
                                w: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                p: '2',
                                textAlign: 'left',
                                cursor: 'pointer',
                                _hover: { bg: 'accent.soft' },
                            })}
                        >
                            <div
                                className={css({
                                    w: '32px',
                                    h: '32px',
                                    borderRadius: 'md',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    bg: 'surface.muted',
                                })}
                            >
                                <SmartImage
                                    imageKey={recipe.imageKey}
                                    alt={recipe.title}
                                    aspect="1:1"
                                    sizes="32px"
                                />
                            </div>
                            <div className={css({ minW: 0, flex: 1 })}>
                                <div
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'text',
                                        truncate: true,
                                    })}
                                >
                                    {recipe.title}
                                </div>
                                <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                    {recipe.category}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
```

### Task 4: Create RecipeCard node (simplest custom node — pattern for all others)

**Files:**

- Create: `src/components/collections/editor/nodes/RecipeCardNode.tsx`

- [ ] **Step 1: Write RecipeCard Tiptap extension + NodeView**

```tsx
'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { CookingPot } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { NodeWrapper } from './shared/NodeWrapper';
import { RecipeSearchInline } from './shared/RecipeSearchInline';
import { css } from 'styled-system/css';

// ── Extension ───────────────────────────────────────────────────────────────

export const RecipeCardExtension = Node.create({
    name: 'recipeCard',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            recipeId: { default: null },
            recipeTitle: { default: null },
            recipeImageKey: { default: null },
            recipeCategory: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-recipe-card]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-recipe-card': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(RecipeCardView);
    },
});

// ── NodeView Component ──────────────────────────────────────────────────────

function RecipeCardView(props: any) {
    const { node, updateAttributes, deleteNode, selected } = props;
    const { recipeId, recipeTitle, recipeImageKey, recipeCategory } = node.attrs;

    if (!recipeId) {
        return (
            <NodeViewWrapper>
                <NodeWrapper
                    icon={CookingPot}
                    label="Rezeptkarte"
                    selected={selected}
                    onDelete={deleteNode}
                >
                    <RecipeSearchInline
                        onSelect={(recipe) => {
                            updateAttributes({
                                recipeId: recipe.id,
                                recipeTitle: recipe.title,
                                recipeImageKey: recipe.imageKey,
                                recipeCategory: recipe.category,
                            });
                        }}
                    />
                </NodeWrapper>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <NodeWrapper
                icon={CookingPot}
                label="Rezeptkarte"
                selected={selected}
                onDelete={deleteNode}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                    <div
                        className={css({
                            w: '48px',
                            h: '48px',
                            borderRadius: 'lg',
                            overflow: 'hidden',
                            flexShrink: 0,
                            bg: 'surface.muted',
                        })}
                    >
                        <SmartImage
                            imageKey={recipeImageKey}
                            alt={recipeTitle ?? ''}
                            aspect="1:1"
                            sizes="48px"
                        />
                    </div>
                    <div className={css({ flex: 1, minW: 0 })}>
                        <div
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text',
                                truncate: true,
                            })}
                        >
                            {recipeTitle ?? 'Rezept lädt…'}
                        </div>
                        {recipeCategory && (
                            <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                {recipeCategory}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            updateAttributes({
                                recipeId: null,
                                recipeTitle: null,
                                recipeImageKey: null,
                                recipeCategory: null,
                            })
                        }
                        className={css({
                            fontSize: 'xs',
                            color: 'accent',
                            cursor: 'pointer',
                            _hover: { textDecoration: 'underline' },
                        })}
                    >
                        Ändern
                    </button>
                </div>
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
```

### Task 5: Create remaining recipe nodes

**Files:**

- Create: `src/components/collections/editor/nodes/RecipeCardWithTextNode.tsx`
- Create: `src/components/collections/editor/nodes/RecipeSliderNode.tsx`
- Create: `src/components/collections/editor/nodes/FeaturedTrioNode.tsx`
- Create: `src/components/collections/editor/nodes/TopListNode.tsx`
- Create: `src/components/collections/editor/nodes/RandomPickNode.tsx`
- Create: `src/components/collections/editor/nodes/RecipeFlowNode.tsx`

- [ ] **Step 1: Create RecipeCardWithTextNode**

Same pattern as RecipeCardNode but with an additional `text` attribute and a side-by-side layout: text input on the left, recipe card on the right. Uses `LayoutList` icon. The text field is a plain `<textarea>` for markdown content stored in `node.attrs.text`.

- [ ] **Step 2: Create RecipeSliderNode**

Uses `BookOpen` icon, label "Rezept-Slider". Supports either `recipeIds: string[]` (multi-select via RecipeSearchInline called repeatedly, shown as chips) or filter props (`category`, `tags`, `sort`, `limit`). Toggle between "Explizite Rezepte" and "Filter" modes. Shows selected recipe titles as removable chips.

- [ ] **Step 3: Create FeaturedTrioNode**

Same pattern as RecipeSliderNode but with `Star` icon, label "Featured Trio", default limit 3. Shows 3 recipe slots.

- [ ] **Step 4: Create TopListNode**

Same pattern as RecipeSliderNode but with `ListOrdered` icon, label "Top-Liste", default limit 5.

- [ ] **Step 5: Create RandomPickNode**

Uses `Shuffle` icon, label "Zufalls-Pick". Only filter props (category, tags), no explicit recipe IDs. Shows a preview text "Zeigt ein zufälliges Rezept".

- [ ] **Step 6: Create RecipeFlowNode**

Same pattern as RecipeCardNode but with `GitBranch` icon, label "Rezept-Flow". Single recipe select. Shows "Flow-Ansicht von [Rezeptname]" when selected.

### Task 6: Create slash command menu

**Files:**

- Create: `src/components/collections/editor/SlashCommandMenu.tsx`

- [ ] **Step 1: Write slash command extension using @tiptap/suggestion**

Creates a Tiptap extension that triggers on `/` character. Shows a floating menu with all available block types. Filters as user types. On selection, inserts the corresponding node and deletes the `/query` text.

Command items:

```typescript
const SLASH_ITEMS = [
    {
        title: 'Rezeptkarte',
        icon: CookingPot,
        command: (editor) => editor.chain().focus().insertContent({ type: 'recipeCard' }).run(),
    },
    {
        title: 'Rezeptkarte mit Text',
        icon: LayoutList,
        command: (editor) =>
            editor.chain().focus().insertContent({ type: 'recipeCardWithText' }).run(),
    },
    {
        title: 'Rezept-Slider',
        icon: BookOpen,
        command: (editor) => editor.chain().focus().insertContent({ type: 'recipeSlider' }).run(),
    },
    {
        title: 'Featured Trio',
        icon: Star,
        command: (editor) => editor.chain().focus().insertContent({ type: 'featuredTrio' }).run(),
    },
    {
        title: 'Top-Liste',
        icon: ListOrdered,
        command: (editor) => editor.chain().focus().insertContent({ type: 'topList' }).run(),
    },
    {
        title: 'Zufalls-Pick',
        icon: Shuffle,
        command: (editor) => editor.chain().focus().insertContent({ type: 'randomPick' }).run(),
    },
    {
        title: 'Rezept-Flow',
        icon: GitBranch,
        command: (editor) => editor.chain().focus().insertContent({ type: 'recipeFlow' }).run(),
    },
    {
        title: 'Überschrift 1',
        icon: Heading1,
        command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
        title: 'Überschrift 2',
        icon: Heading2,
        command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
        title: 'Aufzählung',
        icon: List,
        command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
        title: 'Nummerierung',
        icon: ListOrdered,
        command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
        title: 'Zitat',
        icon: Quote,
        command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
        title: 'Trennlinie',
        icon: Minus,
        command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
];
```

The floating menu is a React component rendered via a portal. Position tracked via `@floating-ui/dom` or the suggestion plugin's `clientRect`.

### Task 7: Create editor toolbar

**Files:**

- Create: `src/components/collections/editor/EditorToolbar.tsx`

- [ ] **Step 1: Write formatting toolbar**

```tsx
'use client';

import type { Editor } from '@tiptap/react';
import { css } from 'styled-system/css';
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    Link,
    List,
    ListOrdered,
    Quote,
    Plus,
} from 'lucide-react';

interface EditorToolbarProps {
    editor: Editor | null;
    onInsertBlock: () => void; // opens slash menu
}

export function EditorToolbar({ editor, onInsertBlock }: EditorToolbarProps) {
    if (!editor) return null;

    const btnClass = (active: boolean) =>
        css({
            p: '1.5',
            borderRadius: 'md',
            cursor: 'pointer',
            bg: active ? 'accent.soft' : 'transparent',
            color: active ? 'accent' : 'foreground.muted',
            _hover: { bg: 'surface.muted' },
        });

    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1',
                px: '3',
                py: '2',
                borderBottom: '1px solid',
                borderColor: 'border',
                bg: 'surface.muted',
                flexWrap: 'wrap',
            })}
        >
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={btnClass(editor.isActive('bold'))}
            >
                <Bold size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={btnClass(editor.isActive('italic'))}
            >
                <Italic size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={btnClass(editor.isActive('heading', { level: 1 }))}
            >
                <Heading1 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={btnClass(editor.isActive('heading', { level: 2 }))}
            >
                <Heading2 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={btnClass(editor.isActive('bulletList'))}
            >
                <List size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={btnClass(editor.isActive('orderedList'))}
            >
                <ListOrdered size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={btnClass(editor.isActive('blockquote'))}
            >
                <Quote size={16} />
            </button>
            <button
                type="button"
                onClick={() => {
                    const url = window.prompt('URL:');
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                className={btnClass(editor.isActive('link'))}
            >
                <Link size={16} />
            </button>

            <div
                className={css({
                    borderLeft: '1px solid',
                    borderColor: 'border',
                    h: '20px',
                    mx: '1',
                })}
            />

            <button
                type="button"
                onClick={onInsertBlock}
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1',
                    px: '2',
                    py: '1',
                    borderRadius: 'md',
                    fontSize: 'xs',
                    fontWeight: '600',
                    bg: 'primary',
                    color: 'white',
                    cursor: 'pointer',
                    _hover: { bg: 'accent.hover' },
                })}
            >
                <Plus size={14} /> Block einfügen
            </button>
        </div>
    );
}
```

### Task 8: Create main CollectionBlockEditor

**Files:**

- Create: `src/components/collections/editor/CollectionBlockEditor.tsx`

- [ ] **Step 1: Write main editor component**

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { css } from 'styled-system/css';
import { EditorToolbar } from './EditorToolbar';
import { RecipeCardExtension } from './nodes/RecipeCardNode';
import { RecipeCardWithTextExtension } from './nodes/RecipeCardWithTextNode';
import { RecipeSliderExtension } from './nodes/RecipeSliderNode';
import { FeaturedTrioExtension } from './nodes/FeaturedTrioNode';
import { TopListExtension } from './nodes/TopListNode';
import { RandomPickExtension } from './nodes/RandomPickNode';
import { RecipeFlowExtension } from './nodes/RecipeFlowNode';
import { SlashCommandsExtension } from './SlashCommandMenu';

interface CollectionBlockEditorProps {
    initialContent?: any; // Tiptap JSON
    onUpdate: (json: any) => void;
}

export function CollectionBlockEditor({ initialContent, onUpdate }: CollectionBlockEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Link.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder: 'Tippe / um einen Block einzufügen…' }),
            RecipeCardExtension,
            RecipeCardWithTextExtension,
            RecipeSliderExtension,
            FeaturedTrioExtension,
            TopListExtension,
            RandomPickExtension,
            RecipeFlowExtension,
            SlashCommandsExtension,
        ],
        content: initialContent ?? undefined,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getJSON());
        },
        editorProps: {
            attributes: {
                class: css({
                    outline: 'none',
                    minH: '300px',
                    px: '4',
                    py: '3',
                    fontSize: 'base',
                    lineHeight: '1.8',
                    color: 'text',
                    '& h1': { fontSize: '2xl', fontWeight: 'bold', mt: '6', mb: '2' },
                    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '5', mb: '2' },
                    '& h3': { fontSize: 'lg', fontWeight: 'bold', mt: '4', mb: '2' },
                    '& p': { mb: '3' },
                    '& ul, & ol': { pl: '6', mb: '3' },
                    '& blockquote': {
                        borderLeft: '3px solid',
                        borderColor: 'accent',
                        pl: '4',
                        color: 'foreground.muted',
                        fontStyle: 'italic',
                        my: '4',
                    },
                    '& a': { color: 'accent', textDecoration: 'underline' },
                    '& hr': { borderColor: 'border', my: '6' },
                    '& .is-empty::before': {
                        content: 'attr(data-placeholder)',
                        color: 'foreground.muted',
                        float: 'left',
                        pointerEvents: 'none',
                        h: 0,
                    },
                }),
            },
        },
    });

    const handleInsertBlock = () => {
        if (!editor) return;
        // Focus editor and type "/" to trigger slash commands
        editor.chain().focus().insertContent('/').run();
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', flex: 1, minH: 0 })}>
            <EditorToolbar editor={editor} onInsertBlock={handleInsertBlock} />
            <div className={css({ flex: 1, overflow: 'auto' })}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
```

---

## Phase 3: Wire Editor Into Collection Pages

### Task 9: Update CollectionEditor to use block editor

**Files:**

- Modify: `src/components/collections/CollectionEditor.tsx`

- [ ] **Step 1: Replace textarea/split-view with CollectionBlockEditor**

Remove: textarea, CollectionPreview, CollectionEditorToolbar import, RecipeSearchModal import, all MDX-related state and callbacks (insertAtCursor, handleRecipeSelect, handleFormatting, textareaRef, searchModalOpen, searchMode).

Add: `CollectionBlockEditor` import, `blocks` state (`useState<unknown>(initialData?.blocks ?? null)`).

Pass `blocks` to auto-save hook instead of `mdxContent`. Pass `onUpdate` callback to `CollectionBlockEditor` that sets `blocks` state.

Replace the split-view section with:

```tsx
<CollectionBlockEditor initialContent={initialData?.blocks} onUpdate={setBlocks} />
```

Keep: title input, description input, publish/update buttons, auto-save status.

Remove: template selector from toolbar (template is now selected elsewhere or defaults to INLINE).

- [ ] **Step 2: Update edit page to pass blocks**

In `src/app/collection/[slug]/edit/page.tsx`, change `mdxContent: collection.mdxContent` to `blocks: collection.blocks`.

### Task 10: Create server-side block renderer

**Files:**

- Create: `src/lib/collections/block-renderer.tsx`

- [ ] **Step 1: Write block renderer using @tiptap/static-renderer**

```tsx
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import type { TiptapJSON } from './types';
import { resolveRecipeFilter } from './block-queries';
import type { RecipeCardData } from '@app/lib/recipe-card';

// Recipe components (existing)
import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import { FeaturedTrio } from '@app/app/category/[slug]/components/FeaturedTrio';
import { TopRankedList } from '@app/app/category/[slug]/components/sidebar/TopRankedList';
import { RecipeCard } from '@app/components/features/RecipeCard';

/**
 * Renders a Tiptap JSON document to React elements for the collection detail page.
 * Text nodes are rendered as HTML, custom nodes are rendered as their corresponding components.
 */
export async function renderCollectionBlocks(
    doc: TiptapJSON,
    viewerUserId?: string | null,
): Promise<React.ReactNode[]> {
    if (!doc.content) return [];

    const elements: React.ReactNode[] = [];

    for (let i = 0; i < doc.content.length; i++) {
        const node = doc.content[i];
        const key = `block-${i}`;

        switch (node.type) {
            case 'recipeCard': {
                const recipeId = node.attrs?.recipeId as string;
                if (!recipeId) break;
                const recipes = await resolveRecipeFilter({ ids: [recipeId] }, viewerUserId);
                if (recipes.length > 0) {
                    elements.push(
                        <div key={key} style={{ maxWidth: 400, margin: '1.5rem 0' }}>
                            <RecipeCard
                                recipe={recipes[0]}
                                variant="default"
                                categoryOnImage
                                starRating
                            />
                        </div>,
                    );
                }
                break;
            }

            case 'recipeSlider': {
                const attrs = node.attrs ?? {};
                const recipes = await resolveRecipeFilter(
                    {
                        ids: attrs.recipeIds as string[] | undefined,
                        category: attrs.category as string | undefined,
                        tags: attrs.tags as string[] | undefined,
                        sort: attrs.sort as any,
                        limit: (attrs.limit as number) ?? 8,
                    },
                    viewerUserId,
                );
                if (recipes.length > 0) {
                    elements.push(<HorizontalRecipeScroll key={key} recipes={recipes} />);
                }
                break;
            }

            case 'featuredTrio': {
                const attrs = node.attrs ?? {};
                const recipes = await resolveRecipeFilter(
                    {
                        ids: attrs.recipeIds as string[] | undefined,
                        sort: attrs.sort as any,
                        limit: (attrs.limit as number) ?? 3,
                    },
                    viewerUserId,
                );
                if (recipes.length > 0) {
                    elements.push(
                        <FeaturedTrio key={key} recipes={recipes} categoryColor="#f97316" />,
                    );
                }
                break;
            }

            case 'topList': {
                const attrs = node.attrs ?? {};
                const recipes = await resolveRecipeFilter(
                    {
                        ids: attrs.recipeIds as string[] | undefined,
                        sort: attrs.sort as any,
                        limit: (attrs.limit as number) ?? 5,
                    },
                    viewerUserId,
                );
                if (recipes.length > 0) {
                    elements.push(<TopRankedList key={key} recipes={recipes} />);
                }
                break;
            }

            case 'recipeFlow': {
                // Lazy import RecipeStepsViewer since it's heavy
                const recipeId = node.attrs?.recipeId as string;
                if (!recipeId) break;
                // Fetch recipe flow data and render viewer
                // This will be a client component boundary
                elements.push(
                    <div key={key} style={{ margin: '1.5rem 0' }}>
                        <RecipeFlowBlock recipeId={recipeId} />
                    </div>,
                );
                break;
            }

            // Text nodes (paragraph, heading, list, blockquote, etc.)
            default: {
                // Use Tiptap's generateHTML for text content
                const html = generateHTML({ type: 'doc', content: [node] }, [StarterKit]);
                elements.push(<div key={key} dangerouslySetInnerHTML={{ __html: html }} />);
                break;
            }
        }
    }

    return elements;
}

// Placeholder for RecipeFlow — needs client component for interactivity
function RecipeFlowBlock({ recipeId }: { recipeId: string }) {
    return (
        <div
            style={{
                padding: '1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#6b7280',
            }}
        >
            Rezept-Flow wird hier angezeigt (Rezept: {recipeId})
        </div>
    );
}
```

### Task 11: Update detail page to use block renderer

**Files:**

- Modify: `src/app/collection/[slug]/page.tsx`

- [ ] **Step 1: Replace MDX compilation with block rendering**

Remove imports: `compileCollectionMdx`, `createMdxComponents`.
Add import: `renderCollectionBlocks` from `@app/lib/collections/block-renderer`.

Replace the MDX compilation section:

```typescript
// was: let mdxContent = null; if (collection.mdxContent) { ... }
let blockContent: React.ReactNode[] = [];
if (collection.blocks) {
    blockContent = await renderCollectionBlocks(collection.blocks, viewerId);
}
```

Update template layout calls to pass `blockContent` wrapped in a fragment:

```tsx
const renderedBlocks = <>{blockContent}</>;
// then pass renderedBlocks where mdxContent was passed
```

- [ ] **Step 2: Update template layouts to accept ReactNode children**

The template layouts already accept `mdxContent: ReactNode` — just rename the prop to `blockContent` for clarity, or keep `mdxContent` as the prop name since it's typed as `ReactNode` anyway. Minimal change — keep the prop name.

### Task 12: Delete old files and clean up

- [ ] **Step 1: Delete obsolete files**

```bash
rm src/lib/collections/mdx.ts
rm src/lib/collections/mdx-components.tsx
rm src/components/collections/CollectionEditorToolbar.tsx
rm src/components/collections/RecipeSearchModal.tsx
mv src/lib/collections/mdx-queries.ts src/lib/collections/block-queries.ts
```

- [ ] **Step 2: Update imports referencing deleted/renamed files**

Grep for any remaining references to the deleted files and update them. The block-renderer imports `block-queries.ts` (was `mdx-queries.ts`).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

---

## Summary

| #   | Task                           | Phase | Key Files                                 |
| --- | ------------------------------ | ----- | ----------------------------------------- |
| 1   | Install Tiptap + update schema | 1     | package.json, schema.prisma               |
| 2   | Update types + server actions  | 1     | types.ts, collections.ts, sync-recipes.ts |
| 3   | Shared node utilities          | 2     | NodeWrapper.tsx, RecipeSearchInline.tsx   |
| 4   | RecipeCard node                | 2     | RecipeCardNode.tsx                        |
| 5   | Remaining recipe nodes (6)     | 2     | \*Node.tsx files                          |
| 6   | Slash command menu             | 2     | SlashCommandMenu.tsx                      |
| 7   | Editor toolbar                 | 2     | EditorToolbar.tsx                         |
| 8   | Main block editor              | 2     | CollectionBlockEditor.tsx                 |
| 9   | Wire editor into pages         | 3     | CollectionEditor.tsx, edit/page.tsx       |
| 10  | Server-side block renderer     | 3     | block-renderer.tsx                        |
| 11  | Update detail page             | 3     | page.tsx                                  |
| 12  | Delete old files + cleanup     | 3     | rm mdx files                              |
