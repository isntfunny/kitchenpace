# KitchenPace - Agents Documentation

## Project Overview

**KitchenPace** (also branded as "KüchenTakt") is a recipe application that transforms traditional linear recipes into **interactive, visual flow diagrams**. The core vision is to help users manage complex cooking processes by visualizing parallel tasks, dependencies, and timing.

The app takes the stress out of multi-tasking in the kitchen by showing:

- What can be done in parallel
- The critical path (what must happen first)
- Timing and dependencies between steps
- Visual representation of each cooking action

## Technology Stack

| Category         | Tech Stack                                                                        |
| ---------------- | --------------------------------------------------------------------------------- |
| **Framework**    | Next.js 16 (App Router)                                                           |
| **UI Library**   | Radix UI + Panda CSS + Framer Motion                                              |
| **Database**     | Prisma 7 + PostgreSQL                                                             |
| **Flow Editor**  | React Flow (@xyflow/react v12) + Dagre auto-layout                                |
| **Styling**      | Panda CSS (semantic dark-mode tokens)                                             |
| **Language**     | TypeScript                                                                        |
| **User Auth**    | Logto                                                                             |
| **Search**       | OpenSearch (recipes + ingredients + tags indices)                                 |
| **Queue / Jobs** | BullMQ + Redis (ioredis)                                                          |
| **AI**           | OpenAI (gpt-5.4 for recipe import, omni-moderation-latest for content moderation) |
| **Realtime**     | SSE via Redis pub/sub                                                             |
| **Storage**      | S3 / MinIO                                                                        |
| **Scraper**      | Python FastAPI + Scrapling/Camoufox                                               |
| **Monitoring**   | Seq (winston-seq-updated), Sentry                                                 |

---

## Routes Overview

### Public Pages

```
/                              Home page (hero, trending, categories)
/recipes                       Recipe browse / search (OpenSearch)
/category/[slug]               Themed category landing page
/recipe/[id]                   Recipe detail (flow viewer, ratings, comments)
/recipe/[id]/mobile            Mobile recipe view (Chromecast target)
/user/[id]                     Public user profile (lookup by slug or ID)
/cast/receiver                 Google Cast Web Receiver
/sitemap.xml                   Dynamic sitemap
/robots.txt                    Robots.txt
```

### Authentication

```
/auth/signin                   Login
/auth/register                 Registration (Turnstile captcha)
/auth/activate                 Email activation
/auth/resend-activation        Resend activation
/auth/forgot-password          Password recovery
/auth/new-password             Reset password
/auth/password/edit            Change password (logged-in)
/auth/error                    Auth error
/banned                        Ban notification page
```

### Authenticated User

```
/profile                       My public profile
/profile/edit                  Edit profile
/profile/settings              Privacy / notification settings
/profile/favorites             My favorites
/profile/recipes               My recipes (TanStack Table)
/profile/images                My cook images
/notifications                 Notification feed
/recipe/create                 Create recipe (flow editor)
/recipe/create/import          AI recipe import from URL
/recipe/[id]/edit              Edit existing recipe
```

### Moderator / Admin

```
/moderation                    Moderation queue, reports, history
/admin                         Admin dashboard
/admin/accounts                User management, ban/unban
/admin/recipes                 Recipe management
/admin/categories              Category CRUD
/admin/tags                    Tag management
/admin/ingredients             Ingredient management
/admin/imports                 AI import run history
/admin/worker                  BullMQ job queue monitoring
```

### API Routes

```
POST   /api/upload                     S3 file upload + image moderation
POST   /api/ai/analyze-recipe          AI text → structured recipe
POST   /api/ai/import-stream           Streaming AI import (SSE)
GET    /api/recipes/filter             OpenSearch full-text + faceted search
GET    /api/recipes/suggest            Autocomplete for tags/ingredients
GET    /api/notifications/stream       User notification SSE
GET    /api/admin/notifications/stream Admin notification SSE
GET    /api/activity/stream            Activity feed SSE
GET    /api/og/category/[slug]         Dynamic OG image generation
POST   /api/recipe-tabs                Pinned recipe tabs API
POST   /api/scrape                     Recipe URL scraping proxy
POST   /api/scrape/stream              Streaming scrape (SSE)
GET    /api/thumbnail                  Thumbnail generation
POST   /api/profile/check-nickname     Nickname availability check
```

---

## BullMQ Workers & Job Queue

### Architecture

The worker is a standalone Node.js process (`worker/entrypoint.ts`) separate from Next.js. It connects to Redis (ioredis) and processes jobs from three BullMQ queues.

### Queues

| Queue        | Purpose               | Concurrency | Rate Limit |
| ------------ | --------------------- | ----------- | ---------- |
| `opensearch` | Search index sync     | 5           | 10/1000ms  |
| `scheduled`  | Recurring maintenance | 5           | 10/1000ms  |
| `backup`     | Database backups      | 1           | 1/60s      |

### Jobs

| Job                      | Queue      | Schedule     | What it does                                                                      |
| ------------------------ | ---------- | ------------ | --------------------------------------------------------------------------------- |
| `sync-recipes`           | opensearch | Every 15 min | Incremental recipe sync (watermark-based)                                         |
| `sync-ingredients`       | opensearch | Every 1h     | Incremental ingredient sync                                                       |
| `sync-tags`              | opensearch | Every 1h     | Incremental tag sync                                                              |
| `sync-recipe`            | opensearch | On-demand    | Single recipe upsert/delete after publish/update                                  |
| `trending-recipes`       | scheduled  | Daily 06:00  | Weighted trending score: cooks (8pt), ratings (6pt), favorites (4pt), views (2pt) |
| `sync-contacts-notifuse` | scheduled  | Every 6h     | Sync user contacts to email service                                               |
| `backup-database-hourly` | scheduled  | Every 1h     | Enqueues hourly backup job                                                        |
| `backup-database-daily`  | scheduled  | Daily 02:00  | Enqueues daily backup job                                                         |
| `purge-thumbnail-cache`  | scheduled  | Every 1h     | Clean S3 cache objects older than 3 days                                          |
| `database-backup`        | backup     | On-demand    | `pg_dump` → S3 upload → retention cleanup                                         |

### Backup Processor

1. Runs `pg_dump` with custom (compressed) format
2. Streams upload to S3 (`backups/database/{hourly|daily}/`)
3. Cleans local backups (hourly: 24h retention)
4. Cleans cloud backups (hourly: 7 days, daily: 30 days)
5. Deletes local file

### OpenSearch Sync (Watermark Pattern)

- Stores last-synced timestamp in Redis (`opensearch:watermark:recipes`, `opensearch:watermark:ingredients`, `opensearch:watermark:tags`)
- Queries only records changed since watermark
- Paginates in batches (default 150 recipes, 500 ingredients/tags)
- First run = full sync (no watermark)

### Job Run Tracking

Every job execution creates a `JobRun` DB record with status (PENDING → PROCESSING → COMPLETED/FAILED), payload, result, timing, and error info. Visible in `/admin/worker` dashboard.

### Admin Worker Dashboard

- Queue health cards (waiting, active, failed, worker count)
- Job catalog sidebar with trigger forms (manual execution)
- Live job runs feed (polling every 3s)
- Success rate stats

### Key Files

| What                 | Path                                    |
| -------------------- | --------------------------------------- |
| Worker entrypoint    | `worker/entrypoint.ts`                  |
| Queue definitions    | `worker/queues/queue.ts`                |
| Job types            | `worker/queues/types.ts`                |
| Scheduler (cron)     | `worker/queues/scheduler.ts`            |
| Worker bootstrap     | `worker/queues/worker.ts`               |
| OpenSearch processor | `worker/queues/opensearch-processor.ts` |
| Scheduled processor  | `worker/queues/scheduled-processor.ts`  |
| Backup processor     | `worker/queues/backup-processor.ts`     |
| Job run tracking     | `worker/queues/job-run.ts`              |
| Queue insights       | `worker/queues/insights.ts`             |
| Redis connection     | `worker/queues/connection.ts`           |
| Public enqueue API   | `worker/queues/index.ts`                |

---

## OpenAI Usage

### 1. AI Recipe Import (gpt-5.4)

Converts unstructured recipe text or scraped URLs into structured flow diagrams.

**Pipeline:** URL → Python scraper → Markdown → OpenAI (structured JSON) → Flow nodes/edges

**Configuration:**

- Model: `gpt-5.4` (temperature 0.1, strict JSON mode)
- Pricing: Input $2.50/1M, cached $0.25/1M, output $15.00/1M tokens
- System prompt: ~130 lines in German covering ingredient parsing, flow node generation, edge validation

**Step Types (AI schema + editor must stay in sync):**
`start | schneiden | kochen | braten | backen | mixen | warten | wuerzen | anrichten | servieren`

**AI Conversion Dialog (FlowEditor):**

1. **Input** — user pastes recipe text
2. **Processing** — animated step log
3. **Review** — toggles for which fields to apply (title, description, category, tags, ingredients, flow)
4. **Apply** — creates nodes, runs `autoLayoutAndFit()` via Dagre

**Import from URL:**

1. `scrapeRecipe()` calls Python scraper at `SCRAPLER_URL` (timeout 120s)
2. `analyzeWithAI()` sends markdown + DB context (existing tags, top 100 ingredients)
3. `transformImportedRecipe()` maps AI IDs to real IDs, resolves `@mentions`
4. Logs `ImportRun` record (model, tokens, cost, status)

**Fallback:** On AI failure, uses `parseRecipeMarkdownFallback()` so user can still edit manually.

### 2. Content Moderation (omni-moderation-latest)

Free, multi-modal moderation API for text and images. See Content Moderation section below.

### Key Files

| What                              | Path                                                  |
| --------------------------------- | ----------------------------------------------------- |
| OpenAI client (singleton)         | `src/lib/importer/openai-client.ts`                   |
| Recipe JSON schema (Zod + strict) | `src/lib/importer/openai-recipe-schema.ts`            |
| Import server actions             | `src/app/recipe/create/import/actions.ts`             |
| Import UI                         | `src/app/recipe/create/import/ImportRecipeClient.tsx` |
| Analyze-recipe API                | `src/app/api/ai/analyze-recipe/route.ts`              |
| Streaming import API              | `src/app/api/ai/import-stream/route.ts`               |
| AI conversion dialog              | `src/components/flow/editor/AiConversionDialog.tsx`   |
| Client-side AI wrapper            | `src/lib/importer/ai-text-analysis.ts`                |
| Ingredient mention resolver       | `src/lib/importer/resolve-mentions.ts`                |
| Types                             | `src/lib/importer/types.ts`                           |

### Python Scraper Service

| What     | Detail                                |
| -------- | ------------------------------------- |
| Stack    | Python FastAPI + Scrapling + Camoufox |
| Port     | 34215 (mapped from container 8000)    |
| Env var  | `SCRAPLER_URL=http://localhost:34215` |
| Location | `services/scraper/`                   |
| CI/CD    | `.github/workflows/scraper-image.yml` |

---

## Content Moderation

### Overview

Complete moderation system: AI-powered auto-moderation, human review queue, user reporting, ban system, and audit trail.

### AI Moderation (OpenAI omni-moderation-latest)

- **Free** and **multi-modal** (text + images)
- Returns category scores (0.0–1.0) per category
- Decision thresholds (env-configurable):

| Score     | Decision      | Action                                       |
| --------- | ------------- | -------------------------------------------- |
| < 0.40    | AUTO_APPROVED | Saved normally                               |
| 0.40–0.84 | PENDING       | Forced to DRAFT, queued for moderator review |
| >= 0.85   | REJECTED      | Blocked (images deleted from S3)             |

- On API error: defaults to AUTO_APPROVED (doesn't block users)

### Text Moderation (Recipe Create/Update)

1. `extractRecipeText()` concatenates title + description + node labels + node descriptions
2. `moderateContent({ text })` calls OpenAI
3. REJECTED → error, content not saved
4. PENDING → forces DRAFT, sets `moderationStatus=PENDING`
5. AUTO_APPROVED → saves with `moderationStatus=AUTO_APPROVED`
6. `persistModerationResult()` creates audit trail in `ModerationQueue`

### Image Moderation (Upload)

1. File uploaded to S3
2. `moderateContent({ imageUrl })` called
3. REJECTED → file deleted from S3 immediately, error returned
4. PENDING → kept, queued for review
5. AUTO_APPROVED → available immediately

### Moderation Queue UI (`/moderation`)

Three tabs:

- **Queue** — PENDING items with AI score badges, approve/reject actions, detail dialogs with category score breakdown + content snapshot + raw AI response
- **Reports** — User-submitted reports with reason badges, resolve action
- **History** — Audit trail of all manual + auto decisions

### Reporting System

- `ReportButton` + `ReportModal` on recipes, comments, users, cook images
- Reasons: Spam, NSFW, Hate speech, Misinformation, Other
- Unique constraint: one report per user per content item
- **Auto-escalation:** 3+ reports auto-create PENDING `ModerationQueue` entry

### Ban System

- Roles: `USER | MODERATOR | ADMIN | BANNED`
- `banUser()`: sets `role=BANNED`, stores reason/expiry, invalidates all sessions
- `unbanUser()`: restores previous role from `ModerationLog` metadata
- Middleware enforces ban on every request → redirects to `/banned`
- `/banned` page shows reason and expiry

### Turnstile Captcha

- Cloudflare Turnstile (invisible) on registration
- Client: `TurnstileWidget` component
- Server: validates token via `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Env: `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`

### Key Files

| What                    | Path                                                          |
| ----------------------- | ------------------------------------------------------------- |
| Moderation service      | `src/lib/moderation/moderationService.ts`                     |
| Types                   | `src/lib/moderation/types.ts`                                 |
| Thresholds              | `src/lib/moderation/thresholds.ts`                            |
| Recipe text moderation  | `src/components/recipe/createActions.ts`                      |
| Image upload moderation | `src/app/api/upload/route.ts`                                 |
| Mod queue page          | `src/app/moderation/page.tsx`                                 |
| Mod queue actions       | `src/app/moderation/actions.ts`                               |
| Queue table             | `src/app/moderation/moderation-queue-table.tsx`               |
| Reports table           | `src/app/moderation/reports-table.tsx`                        |
| History table           | `src/app/moderation/moderation-history-table.tsx`             |
| Report button/modal     | `src/components/features/ReportButton.tsx`, `ReportModal.tsx` |
| Report server action    | `src/app/actions/reports.ts`                                  |
| Ban/unban actions       | `src/app/admin/accounts/actions.ts`                           |
| Banned page             | `src/app/banned/page.tsx`                                     |
| Turnstile widget        | `src/components/features/TurnstileWidget.tsx`                 |
| Moderator guard         | `src/lib/admin/ensure-moderator.ts`                           |

---

## Realtime (SSE + Redis Pub/Sub)

### Architecture

Redis pub/sub powers server-sent events for live updates. `clientStream.ts` pools a single EventSource connection per channel (ref-counted via `globalThis`).

### Channels

| Channel                   | SSE Endpoint                      | Used for                                  |
| ------------------------- | --------------------------------- | ----------------------------------------- |
| `notifications:user:{id}` | `/api/notifications/stream`       | User notifications (replaces SWR polling) |
| `admin-notifications`     | `/api/admin/notifications/stream` | Mod queue + report alerts                 |
| `activity:global`         | `/api/activity/stream`            | Global activity feed                      |
| `activity:user:{id}`      | `/api/activity/stream`            | User-specific activity feed               |

### Key Files

| What                       | Path                               |
| -------------------------- | ---------------------------------- |
| Broker (publish/subscribe) | `src/lib/realtime/broker.ts`       |
| Client stream manager      | `src/lib/realtime/clientStream.ts` |
| Redis connection           | `src/lib/realtime/redis.ts`        |
| Cursor tracking            | `src/lib/realtime/cursor.ts`       |

---

## Google Cast (Chromecast)

### Flow

1. **Sender (recipe page):** `useCast()` hook initializes Cast SDK, `CastButton` shows status
2. **Message:** sends `{ type: 'LOAD_RECIPE', slug }` on namespace `urn:x-cast:de.kuechentakt.recipe`
3. **Receiver (`/cast/receiver`):** loads Cast Receiver SDK, renders `/recipe/[slug]/mobile` in fullscreen iframe
4. **Touch hack:** removes Cast's `<touch-controls>` overlay on Nest Hub for direct iframe interaction

### Key Files

| What               | Path                                  |
| ------------------ | ------------------------------------- |
| Cast hook          | `src/hooks/useCast.ts`                |
| Cast button        | `src/components/cast/CastButton.tsx`  |
| Receiver page      | `src/app/cast/receiver/page.tsx`      |
| Mobile recipe view | `src/app/recipe/[id]/mobile/page.tsx` |

---

## Category System

- **PaletteColor enum:** `orange | gold | emerald | purple | blue | pink`
- DB fields: `name`, `slug`, `color` (PaletteColor), `icon` (Lucide name), `coverImageKey`, `sortOrder`
- Themed landing pages at `/category/[slug]` with sections: newest, top-rated, most-cooked, quick (<30min), popular
- Dynamic OG images via `/api/og/category/[slug]`
- Admin CRUD at `/admin/categories`

---

## Profile Slugs

- `Profile.slug` auto-generated from nickname (German: ae/oe/ue/ss mapping)
- Dual lookup: routes accept slug OR ID for backwards compatibility
- All user/author links now use slugs
- Activity feeds and notifications enriched with slug metadata

---

## OpenSearch Integration

### Indices

| Index         | Key Mappings                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `recipes`     | title (text+keyword), description, category, tags, ingredients, difficulty, totalTime, rating, cookCount, publishedAt |
| `ingredients` | name (text+keyword), slug, category, units, keywords                                                                  |
| `tags`        | name (text+keyword), slug, keywords                                                                                   |

### Search Features (via `/api/recipes/filter`)

- Multi-match: `title^3, description, keywords, ingredients^2` (fuzziness: AUTO)
- Meal time slots: morgen (0-25m), mittag (20-45m), nachmittag (25-60m), abend (30-90m), snack (0-20m)
- Range filters: time, rating, cook count
- Ingredient inclusion/exclusion with AND/OR
- Aggregations: tags, ingredients, difficulties, categories

---

## Flow Editor Architecture

- `NODE_TYPES = { recipeStep: RecipeNode }` is a **module-level constant** (never recreated)
- `FlowEditorContext` provides `availableIngredients`, `onSelectNode`, `onDeleteNode`
- NodeEditPanel receives `key={selectedNode.id}` — remounts fresh on node switch
- `onChange` stored in `useRef` to avoid stale closures
- `handleNodesChange` uses `queueMicrotask` to notify parent after xyflow processes
- Auto-layout uses `getNodes()`/`getEdges()` from `useReactFlow()` for clean state access
- `autoLayoutAndFit()` is the canonical way to set nodes+edges+layout+notify parent

### RecipeForm Auto-save

- `flowNodesRef`/`flowEdgesRef` store flow state in refs (no re-renders)
- Debounced 2.5s on any field change
- First save creates recipe + replaces URL with `/recipe/[id]/edit`
- Subsequent saves call `updateRecipe`
- Auto-save **disabled** for published recipes

### Key Files

| What                          | Path                                                |
| ----------------------------- | --------------------------------------------------- |
| Flow editor (main)            | `src/components/flow/FlowEditor.tsx`                |
| Editor types                  | `src/components/flow/editor/editorTypes.ts`         |
| RecipeNode                    | `src/components/flow/editor/RecipeNode.tsx`         |
| NodeEditPanel                 | `src/components/flow/editor/NodeEditPanel.tsx`      |
| NodePalette                   | `src/components/flow/editor/NodePalette.tsx`        |
| DescriptionEditor (@mentions) | `src/components/flow/editor/DescriptionEditor.tsx`  |
| FlowEditorContext             | `src/components/flow/editor/FlowEditorContext.ts`   |
| Dagre auto-layout hook        | `src/components/flow/editor/useFlowAutoLayout.ts`   |
| AI conversion dialog          | `src/components/flow/editor/AiConversionDialog.tsx` |
| Recipe form                   | `src/components/recipe/RecipeForm.tsx`              |
| Create/Update actions         | `src/components/recipe/createActions.ts`            |
| RecipeStepsViewer             | `src/components/flow/RecipeStepsViewer.tsx`         |
| Viewer components             | `src/components/flow/viewer/`                       |

---

## Data Models (Key Enums)

```
Role:              USER | MODERATOR | ADMIN | BANNED
Difficulty:        EASY | MEDIUM | HARD
RecipeStatus:      DRAFT | PUBLISHED | ARCHIVED
ModerationStatus:  APPROVED | PENDING | REJECTED | AUTO_APPROVED
MealType:          BREAKFAST | LUNCH | DINNER | SNACK
PaletteColor:      orange | gold | emerald | purple | blue | pink

StepTypes (AI + editor):
  start | schneiden | kochen | braten | backen | mixen | warten | wuerzen | anrichten | servieren

ActivityType:
  RECIPE_CREATED | RECIPE_COOKED | RECIPE_RATED | RECIPE_COMMENTED |
  RECIPE_FAVORITED | RECIPE_UNFAVORITED | USER_FOLLOWED | USER_REGISTERED |
  USER_ACTIVATED | MEAL_PLAN_CREATED | SHOPPING_LIST_CREATED

NotificationType:
  NEW_FOLLOWER | RECIPE_LIKE | RECIPE_COMMENT | RECIPE_RATING |
  RECIPE_COOKED | RECIPE_PUBLISHED | WEEKLY_PLAN_REMINDER | SYSTEM
```

---

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run lint:fix     # Auto-fix linting issues
```

## Git & Branch Rules

- **live** accepts only squash merges. Keep history linear and avoid merge commits.
- Every commit merged into **live** must contain the project changelog entry. The first line must be a compact summary of the biggest changes and state whether the branch is predominately a `feat` or `fix` (e.g., `feat: Big-picture automation for scheduled backups`).
- Ensure changelog entries describe the user-visible impact, not implementation minutiae.
- These rules should also guide `main` when preparing a release into `live`.

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=secret

# OpenSearch
OPENSEARCH_URL=http://opensearch:9200

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...              # optional

# S3 / MinIO
S3_ENDPOINT=http://minio:9000
S3_BUCKET=kitchenpace
S3_ACCESS_KEY=...
S3_SECRET=...

# Scraper
SCRAPLER_URL=http://localhost:34215

# Backups
BACKUP_DIR=/app/backups

# Moderation thresholds (optional overrides)
MODERATION_TEXT_THRESHOLD_REJECT=0.85
MODERATION_TEXT_THRESHOLD_REVIEW=0.40

# Cloudflare Turnstile
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=...
CLOUDFLARE_TURNSTILE_SECRET_KEY=...

# Google Cast
NEXT_PUBLIC_CAST_APP_ID=CC1AD845
```

## Docker Compose Services

| Service    | Port  | Purpose                |
| ---------- | ----- | ---------------------- |
| postgres   | 64000 | Database               |
| redis      | 62984 | Cache, queues, pub/sub |
| opensearch | 9200  | Full-text search       |
| app        | 3000  | Next.js application    |
| worker     | —     | BullMQ job processor   |
| scraper    | 34215 | Python recipe scraper  |

## Development Setup

### Prisma 7 Configuration

Prisma 7 requires a **driver adapter** (`@prisma/adapter-pg` + `pg`) and a `prisma.config.ts` file. The `datasource` block in `schema.prisma` should NOT include `url` — it's in `prisma.config.ts`.

### Husky

Pre-commit lint hook in `.husky/pre-commit`. After cloning: `npm install --include=dev`.

### Import Alias

- `@app/*` → `./src/*`
- `@shared/*` → `./shared/*`
