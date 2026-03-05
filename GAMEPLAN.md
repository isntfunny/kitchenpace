# KüchenTakt — Recipe Flow Editor Gameplan

## Goal

Build a read-write flow editor using `@xyflow/react` (v12, already installed) into the recipe creation page (`/recipe/create`). This is the core feature of KüchenTakt — it lets recipe authors visually design their cooking workflow as a directed acyclic graph (DAG) showing parallel steps, dependencies, and timing.

## Context for AI Agents

### Project Stack

- **Framework**: Next.js 16 (App Router), React, TypeScript
- **Styling**: Panda CSS (`styled-system/css`, `styled-system/patterns`) + Radix UI/Colors
- **Icons**: `lucide-react`
- **Database**: PostgreSQL via Prisma 7, flow data stored as JSON columns on `Recipe`
- **Graph layout**: `dagre` (installed, not yet used)
- **Flow library**: `@xyflow/react` ^12.10.1 (installed, not yet used)

### Key Files & Locations

| What                                                | Path                                           |
| --------------------------------------------------- | ---------------------------------------------- |
| Recipe creation page (server component)             | `src/app/recipe/create/page.tsx`               |
| Recipe creation form (client component)             | `src/components/recipe/RecipeForm.tsx`         |
| Form sub-components                                 | `src/components/recipe/RecipeForm/components/` |
| Form data types                                     | `src/components/recipe/RecipeForm/data.ts`     |
| Server action: createRecipe                         | `src/components/recipe/createActions.ts`       |
| Server action: search/fetch helpers                 | `src/components/recipe/actions.ts`             |
| Existing read-only flow viewer (custom, NOT xyflow) | `src/components/flow/RecipeFlow.tsx`           |
| Flow data types (FlowNode, FlowEdge, NodeType)      | `src/app/recipe/[id]/data.ts`                  |
| Prisma schema                                       | `prisma/schema.prisma`                         |
| Seed data with flow examples                        | `src/lib/seed.ts`                              |
| S3 upload helper                                    | `src/lib/s3.ts`                                |
| Upload API route                                    | `src/app/api/upload/route.ts`                  |

### What Exists Today

- **Recipe creation form** collects: title, description, image, servings, prep/cook time, difficulty, categories, tags, ingredients. **No flow editor.**
- **`createRecipe` server action** does NOT accept `flowNodes`/`flowEdges` — they are always `null` after creation.
- **Read-only flow viewer** (`src/components/flow/RecipeFlow.tsx`, ~1028 lines) is a fully custom implementation that does NOT use `@xyflow/react`. It renders nodes at absolute positions with SVG edges. This is used on the recipe detail page for the cooking mode.
- **Seed data** contains 3 example recipes with complete flow graphs (Pasta Aglio e Olio, Entenbrust, Duck Flow Demo) showing both simple and complex parallel workflows.
- **Ingredients** are defined on the recipe before the flow editor is reached in the form. At editor time, the full `AddedIngredient[]` list (id, name, amount, unit) is available in form state and must be passed down to the editor for the @mention system.

---

## Data Model

### FlowNode — Updated Shape

The existing `FlowNode` interface (in `src/app/recipe/[id]/data.ts`) needs to be extended to hold all the new per-step data. **The JSON stored in `Recipe.flowNodes` must be backwards-compatible.**

```typescript
// Canonical step types — see full list below
type StepType =
    | 'start'
    | 'schneiden'
    | 'kochen'
    | 'braten'
    | 'backen'
    | 'mixen'
    | 'warten'
    | 'wuerzen'
    | 'anrichten'
    | 'servieren';

interface FlowNode {
    id: string;
    type: StepType;
    label: string; // short title shown on node card
    description: string; // free text with optional @[Name](ingredientId) mentions
    duration?: number; // optional, in minutes
    ingredientIds?: string[]; // denormalized: list of ingredient IDs mentioned in description
    photoKey?: string; // optional S3 key for a per-step photo
    position: { x: number; y: number };
}
```

**Note on `type` field rename**: The old types (`prep`, `cook`, `wait`, `season`, `combine`, `serve`) are replaced by the new set. The read-only viewer (`RecipeFlow.tsx`) will need a mapping layer so old seeded recipes still render correctly. New recipes use the new types exclusively.

### FlowEdge — Unchanged

```typescript
interface FlowEdge {
    id: string;
    source: string; // node id
    target: string; // node id
}
```

### IngredientMention — @mention resolution at render time

Mentions in `description` are stored as inline tokens: `@[Spaghetti](ingredientId)`.

At render time (read-only viewer), a resolver looks up each `ingredientId` in the recipe's `recipeIngredients` and injects the amount + unit:

```
"@[Spaghetti](ing-123)" → renders as chip: "200g Spaghetti"
```

The `ingredientIds[]` field on the node is a denormalized index — it makes it easy to highlight or list which ingredients a step uses without parsing the description string every time.

---

## Step Types (Schritttypen)

Minimal but universal — each type covers a broad class of kitchen actions. All labels in German.

| `type`      | Anzeigename | Beschreibung                                                                   | Icon                        | Farbe                   |
| ----------- | ----------- | ------------------------------------------------------------------------------ | --------------------------- | ----------------------- |
| `start`     | Start       | Pflichtschritt. Einmalig. Kein eingehender Pfeil möglich. Startet den Flow.    | `PlayCircle`                | `#f0f4ff` (soft indigo) |
| `schneiden` | Schneiden   | Schneiden, Hacken, Würfeln, Reiben, Schälen                                    | `Scissors`                  | `#e3f2fd` (blue)        |
| `kochen`    | Kochen      | Kochen, Sieden, Blanchieren, Dämpfen, Frittieren                               | `Flame`                     | `#fff3e0` (orange)      |
| `braten`    | Braten      | Anbraten, Sautieren, Pfannenrühren, Grillen                                    | `Beef` (or `Flame` variant) | `#fbe9e7` (deep orange) |
| `backen`    | Backen      | Backen, Rösten, Gratinieren, Ofengaren                                         | `UtensilsCrossed`           | `#fce4ec` (pink)        |
| `mixen`     | Mixen       | Mixen, Rühren, Schlagen, Kneten, Pürieren, Vermengen                           | `Blend` / `Shuffle`         | `#e8eaf6` (indigo)      |
| `warten`    | Warten      | Ruhen lassen, Marinieren, Abkühlen, Gehen lassen, Einweichen                   | `Clock`                     | `#f3e5f5` (purple)      |
| `wuerzen`   | Würzen      | Würzen, Abschmecken, Verfeinern                                                | `Leaf`                      | `#e8f5e9` (green)       |
| `anrichten` | Anrichten   | Anrichten, Zusammenfügen, Aufteilen, Portionieren                              | `PanelTop` / `Layers`       | `#fff8e1` (amber)       |
| `servieren` | Servieren   | Pflichtschritt. Einmalig. Kein ausgehender Pfeil möglich. Terminiert den Flow. | `Sparkles`                  | `#ffebee` (red)         |

**Constraints enforced by the editor:**

- Exactly **one** `start` node — auto-created on empty canvas, cannot be deleted while it is the only one, cannot be given an incoming edge.
- Exactly **one** `servieren` node — auto-created on empty canvas, cannot be deleted, cannot be given an outgoing edge.
- All other types can appear any number of times.

---

## Phase 1 — Core Flow Editor Component

### New Files to Create

```
src/components/flow/
├── FlowEditor.tsx                  ← main editor, exported, used in RecipeForm
└── editor/
    ├── editorTypes.ts              ← all TS types for the editor
    ├── stepConfig.ts               ← step type definitions (label, color, icon, constraints)
    ├── RecipeNode.tsx              ← custom xyflow node component
    ├── NodeEditPanel.tsx           ← floating panel for editing a selected node
    ├── NodePalette.tsx             ← Radix UI Accordion sidebar with step types
    ├── DescriptionEditor.tsx       ← textarea with @mention autocomplete
    └── useFlowAutoLayout.ts        ← dagre-based auto-layout hook
```

### `FlowEditor.tsx` — Public Interface

```typescript
interface FlowEditorProps {
    // Ingredients available for @mentions — sourced from RecipeForm's ingredient state
    availableIngredients: AddedIngredient[]; // { id, name, amount, unit }

    // Controlled or uncontrolled initial state
    initialNodes?: FlowNode[];
    initialEdges?: FlowEdge[];

    // Called whenever the graph changes — parent form reads this on submit
    onChange?: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}
```

The component initializes xyflow with a default `start` node and `servieren` node when `initialNodes` is empty.

### `RecipeNode.tsx` — Custom xyflow Node

Each node on the canvas renders as a card showing:

- **Top row**: step type icon + type label (e.g. "Kochen") + optional duration badge ("8 Min.")
- **Middle**: `label` (editable inline on double-click, or via NodeEditPanel)
- **Bottom**: truncated `description` (1–2 lines) — @mentions shown as colored inline chips
- **Photo thumbnail**: if `photoKey` is set, a small image preview in the top-right corner
- **Ingredient badges**: small pills for each linked ingredient below the description
- **Source handle** (bottom): xyflow connection point to drag edges from
- **Target handle** (top): xyflow connection point to receive edges
- **Delete button**: `×` appears on hover/selection

Visual style follows the existing read-only viewer colors/icons, adapted for the xyflow node format.

### `NodeEditPanel.tsx` — Edit Floating Panel

Appears as a floating panel (anchored to the selected node, or as a fixed side panel) when a node is selected. Contains:

1. **Typ** (step type) — dropdown/segmented selector using the 10 types
2. **Titel** — text input for `label`
3. **Dauer** — number input in minutes (optional)
4. **Beschreibung** — `DescriptionEditor` component (see below)
5. **Foto** — image upload button (uses existing `/api/upload` endpoint, stores S3 key in `photoKey`)
6. **Löschen** — delete button (disabled for `start`/`servieren` when they are the only instance)

### `DescriptionEditor.tsx` — @mention Text Input

A `<textarea>` with a live @mention autocomplete:

1. User types freely. When they type `@`, a floating dropdown appears.
2. Dropdown filters the `availableIngredients` list as the user continues typing (e.g. `@Spag` shows "Spaghetti").
3. Selecting an ingredient inserts `@[Spaghetti](ingredientId)` into the textarea at cursor position.
4. Below the textarea, a **preview line** renders the description with mentions replaced by styled chips showing "200g Spaghetti" (amount + unit from `availableIngredients`).
5. On save, the raw string (with `@[Name](id)` tokens) is stored in `description`. The `ingredientIds[]` array is derived by extracting all `(id)` parts from the string.

**Storage format for @mentions:**

```
Raw stored string:
  "Knoblauch schälen und @[Knoblauch](ing-abc) in Scheiben schneiden."

Rendered (read-only):
  "Knoblauch schälen und [4 Zehen Knoblauch] in Scheiben schneiden."
  (where [4 Zehen Knoblauch] is an inline ingredient chip)
```

### `NodePalette.tsx` — Step Type Sidebar with Radix UI Accordion

Located on the **left side** of the editor as a sidebar panel. Uses **Radix UI Accordion** for collapsible sections grouped by category.

```
┌─────────────────────────────────────┐
│  Schritte                           │
│  ─────────────────────────────────  │
│  ▼ Vorbereitung                     │  ← Radix Accordion trigger
│    ✂️ Schneiden                      │    ← Draggable/clickable
│    🧪 Mixen                         │
│  ▼ Kochen                           │
│    🔥 Kochen                        │
│    🍳 Braten                        │
│    🥐 Backen                        │
│  ▼ Warten                           │
│    ⏳ Warten                        │
│  ▼ Würzen                           │
│    🌿 Würzen                        │
│  ▼ Fertig                           │
│    🍽 Anrichten                     │
│    ✨ Servieren                     │
└─────────────────────────────────────┘
```

- **Radix UI Accordion**: collapsible sections for each category (Vorbereitung, Kochen, Warten, Würzen, Fertig)
- **Search input**: at the top, filters all items across categories
- **Drag and drop**: each step type can be dragged onto the canvas to create a node
- **Click to add**: clicking a step type adds it as an unconnected node at the center of the visible canvas
- **Visual feedback**: drag preview shows the node card style
- **Step type cards**: colored background matching step type, icon + label

### `useFlowAutoLayout.ts` — dagre Auto-Layout

A hook that takes the current xyflow nodes/edges and returns repositioned nodes using `dagre`:

```typescript
function useFlowAutoLayout(nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB'): Node[];
```

Used by an "Auto-Layout" button in the editor toolbar. Does not run automatically — only on user request to preserve manual positioning.

---

## Phase 2 — Integration into Recipe Creation Page

### Files to Modify

**`src/components/recipe/RecipeForm.tsx`**

- Import `FlowEditor`
- Add state: `const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])`
- Add state: `const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([])`
- Pass `availableIngredients={ingredients}` to `FlowEditor` (the `ingredients` state already exists)
- Add `FlowEditor` between `IngredientManager` and `SubmissionControls`
- On submit, pass `flowNodes` and `flowEdges` to `createRecipe()`
- Add validation: if `flowNodes.length === 0`, warn user that no flow was created (soft warning, not a hard block)

**`src/components/recipe/createActions.ts`**

- Extend `CreateRecipeInput`:
    ```typescript
    flowNodes?: FlowNode[];
    flowEdges?: FlowEdge[];
    ```
- Pass to Prisma `recipe.create()`:
    ```typescript
    flowNodes: data.flowNodes ? data.flowNodes : undefined,
    flowEdges: data.flowEdges ? data.flowEdges : undefined,
    ```

**`src/app/recipe/[id]/data.ts`**

- Extend `FlowNode` type with new fields: `ingredientIds?`, `photoKey?`
- Update `StepType` / `NodeType` union to include all 10 new step types
- Add backwards-compat mapping from old types (`prep`, `cook`, `wait`, `season`, `combine`, `serve`) to new types for the read-only viewer

---

## Phase 3 — UX Polish

- **Auto-layout button**: "Layout aufräumen" in the editor toolbar — runs dagre on click
- **Minimap**: xyflow built-in `<MiniMap>` with step-type-colored nodes
- **Controls**: xyflow built-in `<Controls>` (zoom in/out, fit view, lock)
- **Validation overlay**: Before submit, scan for: disconnected nodes (no path to `servieren`), missing `start` node, missing `servieren` node — show inline warning banners
- **Keyboard shortcuts**: `Backspace`/`Delete` to remove selected node/edge, `Escape` to close edit panel
- **Edge labels**: Optional, show duration delta or dependency hint
- **Undo/redo**: xyflow's `useUndoRedo` pattern or simple history stack

---

## Phase 4 — Hardening (Editor UX)

_Completed March 2026 — see detailed notes below._

### ✅ 4.1 Fix node deletion button

- `nodeCardClass` overflow changed to `visible`, photo wrapped in inner `overflow: hidden` div
- Delete button visible on hover via CSS group pattern

### ✅ 4.2 Intuitive wiring — (+) button + edge insert

- `AddNodeButton.tsx`: orange pill below nodes with no outgoing edge, opens step-type popover
- `FlowEditorContext` extended with `nodeOutgoingEdges`, `onAddNodeAfter`, `onInsertOnEdge`
- `InsertEdge.tsx`: custom edge type with hover-to-reveal (+) button at midpoint — splits edge on select
- All edges use `type: 'insertable'` via module-level `EDGE_TYPES` constant

### ✅ 4.3 Full-width editor layout

- `FullWidthShell.tsx` created — full-viewport-width shell (Header + full-height main)
- `RecipeForm.tsx` rewritten as Radix Accordion wizard sidebar:
    - Left sidebar (320px, scrollable): Accordion sections (Titel, Zeit, Kategorie, Tags, Zutaten) with ✓/○ completion indicators, auto-collapse when filled
    - Right area (flex: 1): FlowEditor canvas fills remaining space
    - Sticky footer with auto-save status + submit controls
- Create/Edit pages use `<FullWidthShell>` + `layout="sidebar"` prop

### ✅ 4.4 Draft recipe viewing

- `fetchRecipeBySlug` accepts `includeUnpublished?: boolean`
- Recipe detail page: 2-phase fetch → draft visible for author/admin only
- `RecipeDetailClient` shows amber "Entwurf" banner for draft recipes
- `src/lib/admin/check-admin.ts` — `isAdmin(userId)` helper

### ✅ 4.5 Custom 404 page

- `src/app/not-found.tsx` — branded, ChefHat icon, German copy, links to home + /recipes

### ✅ 4.6 Custom error pages

- `src/app/error.tsx` — client error boundary with retry + home link
- `src/app/global-error.tsx` — Sentry-integrated root error page, inline styles (no Panda)

---

## Phase 5 — @mention Enhancements + AI Conversion

### ✅ 5.1 @mention text rendering with amounts

- `RecipeNode.tsx`: `renderDescription()` returns JSX — orange inline chips with `Name (amount unit)`
- `DescriptionEditor.tsx`: focus-aware — shows styled chip preview when blurred, textarea when focused
- Both use the same `@[Name](id)` regex parser

### ✅ 5.2 @mention DB ingredient search

- `DescriptionEditor` accepts `onSearchIngredients` + `onAddIngredient` props
- DB search debounced 300ms, results shown below recipe ingredients with separator
- Selecting a DB ingredient auto-adds it to the recipe with no amount

### ✅ 5.3 AI conversion modal (mock)

- `AiConversionDialog.tsx`: 3-phase modal — Input → Processing (animated step log) → Done (mock stats)
- Triggered by "Lass KI die Arbeit übernehmen" ✨ button in FlowEditor's top-right Panel
- `rawRecipeText String?` field added to Prisma schema for future AI pipeline
- `onSubmit` callback prepared for real AI call (currently logs to console)

---

## Phase 6 — Cooking Mode: Node Timers _(planned)_

### Overview

For nodes with a `duration` (kochen, braten, backen, warten, etc.), the **read-only recipe viewer** gains a countdown timer directly on the node card. This is purely a viewer feature — no changes to editor or data model.

### UX Design

```
┌─────────────────────────────────┐
│ 🔥 Kochen              8 Min.   │
│                                 │
│  Pasta kochen                   │
│  Spaghetti al dente kochen...   │
│                                 │
│  [▶ Timer starten]              │  ← idle state: play button
└─────────────────────────────────┘

──── after clicking ────

┌─────────────────────────────────┐  ← background: white (stripped of step color)
│▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░│  ← color fills left→right as progress bar
│ 🔥 Kochen           3:24 left   │
│                                 │
│  Pasta kochen                   │
│  Spaghetti al dente kochen...   │
│                                 │
│  [⏸ Pause]   [↺ Neustart]      │
└─────────────────────────────────┘

──── last 30 seconds ────

Card slowly begins to glow red (box-shadow pulse animation).

──── time up ────

Card glows solid red, pulsing. Sound/vibration (optional).
A "Fertig! ✓" overlay appears centered on the card.
```

### Technical Implementation Plan

**Component:** `src/components/flow/viewer/TimerNode.tsx` (or extend existing read-only node component)

**Timer state** (local — no persistence needed):

```typescript
type TimerState = 'idle' | 'running' | 'paused' | 'done';

interface NodeTimerState {
    state: TimerState;
    remainingMs: number; // milliseconds left
    totalMs: number; // total duration in ms (from node.duration * 60000)
    intervalRef: ReturnType<typeof setInterval> | null;
}
```

**Visual effects:**

- **Progress fill**: CSS `background: linear-gradient(to right, {stepColor} {pct}%, white {pct}%)` where `pct = (1 - remainingMs/totalMs) * 100`
- **Pre-warning glow** (≤ 30s): `box-shadow: 0 0 0 4px rgba(239,68,68,{opacity})` where opacity ramps from 0 → 0.6 over the 30s window. Use a CSS animation or inline style driven by remaining time.
- **Done glow**: solid red pulse — `@keyframes timerDone { 0%,100% { box-shadow: 0 0 0 4px rgba(239,68,68,0.3) } 50% { box-shadow: 0 0 0 12px rgba(239,68,68,0.6) } }`
- **Time display**: `MM:SS` format, shown in the top-right corner replacing the static "X Min." badge while running

**Eligible step types** (have `duration` and make sense for timing):
`kochen`, `braten`, `backen`, `warten` — not `schneiden`, `mixen`, `wuerzen`, `anrichten`

**Button states:**

- Idle: `▶ Timer starten` (orange, primary)
- Running: `⏸ Pause` + `↺ Neustart` (ghost)
- Paused: `▶ Weiter` + `↺ Neustart` (ghost)
- Done: `↺ Nochmal` (ghost)

**Multiple simultaneous timers**: fully supported — each node manages its own local state independently.

**Sound/vibration**: optional enhancement — `navigator.vibrate([200, 100, 200])` on completion (mobile), Web Audio API beep.

### Files to Change

| Action | File                                                        | What                                                  |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------- |
| Edit   | `src/components/flow/RecipeFlow.tsx` (or viewer equivalent) | Render timer UI on timed nodes in read-only mode      |
| Create | `src/components/flow/viewer/NodeTimer.tsx`                  | Self-contained timer component                        |
| Edit   | `src/app/recipe/[id]/data.ts`                               | Ensure `duration` is present in FlowNode type (it is) |

### Notes

- Timer is **purely client-side** — no server involvement, no persistence
- Must not appear in the editor (`FlowEditor.tsx`) — only in read-only view
- On mobile (small screens): timer button and display must remain legible — minimum 44px touch target

---

## Design — Integration & Accessibility

### Existing Design Language (must be matched exactly)

The form uses a warm terracotta/orange brand system. The Panda CSS config is at `panda.config.ts`. Use these patterns consistently:

**Hardcoded values** (used directly in `css()` calls, matching existing form components):

| Pattern                | Value                                                            | Usage                          |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Input/container border | `1px solid rgba(224,123,83,0.4)`                                 | all inputs, section containers |
| Focus border color     | `#e07b53`                                                        | `:focus` on inputs             |
| Focus ring             | `box-shadow: 0 0 0 3px rgba(224,123,83,0.15)`                    | `:focus` on inputs             |
| Accent tint bg         | `rgba(224,123,83,0.05)`                                          | row/card backgrounds           |
| Primary button bg      | `linear-gradient(135deg, #e07b53 0%, #f8b500 100%)`              | main CTAs                      |
| Publish button bg      | `linear-gradient(135deg, #00b894 0%, #00cec9 100%)`              | publish state                  |
| Body gradient          | `linear-gradient(180deg, #fff8f4 0%, #fef0e8 40%, #fceadd 100%)` | set globally                   |

**Semantic tokens** (from `panda.config.ts` → `semanticTokens.colors` — use in `css()`):

| Token            | Light value                   | Usage                  |
| ---------------- | ----------------------------- | ---------------------- |
| `primary`        | `#e07b53`                     | brand orange           |
| `surface`        | `#ffffff`                     | card/panel backgrounds |
| `background`     | `#faf9f7`                     | page background        |
| `text`           | `#2d3436`                     | body text              |
| `text.muted`     | `#636e72`                     | secondary/hint text    |
| `accent`         | `#f8b500`                     | gold accent            |
| `accentSoft`     | `rgba(224,123,83,0.08)`       | subtle orange tint     |
| `border`         | `rgba(0,0,0,0.08)`            | subtle dividers        |
| `border.primary` | `#e07b53`                     | primary border         |
| `shadow.small`   | `0 2px 8px rgba(0,0,0,0.06)`  | card resting shadow    |
| `shadow.medium`  | `0 4px 24px rgba(0,0,0,0.08)` | elevated card shadow   |

**Brand color tokens** (from `tokens.colors.brand.*`):

| Token             | Value     |
| ----------------- | --------- |
| `brand.primary`   | `#e07b53` |
| `brand.secondary` | `#2d3436` |
| `brand.accent`    | `#f8b500` |
| `brand.light`     | `#faf9f7` |

**Typography:**

- Headings: `fontFamily: 'heading'` → Playfair Display (serif)
- Body: `fontFamily: 'body'` → Inter (sans-serif, default)
- Section labels: `fontWeight: '600', display: 'block', mb: '2'`

**Structural patterns:**

- `borderRadius: 'xl'` on inputs and containers, `borderRadius: 'full'` on pills/chips
- Page max-width: `960px` centered with `px: { base: '4', md: '6' }`
- No card wrapper chrome — sections are flat label-above-input stacks with `gap: '6'` between them
- Fonts loaded via Next.js `next/font`, applied as CSS vars (`--font-playfair`, `--font-inter`)

### Flow Editor Section — Visual Integration

The editor section must look like a natural continuation of the form, **not a separate tool dropped in**.

**Section header** — identical pattern to all other sections:

```
Zubereitungsschritte
Baue deinen Kochablauf Schritt für Schritt auf.    ← small muted helper text
```

**Canvas container:**

- Border: `1px solid rgba(224,123,83,0.4)` — same as every input
- Border radius: `xl`
- Background: `#fdfcfb` (barely-off-white, warm)
- Min height `520px`, scrollable
- No infinite pan unless the graph grows — start with a well-bounded view, xyflow's `fitView` keeps everything visible

**Canvas empty state** (when no steps added yet):

- Start and Servieren nodes pre-placed and connected with a dashed line
- A large, friendly callout in the middle: "✚ Ersten Schritt hinzufügen" — same orange as brand buttons
- Short hint text: "Tippe auf (+) unter einem Schritt, um den nächsten hinzuzufügen."

### Node Card Design

Large, friendly, readable at a glance. Minimum touch target 48px tall.

```
┌─────────────────────────────────┐
│ 🔥 Kochen              8 Min.   │  ← type badge (colored pill) + duration
│                                 │
│  Pasta kochen                   │  ← bold title, 16px
│  Spaghetti al dente kochen,     │  ← description, 14px, 2 lines max
│  kräftig gesalzenes Wasser      │
│                                 │
│  [🧄 4 Zehen Knoblauch]         │  ← ingredient chips (if any @mentions)
│                        [✏ Edit] │  ← edit button, appears on hover/tap
└─────────────────────────────────┘
              │
         ┌────┴────┐
         │ + Schritt│   ← big (+) button — only when no outgoing edge
         │hinzufügen│
         └─────────┘
```

Node card specs:

- Width: `240px`
- Background: step-type color (soft, pastel) — same palette as existing viewer
- Border: `2px solid transparent` normally, `2px solid #e07b53` when selected
- Box shadow: `0 2px 8px rgba(0,0,0,0.07)` resting, `0 4px 16px rgba(224,123,83,0.2)` on hover
- Title: `fontSize: 'md', fontWeight: '700'`
- Description: `fontSize: 'sm', color: 'text-muted'`, 2-line clamp
- Type badge: colored pill (pastel bg + slightly darker text), `fontSize: 'xs', fontWeight: '600'`

**Start node**: slightly special — indigo/blue tint, label "Los geht's!" editable, no incoming handle shown
**Servieren node**: special — red/warm tint, label "Servieren" + subtitle "Guten Appetit! 🎉", no outgoing handle shown, no `(+)` button

### `(+)` Add Step Button — Primary UX Affordance

This is **the main way users build their recipe flow**. It must be impossible to miss.

- Size: `140px wide × 40px tall` pill button
- Background: `linear-gradient(135deg, #e07b53 0%, #f8b500 100%)` — same as primary CTA
- Text: "＋ Schritt hinzufügen" in white, `fontWeight: '600'`
- Connects from the bottom handle of any node that has no outgoing edges (except `servieren`)
- On click: opens the **Step Type Picker** inline below the button (not a floating modal)

### Step Type Picker — "What kind of step?"

Appears **inline** (not as a modal/overlay) in a rounded container with the orange border, immediately below the `(+)` button. Shows a 2×5 grid of big, friendly type cards:

```
┌─────────────────────────────────────────────┐
│  Was passiert als nächstes?                 │
│                                             │
│  ✂️ Schneiden    🔥 Kochen    🍳 Braten    │
│  🥐 Backen       🌀 Mixen     ⏳ Warten    │
│  🌿 Würzen       🍽 Anrichten              │
│                                             │
│                          [Abbrechen]        │
└─────────────────────────────────────────────┘
```

Each type card:

- `120px × 80px` minimum
- Large icon (28px) + type name below in German
- Step type color as background
- On hover/focus: slight lift + orange border
- On click: creates the node and immediately opens the inline edit form for it

### Node Edit Form — Inline, Not Floating

When a node is selected (clicked or newly created), an **inline edit panel expands below the node** on the canvas — it feels like an accordion opening, not a popup.

Uses identical input styling to the rest of the form:

- `border: 1px solid rgba(224,123,83,0.4)`
- `borderRadius: xl`
- `_focus: { borderColor: '#e07b53', boxShadow: '0 0 0 3px rgba(224,123,83,0.15)' }`

Fields (top to bottom):

1. **Typ ändern** — row of small colored pill buttons (one per step type, currently selected is highlighted with orange border) — no dropdown, just visual toggle
2. **Titel** — text input, placeholder "z.B. Pasta kochen"
3. **Dauer (optional)** — number input + "Min." suffix label — same style as the form's time inputs
4. **Beschreibung** — textarea (3 rows) with `@` hint: "Tipp: Schreibe @Zutat um eine Zutat zu verknüpfen" as placeholder/hint
5. **Foto hinzufügen (optional)** — same `FileUpload` component already used in the form
6. **[Fertig]** button (brand orange pill) + **[Schritt löschen]** ghost danger button

The description field gains @mention autocomplete: dropdown appears when `@` is typed, shows ingredient name + amount as rows to click.

### Accessibility & "Easy for Everyone" Rules

1. **No drag required** — the entire flow can be built using only `(+)` buttons and the inline edit form. Drag-and-drop is available for power users but never the only way.
2. **Large touch targets** — all interactive elements ≥ 44px tall, `(+)` button especially prominent.
3. **No jargon** — "Schritt hinzufügen" not "Node", "Verbindung" not "Edge", "Neu anordnen" not "Auto-Layout".
4. **Always two anchors** — Start + Servieren are always visible and labeled clearly. The user is never confused about where their flow begins and ends.
5. **Guided empty state** — first-time callout with an arrow pointing to the `(+)` button: "Fang hier an — füge deinen ersten Schritt hinzu!"
6. **Inline feedback** — when description @mentions are typed, a live preview line below the textarea shows how it'll look: "Knoblauch schälen → **[4 Zehen Knoblauch]** in Scheiben schneiden."
7. **Soft validation** — disconnected nodes get a subtle warning indicator (orange dashed border) with tooltip "Dieser Schritt ist nicht verbunden", not a hard error block.
8. **Minimal xyflow chrome** — no MiniMap (too confusing), just `<Controls>` tucked in the bottom-right corner of the canvas with three buttons: Zoom +, Zoom −, Fit Alles. Labels in German.
9. **"Neu anordnen" button** — single button above the canvas (same style as ghost buttons in the form) — runs dagre and animates nodes to tidy positions. Labeled simply, no explanation needed.
10. **Mobile** — on screens under 768px, the flow editor is replaced by a vertical list of step cards (no canvas), still fully functional: steps can be reordered with up/down arrows, `(+)` button adds below. The DAG structure (non-linear edges) is preserved in state but not editable on mobile.

---

## Design Decisions

1. **Separate FlowEditor from RecipeFlow**: The existing read-only viewer stays untouched. The new editor is a distinct component optimized for authoring. They share the `FlowNode`/`FlowEdge` data types but not UI code.
2. **xyflow for editor, custom for viewer**: The read-only viewer's lane-based card UI is purpose-built for mobile cooking mode. The editor uses xyflow for its drag-connect-rearrange capabilities. Different needs, different tools.
3. **JSON storage**: Flow data stays as JSON columns on `Recipe`. No separate Step/Edge tables — keeps the schema simple and the data self-contained per recipe.
4. **dagre for auto-layout only**: Users can manually position nodes, but get a "clean up layout" button powered by dagre. No forced layout on every change.
5. **@mentions are stored as raw strings**: The `description` field stores `@[Name](id)` tokens as plain text. The renderer parses them. This keeps storage simple and the text is still human-readable in its raw form.
6. **Ingredients flow from form state into editor**: The `AddedIngredient[]` list from `RecipeForm` is passed as a prop to `FlowEditor`. The editor never fetches ingredients independently — it only knows about the ones already added to the recipe. This makes the @mention scope always consistent with the recipe's actual ingredient list.
7. **Start + Servieren nodes are structural**: Auto-created, deletion-protected (unless removing leaves a valid replacement). The canvas is never truly empty — it always has at least these two nodes as anchors.
8. **Step types are flat, not hierarchical**: No sub-types or categories. The 10 types are broad enough to cover all standard cooking operations without needing nesting.

---

## Implementation Status (as of March 2026)

### Phase 1 — Core Flow Editor Component

**STATUS: ✅ Complete**

| Component                | Status  | Notes                                                                     |
| ------------------------ | ------- | ------------------------------------------------------------------------- |
| `FlowEditor.tsx`         | ✅ Done | Full editor with context, sidebar, node/edge management, AI button        |
| `editorTypes.ts`         | ✅ Done | StepType, RecipeNodeData, FlowNodeSerialized, FlowEdgeSerialized          |
| `stepConfig.ts`          | ✅ Done | 10 step types with colors, gradients, icons, categories                   |
| `RecipeNode.tsx`         | ✅ Done | Custom xyflow node, gradient backgrounds, @mention chips with amounts     |
| `NodeEditPanel.tsx`      | ✅ Done | Floating panel: type selector, title, duration, description, photo upload |
| `NodePalette.tsx`        | ✅ Done | Radix Accordion sidebar with drag-and-drop, search                        |
| `DescriptionEditor.tsx`  | ✅ Done | @mention autocomplete, DB search, focus-aware preview                     |
| `AddNodeButton.tsx`      | ✅ Done | Orange pill below terminal nodes, step-type popover                       |
| `InsertEdge.tsx`         | ✅ Done | Custom edge with hover (+) button to insert node mid-connection           |
| `AiConversionDialog.tsx` | ✅ Done | Mock AI modal: input → animated processing → success stats                |
| `FlowEditorContext.ts`   | ✅ Done | Context with ingredients, node ops, edge ops, AI ingredient add           |
| `useFlowAutoLayout.ts`   | ✅ Done | dagre-based auto-layout hook                                              |

### Phase 2 — Integration

**STATUS: ✅ Complete**

| File                 | Changes                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `RecipeForm.tsx`     | Radix Accordion wizard sidebar, FlowEditor canvas, auto-save, save bar |
| `createActions.ts`   | Accepts flowNodes/flowEdges, passes to Prisma                          |
| `FullWidthShell.tsx` | Full-viewport shell, used on create/edit pages                         |
| Create/edit pages    | Use FullWidthShell + RecipeForm layout="sidebar"                       |

### Phase 3 — UX Polish

**STATUS: ~40% Complete**

| Feature                     | Status         |
| --------------------------- | -------------- |
| "Layout aufräumen" button   | ✅ Done        |
| xyflow Controls             | ✅ Done        |
| Escape closes panel         | ✅ Done        |
| Node delete on hover        | ✅ Done        |
| Minimap                     | ❌ Not started |
| Validation overlay          | ❌ Not started |
| Keyboard shortcuts (Delete) | ❌ Not started |
| Edge labels                 | ❌ Not started |
| Undo/redo                   | ❌ Not started |

### Phase 4 — Hardening

**STATUS: ✅ Complete** — see Phase 4 section above

### Phase 5 — @mention + AI

**STATUS: ✅ Complete** — see Phase 5 section above

### Phase 6 — Cooking Mode Timers

**STATUS: 🗓 Planned** — see Phase 6 section above

---

## Current File Structure

```
src/components/flow/
├── FlowEditor.tsx                  # Main editor (uses @xyflow/react)
├── RecipeFlow.tsx                  # Read-only viewer (custom, existing)
└── editor/
    ├── editorTypes.ts              # StepType, RecipeNodeData, FlowNodeSerialized
    ├── stepConfig.ts               # 10 step types with colors, gradients, icons
    ├── RecipeNode.tsx              # Custom xyflow node with ingredient chips + @mention rendering
    ├── NodeEditPanel.tsx           # Floating panel for editing selected node
    ├── NodePalette.tsx             # Radix Accordion sidebar with drag-drop
    ├── DescriptionEditor.tsx       # Textarea with @mention autocomplete + DB search + preview
    ├── AddNodeButton.tsx           # (+) pill button below terminal nodes
    ├── InsertEdge.tsx              # Hover-to-insert custom edge type
    ├── AiConversionDialog.tsx      # Mock AI conversion modal
    ├── FlowEditorContext.ts        # Context for shared state and callbacks
    └── useFlowAutoLayout.ts        # dagre auto-layout hook

src/components/layouts/
└── FullWidthShell.tsx              # Full-viewport shell for editor pages

src/lib/admin/
└── check-admin.ts                  # isAdmin(userId) helper — fresh DB lookup

src/app/
├── not-found.tsx                   # Custom 404 page (branded)
├── error.tsx                       # Custom error boundary page
└── global-error.tsx                # Root error page (Sentry + inline styles)
```

---

## Remaining Tasks (Priority Order)

1. **Validation overlay** — disconnected nodes get orange dashed border + warning before submit
2. **Keyboard shortcuts** — Backspace/Delete removes selected node/edge
3. **Phase 6: Node timers** — cooking mode countdown timers on timed nodes in read-only viewer
4. **Mobile view** — vertical step list on small screens (< 768px)
5. **Real AI conversion** — wire `rawRecipeText` to actual LLM call with `response_format` schema
6. **Photo upload** — wire NodeEditPanel upload button to `/api/upload`
7. **Minimap** — optional, low priority
8. **Undo/redo** — optional, low priority

---

## YouTrack References

- **KUC-2**: Technische Details erörtern (parent)
- **KUC-3**: React Flow Möglichkeiten (subtask of KUC-2)
- **KUC-10**: React Flow für Rezept-Detailseite (subtask of KUC-7)
- **KUC-7**: Rezept-Detailseite implementieren
