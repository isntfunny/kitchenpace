# Collection Block-Editor — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Replaces:** MDX textarea editor + `next-mdx-remote` pipeline

---

## Summary

Replace the plain MDX textarea in the Collection Editor with a **Tiptap v3 block-editor**. Users get WYSIWYG rich-text editing with custom recipe blocks that are inserted via slash commands and configured through inline UI. Content is stored as **Tiptap JSON** (not MDX), eliminating the MDX compilation pipeline entirely.

---

## Architecture

### Storage: JSON instead of MDX

```prisma
model Collection {
    // mdxContent String?   -- REMOVED
    blocks     Json?        // Tiptap JSON document
}
```

The Tiptap JSON document is the single source of truth. No MDX generation, no MDX parsing, no `next-mdx-remote`.

### Editor (Client)

Tiptap React editor with:

- Built-in rich-text (headings, bold, italic, links, lists, blockquote)
- Custom atom nodes for each recipe block type
- Slash commands via `@tiptap/suggestion` for block insertion
- `useMultiSearch` for recipe search within slash commands and block config UI

### Renderer (Server — Detail Page)

`@tiptap/static-renderer` converts the JSON to React elements server-side (RSC-compatible). Custom nodes map to the existing shared components (`FeaturedTrio`, `HorizontalRecipeScroll`, etc.). No editor instance needed on the read path.

---

## Packages

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extensions @tiptap/suggestion @tiptap/static-renderer @floating-ui/dom react-markdown
```

All `@tiptap/*` packages pinned to `3.20.5`.

`react-markdown` for rendering markdown content within text nodes on the detail page (fallback if static-renderer text output needs enhancement).

### Packages to Remove

```bash
npm uninstall next-mdx-remote
```

---

## Block Types (Custom Tiptap Nodes)

| Node Name            | Group | Atom | Attributes                           | Editor Preview                  | Detail Rendering         |
| -------------------- | ----- | ---- | ------------------------------------ | ------------------------------- | ------------------------ |
| `recipeCard`         | block | yes  | `recipeId: string`                   | Card with thumbnail + title     | `RecipeCard` component   |
| `recipeCardWithText` | block | yes  | `recipeId: string`, `text: string`   | Two-column: text area + card    | Two-column layout        |
| `recipeSlider`       | block | yes  | `recipeIds?: string[]`, filter props | Horizontal preview strip        | `HorizontalRecipeScroll` |
| `featuredTrio`       | block | yes  | `recipeIds?: string[]`, filter props | 3-card grid preview             | `FeaturedTrio`           |
| `topList`            | block | yes  | `recipeIds?: string[]`, filter props | Numbered list preview           | `TopRankedList`          |
| `randomPick`         | block | yes  | filter props                         | "Zufallsrezept" placeholder     | `RandomRecipeSpotlight`  |
| `recipeFlow`         | block | yes  | `recipeId: string`                   | Flow info card with recipe name | `RecipeStepsViewer`      |

### Shared Filter Props (on recipeSlider, featuredTrio, topList, randomPick)

```typescript
{
    recipeIds?: string[];    // Explicit IDs (overrides filters)
    byUser?: string;         // User slug
    tags?: string[];         // Tag slugs
    category?: string;       // Category slug
    sort?: 'rating' | 'newest' | 'popular';
    limit?: number;
}
```

### Built-in Nodes (from StarterKit)

Paragraph, Heading (1-3), Bold, Italic, Link, BulletList, OrderedList, Blockquote, HorizontalRule, HardBreak.

---

## Slash Commands

User types `/` in an empty paragraph → floating menu appears with:

| Command              | Inserts                                         | Icon        |
| -------------------- | ----------------------------------------------- | ----------- |
| Rezeptkarte          | `recipeCard` node → opens recipe search         | CookingPot  |
| Rezeptkarte mit Text | `recipeCardWithText` node → opens recipe search | LayoutList  |
| Rezept-Slider        | `recipeSlider` node → opens config              | BookOpen    |
| Featured Trio        | `featuredTrio` node → opens config              | Star        |
| Top-Liste            | `topList` node → opens config                   | ListOrdered |
| Zufalls-Pick         | `randomPick` node                               | Shuffle     |
| Rezept-Flow          | `recipeFlow` node → opens recipe search         | GitBranch   |
| Überschrift 1        | Heading level 1                                 | Heading1    |
| Überschrift 2        | Heading level 2                                 | Heading2    |
| Aufzählung           | Bullet list                                     | List        |
| Nummerierung         | Ordered list                                    | ListOrdered |
| Zitat                | Blockquote                                      | Quote       |
| Trennlinie           | Horizontal rule                                 | Minus       |

The slash command menu filters as the user types (e.g., `/rez` shows "Rezeptkarte", "Rezept-Slider", "Rezept-Flow").

### Recipe Search in Slash Commands

When a recipe-requiring command is selected, the floating menu transforms into a recipe search (powered by `useMultiSearch`). User types, sees results with thumbnails, selects one (or multiple for slider/trio/toplist). The node is inserted with the selected recipe IDs.

---

## Node Editor UI (NodeView Components)

Each custom node renders as a React component inside the editor via `ReactNodeViewRenderer`. These are wrapped in `NodeViewWrapper` and show:

### recipeCard

- Recipe thumbnail + title + category + rating
- "Ändern" button to swap recipe (opens search)
- "Entfernen" button (deletes node)
- Data fetched via a lightweight server action on mount

### recipeCardWithText

- Left side: contenteditable text area (plain text, stored in node attrs)
- Right side: recipe card (same as recipeCard)
- Responsive: stacks on mobile

### recipeSlider / featuredTrio / topList

- Shows selected recipes as small chips/thumbnails
- "Rezepte bearbeiten" button → opens modal with recipe search (multi-select)
- OR: filter config UI (toggle between "Explizite Rezepte" and "Filter")
- Filter UI: dropdowns for category, tags, sort, limit

### randomPick

- Shows filter config (category, tags)
- Preview text: "Zeigt ein zufälliges Rezept aus [Kategorie]"

### recipeFlow

- Shows recipe name + "Flow-Ansicht" label
- "Ändern" button to swap recipe

---

## Toolbar

Fixed toolbar above the editor (replaces the current `CollectionEditorToolbar`):

**Formatting:** Bold | Italic | Heading 1 | Heading 2 | Link | Bullet List | Ordered List | Blockquote
**Insert:** "+" button that opens the same slash command menu

Active states: buttons highlight when cursor is in formatted text (e.g., Bold button is active when cursor is in bold text).

---

## Data Flow

### Save (Editor → DB)

```
Tiptap editor state
  → editor.getJSON()
  → extract recipe IDs from custom nodes (for CollectionRecipe sync)
  → save JSON to Collection.blocks
  → sync CollectionRecipe join table (same logic as before, reading from JSON instead of MDX)
```

### Load (DB → Editor)

```
Collection.blocks (JSON)
  → pass to Tiptap editor as `content` prop
  → editor renders with custom NodeViews
```

### Render (DB → Detail Page)

```
Collection.blocks (JSON)
  → @tiptap/static-renderer with nodeMapping
  → maps each custom node to its read-only React component
  → components fetch recipe data and render (FeaturedTrio, RecipeCard, etc.)
```

---

## Recipe ID Extraction (for CollectionRecipe sync)

Replace `extractRecipeIdsFromMdx()` with `extractRecipeIdsFromBlocks()`:

```typescript
function extractRecipeIdsFromBlocks(blocks: TiptapJSON): string[] {
    const ids = new Set<string>();
    function walk(node: any) {
        if (node.attrs?.recipeId) ids.add(node.attrs.recipeId);
        if (node.attrs?.recipeIds) node.attrs.recipeIds.forEach((id: string) => ids.add(id));
        if (node.content) node.content.forEach(walk);
    }
    walk(blocks);
    return Array.from(ids);
}
```

---

## Files to Create

| File                                                                    | Responsibility                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/components/collections/editor/CollectionBlockEditor.tsx`           | Main Tiptap editor component                          |
| `src/components/collections/editor/EditorToolbar.tsx`                   | Formatting toolbar                                    |
| `src/components/collections/editor/SlashCommandMenu.tsx`                | Slash command floating menu                           |
| `src/components/collections/editor/nodes/RecipeCardNode.tsx`            | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/RecipeCardWithTextNode.tsx`    | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/RecipeSliderNode.tsx`          | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/FeaturedTrioNode.tsx`          | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/TopListNode.tsx`               | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/RandomPickNode.tsx`            | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/RecipeFlowNode.tsx`            | Extension + NodeView                                  |
| `src/components/collections/editor/nodes/shared/RecipeSearchInline.tsx` | Shared recipe search for NodeViews                    |
| `src/components/collections/editor/nodes/shared/FilterConfigPanel.tsx`  | Shared filter config UI                               |
| `src/lib/collections/block-renderer.tsx`                                | Server-side JSON → React renderer                     |
| `src/lib/collections/block-queries.ts`                                  | Filter props → recipe data (renamed from mdx-queries) |
| `src/lib/collections/extract-recipe-ids.ts`                             | Extract IDs from Tiptap JSON                          |

### Files to Remove

| File                                                     | Reason                                 |
| -------------------------------------------------------- | -------------------------------------- |
| `src/lib/collections/mdx.ts`                             | MDX compilation no longer needed       |
| `src/lib/collections/mdx-components.tsx`                 | Replaced by block-renderer             |
| `src/components/collections/CollectionEditorToolbar.tsx` | Replaced by EditorToolbar              |
| `src/components/collections/RecipeSearchModal.tsx`       | Replaced by inline search in NodeViews |

### Files to Modify

| File                                                  | Change                                                  |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `prisma/schema.prisma`                                | `mdxContent String?` → `blocks Json?`                   |
| `src/app/actions/collections.ts`                      | Save/load `blocks` instead of `mdxContent`              |
| `src/lib/collections/sync-recipes.ts`                 | Use `extractRecipeIdsFromBlocks` instead of MDX parser  |
| `src/lib/collections/types.ts`                        | Update `CollectionMutationInput` and `CollectionDetail` |
| `src/components/collections/CollectionEditor.tsx`     | Replace textarea with `CollectionBlockEditor`           |
| `src/app/collection/[slug]/page.tsx`                  | Use block-renderer instead of MDX compiler              |
| `src/components/collections/useCollectionAutoSave.ts` | Save `blocks` JSON instead of `mdxContent`              |

---

## Migration

Since this is pre-release (no production data), no migration needed. The `mdxContent` column is replaced by `blocks` in the schema. Any dev collections are recreated.

---

## Template Layouts

Templates (SIDEBAR, GRID_BELOW, HERO_PICKS, INLINE) still exist on the Collection model. They determine the **outer layout** on the detail page:

- **INLINE** — Block content renders top-to-bottom (default)
- **SIDEBAR** — Block content on left, recipe sidebar on right (recipes from CollectionRecipe)
- **GRID_BELOW** — Block content on top, recipe grid below
- **HERO_PICKS** — Hero recipes on top, block content below

The block-editor content is always a linear flow of blocks. The template wraps it.
