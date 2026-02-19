# KitchenPace - Agents Documentation

## Project Overview

**KitchenPace** (also branded as "KüchenTakt") is a recipe application that transforms traditional linear recipes into **interactive, visual flow diagrams**. The core vision is to help users manage complex cooking processes by visualizing parallel tasks, dependencies, and timing.

The app takes the stress out of multi-tasking in the kitchen by showing:
- What can be done in parallel
- The critical path (what must happen first)
- Timing and dependencies between steps
- Visual representation of each cooking action

## Technology Stack

| Category | Tech Stack |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | Radix UI + Panda CSS |
| **Database** | Prisma 7 + PostgreSQL |
| **Flow Editor** | React Flow (@xyflow/react) |
| **Styling** | Panda CSS |
| **Language** | TypeScript |
| **User Auth** | Logto |
| **Search** | PostgreSQL (FTS) |

## Ticket References

### KUC-1: MVP (Parent Issue)
The main MVP requirements from KUC-1 include:

**Features:**
- Recipe creation with image upload
- Workflow steps using React Flow with:
  - "Fixed" lanes for different step types
  - Additional lanes can be added
  - Fixed step types: "Kochen", "Backen", "Vorbereitung", "Würzen", "Warten", "Zusammenführen", "Servieren"
  - No drag & drop for adding steps - use (+) button at end of each lane
  - Final "Servieren" node that all lanes must converge to
- Ingredients list
- Tags (auto-assigned via AI)
- Category (Backen / Kochen / Getränk / Beilage)
- Recipe search
- Recipe ratings
- User registration
- Homepage with: Daily Highlight, Neuste Rezepte, Top Rated, "Passt zu jetzt" (dropdown), Saisonal

**Technical:**
- Uploads → S3 (MinIO)
- Search → PostgreSQL Full-Text Search
- Database → PostgreSQL
- ORM → Prisma

### KUC-2: Technische Details erörtern (Parent Issue)
Technical discussion issue - the parent for exploring React Flow implementation.

### KUC-3: React Flow Möglichkeiten (Subtask of KUC-2)
Exploring React Flow capabilities for the KitchenPace project.

### KUC-10: React Flow für Rezept-Detailseite (Subtask of KUC-7)
**Current active task** - Implementing React Flow on the recipe detail page.

#### Requirements from KUC-10:
- Flow diagram for recipe preparation steps
- Interactive step-by-step visualization
- Drag & Drop functionality
- Zoom & Pan support
- Export function (PNG/PDF)
- Must be displayed on recipe detail page (`/recipe/[id]`)
- Must be responsive

## React Flow Research Summary (from KUC-1 Comments)

### Key Findings

1. **React Flow has NO native swimlane concept** - Lanes must be simulated using:
   - Fixed Y-positions per lane
   - Visual background labels
   - Custom drag logic for lane changes

2. **Implementation approaches evaluated:**
   - **Option A: Group Nodes** - Use `type: 'group'` with `parentId` and `extent: 'parent'`
   - **Option B: Custom Lane Node** - Full custom implementation
   - **Option C: Fixed Y-Positions** - Simplest approach, use fixed Y-coordinates per lane (RECOMMENDED for MVP)

### Lane Configuration
```typescript
const LANES = [
  { id: 'vorbereitung', label: 'Vorbereitung', color: '#e3f2fd' },
  { id: 'kochen', label: 'Kochen', color: '#fff3e0' },
  { id: 'backen', label: 'Backen', color: '#fce4ec' },
  { id: 'warten', label: 'Warten', color: '#f3e5f5' },
  { id: 'wuerzen', label: 'Würzen', color: '#e8f5e9' },
  { id: 'servieren', label: 'Servieren', color: '#ffebee', isFinal: true },
];
```

### Validation Logic
The flow editor includes validation to ensure all paths lead to the "Servieren" node using BFS traversal.

### (+)-Button Implementation
Buttons should be placed OUTSIDE React Flow canvas with `className="nodrag"` if placed inside custom nodes.

## Data Models

### Recipe Steps (Current Structure)
```typescript
interface Step {
  order: number;
  description: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Einfach" | "Mittel" | "Schwer";
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  authorId: string;
}
```

### Recommended Flow Data Model
```typescript
interface RecipeFlow {
  id: string;
  lanes: Lane[];
  steps: RecipeStep[];
  edges: FlowEdge[];
}

interface Lane {
  id: string; // 'vorbereitung' | 'kochen' | 'backen' | 'warten' | 'wuerzen' | 'servieren'
  label: string;
  order: number;
  yPosition: number;
  color: string;
}

interface RecipeStep {
  id: string;
  laneId: string;
  type: 'kochen' | 'backen' | 'vorbereitung' | 'warten' | 'wuerzen' | 'zusammenfuehren' | 'servieren';
  title: string;
  duration?: number;
  ingredients?: string[];
  image?: string;
  position: { x: number; y: number };
}
```

## React Flow Implementation Guidelines

### For Recipe Detail Page (KUC-10)

The visualization should transform linear recipe steps into an interactive flow diagram showing:
1. **Parallel execution paths** - What can be done simultaneously
2. **Dependencies** - What must happen before what
3. **Timing** - Visual cues for how long each step takes
4. **Progress tracking** - Mark steps as complete during cooking

### Node Types to Implement
Each cooking action should have its own visual node type:
- `cookingNode` - Active cooking actions (braten, köcheln, backen)
- `prepNode` - Preparation actions (schneiden, würzen, mischen)
- `waitingNode` - Passive waiting times (ruhen lassen, ziehen lassen)
- `combineNode` - Combining ingredients
- `finishNode` - Final plating/serving (the "Servieren" node)

### Node Structure
```typescript
interface FlowNode {
  id: string;
  type: 'cooking' | 'prep' | 'waiting' | 'combine' | 'finish';
  data: {
    label: string;
    description: string;
    duration?: number; // in minutes
    completed?: boolean;
  };
  position: { x: number; y: number };
}
```

### Flow Layout
- **Vertical orientation**: Steps flow from top to bottom
- **Parallel branches**: When steps can be done simultaneously, show as branches
- **Merge points**: When parallel branches rejoin
- **Critical path**: Highlight the longest/most time-critical path

### Features Required
1. **Zoom & Pan**: Standard React Flow controls
2. **Node Interaction**: Click to see step details
3. **Progress Tracking**: Mark nodes as complete (visual feedback)
4. **Export**: Download as PNG or PDF
5. **Responsive**: Works on mobile and desktop
6. **Timer Integration**: Optional timer per node

### For Recipe Editor (Future - from KUC-1)

Based on the recipe detail implementation, the recipe editor should:
1. Use **Option C (Fixed Y-Positions)** for lane handling
2. Place **(+)-Buttons outside the canvas** in a sidebar
3. Use **Dagre** for auto-layout
4. Implement **validation** ensuring all paths converge to "Servieren"
5. Allow **drag between lanes** with automatic Y-position snapping
6. Implement **automatic reconnection** when nodes are deleted

## Existing Routes

```
/                           - Home page
/recipe/[id]               - Recipe detail page (WHERE REACT FLOW GOES - KUC-10)
/auth/signin               - Sign in page
/auth/register             - Registration page
/auth/signout              - Sign out page
/auth/forgot-password      - Forgot password page
/auth/password/edit       - Edit password page
/profile                   - User profile page
/profile/edit             - Edit profile
/profile/manage           - Manage profile
```

## Implementation Notes

- The recipe detail page is at `/root/projects/kitchenpace/app/recipe/[id]/page.tsx`
- The client component `RecipeDetailClient` handles the rendering
- Current recipe data is in `/root/projects/kitchenpace/app/recipe/[id]/data.ts`
- Components are in `/root/projects/kitchenpace/components/`
- React Flow components are in `components/flow/`

## Development Commands

```bash
npm run dev    # Start development server
# Opens at http://localhost:3000
```

## Acceptance Criteria

From KUC-10:
- [x] Flow is displayed on recipe detail page
- [x] Interaction works (zoom, pan, click)
- [ ] Responsive design
- [ ] Export function (PNG/PDF)

## Important Notes

1. **React Flow Limitations**: React Flow has NO native swimlane support. Lanes must be simulated using fixed Y-positions, visual backgrounds, or group nodes.

2. **Alternative Consideration**: For true BPMN-style swimlanes, consider switching to bpmn-js or JsPlumb in the future.

3. **MVP Approach**: For KUC-10 (recipe detail view), the flow visualization is implemented using React Flow with custom nodes. For KUC-1 (recipe editor), use the current implementation as a reference.

4. **State Management**: Consider using Zustand for managing flow state (nodes, edges, lanes) with undo/redo support.

## Development Setup

### Node.js Version
This project requires Node.js 24 (or 22). Use nvm to manage versions:
```bash
nvm use 24
```

### npm install Issues
If `npm install` doesn't install devDependencies (eslint, husky, etc.), use:
```bash
npm install --include=dev
```

This is needed when npm's `save-dev` config is set to `false` or when dependencies appear missing after installation.

### Husky Setup
Husky is configured with a pre-commit lint hook (`.husky/pre-commit`). After cloning, run:
```bash
npm install
npx husky install
```
Or simply ensure `npm install --include=dev` is used. The `prepare` script in package.json should handle this automatically.

