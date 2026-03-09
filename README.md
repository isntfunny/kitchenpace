# KitchenPace - Vom Chaos zur Klarheit

Stell dir vor, du öffnest ein Rezept und siehst nicht mehr diese endlose, ermüdende Liste von Schritten, die dich durch einen linearen Prozess zwingen. Stattdessen erblickst du eine **lebendige, fließende Visualisierung** deines gesamten Kochprozesses - wie eine Choreographie, wie ein Tanz in der Küche.

## Die Vision

Jeder kennt es: Du stehst in der Küche, drei Töpfe brodeln, der Timer piept, du weißt nicht mehr, was als nächstes kommt, und plötzlich brennt die Sauce an, während das Gemüse noch roh ist. **Kochen fühlt sich oft wie kontrolliertes Chaos an**.

**KitchenPace** verwandelt dieses Chaos in **kristallklare Struktur**. Es nimmt die Komplexität des gleichzeitigen Kochens und macht sie _sichtbar_, _verständlich_, _beherrschbar_.

### Das Chaos beherrschen

Traditionelle Rezepte sind wie eine To-Do-Liste ohne Prioritäten. Sie geben dir nicht das große Bild. Du stolperst von Schritt zu Schritt und merkst zu spät: "Oh, das hätte ich vor 20 Minuten vorbereiten sollen!"

**KitchenPace zeigt dir von Anfang an die gesamte Landschaft**:

- **Überblick statt Überforderung**: Du siehst _sofort_, was parallel läuft, was aufeinander wartet, wo die Engpässe sind
- **Mentale Klarheit**: Dein Gehirn muss nicht mehr jonglieren und improvisieren - der Flow ist bereits durchdacht
- **Kontrolle zurückgewinnen**: Keine Panik mehr, kein "Oh nein, ich hab vergessen...!" - alles hat seinen Platz, seinen Moment

### Was macht es so besonders?

Jedes Rezept wird zu einer **visuellen Landkarte deines Kochabenteuers**:

- **Parallele Welten werden sichtbar**: Die Sauce reduziert sich? Perfekt - die Visualisierung zeigt dir _genau_, was du in dieser Zeit parallel erledigen kannst.
- **Struktur in der Gleichzeitigkeit**: Was früher ein mentales Puzzle war - "Wann muss ich was starten, damit alles gleichzeitig fertig ist?" - wird zur klaren, visuellen Wahrheit.
- **Der kritische Pfad wird erkennbar**: Wie bei einem Projektplan siehst du: _Das_ ist der zeitkritische Strang. _Hier_ muss ich aufmerksam sein, _dort_ kann ich entspannen.
- **Intuitive Nodes**: Jede Aktion hat ihr eigenes visuelles Symbol. "Würzen" sieht anders aus als "Köcheln lassen" oder "Scharf anbraten". Dein Gehirn erfasst den Flow sofort.
- **Der große Moment**: Alle Verzweigungen münden am Ende in diesem einen, magischen Punkt - dem fertigen Gericht.

## Tech Stack

| Category     | Technology                                             |
| ------------ | ------------------------------------------------------ |
| Framework    | Next.js 16 (App Router)                                |
| UI           | Radix UI + Panda CSS + Framer Motion                   |
| Database     | Prisma 7 + PostgreSQL                                  |
| Flow Editor  | React Flow (@xyflow/react v12) + Dagre                 |
| Search       | OpenSearch                                             |
| Queue / Jobs | BullMQ + Redis                                         |
| AI           | OpenAI (gpt-5.4 recipe import, omni-moderation-latest) |
| Realtime     | SSE via Redis pub/sub                                  |
| Storage      | S3 / MinIO                                             |
| Scraper      | Python FastAPI + Scrapling/Camoufox                    |
| Auth         | Logto                                                  |

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose

### Development

```bash
# Start all services (PostgreSQL, Redis, OpenSearch, MinIO)
docker compose up -d

# Install dependencies
npm install --include=dev

# Run database migrations
npx prisma migrate deploy

# Start dev server at http://localhost:3000
npm run dev
```

### Fresh Development Build

For standalone builds with a clean database:

```bash
npm run build:dev-seed
```

Sets `DEBUG=1`, runs a production build, then truncates and reseeds the database.

## Docker Compose Services

| Service    | Port  | Purpose                |
| ---------- | ----- | ---------------------- |
| postgres   | 64000 | Database               |
| redis      | 62984 | Cache, queues, pub/sub |
| opensearch | 9200  | Full-text search       |
| app        | 3000  | Next.js application    |
| worker     | —     | BullMQ job processor   |
| scraper    | 34215 | Python recipe scraper  |

## Key Features

### Flow Editor

Visual recipe editor powered by React Flow. Recipes are modeled as directed graphs with typed step nodes (schneiden, kochen, braten, backen, mixen, warten, wuerzen, anrichten, servieren) and edges representing dependencies. Dagre handles automatic layout.

### AI Recipe Import

Paste a URL or raw text and let AI (gpt-5.4) convert it into a structured flow diagram. The Python scraper fetches and cleans the source, OpenAI parses it into nodes/edges with strict JSON schema validation, and the result loads directly into the flow editor.

### Content Moderation

AI-powered auto-moderation (OpenAI omni-moderation-latest, free & multi-modal) with configurable thresholds. Content scoring below 0.40 is auto-approved, 0.40-0.84 is queued for human review, and 0.85+ is auto-rejected. Includes moderator queue UI, user reporting with auto-escalation, and a ban system.

### Real-time Updates

Redis pub/sub powers SSE streams for live notifications, activity feeds, and moderator alerts. Replaces polling with instant delivery.

### Google Cast (Chromecast)

Cast any recipe to a TV or Nest Hub. The sender transmits the recipe slug, and the Cast receiver renders a fullscreen mobile-optimized view.

### Search

OpenSearch indices for recipes and ingredients with full-text search, faceted filtering (tags, ingredients, difficulty, time ranges, meal slots), and autocomplete suggestions.

### Background Jobs (BullMQ)

Standalone worker process with three queues: OpenSearch sync (watermark-based incremental), scheduled maintenance (trending calculation, contact sync, cache purge), and database backups (pg_dump to S3 with retention policies).

## Git & Release Discipline

- The `live` branch receives only **squash merges** so its history stays linear and clean.
- Every merge commit targeting `live` must include a changelog entry describing user-visible impact.
- The **first line** of the commit message must be a compact summary prefixed with the predominant type (`feat`/`fix`/`chore`).

## Email Templates (MJML)

Email templates in `lib/email-templates/mjml/` use MJML format with Liquid templating for Notifuse integration.

### Liquid Variable Reference

#### Contact Variables

| Variable                   | Description          |
| -------------------------- | -------------------- |
| `{{ contact.first_name }}` | User's first name    |
| `{{ contact.last_name }}`  | User's last name     |
| `{{ contact.email }}`      | User's email address |

#### System URLs

| Variable                         | Description               |
| -------------------------------- | ------------------------- |
| `{{ unsubscribe_url }}`          | Unsubscribe link          |
| `{{ confirm_subscription_url }}` | Subscription confirmation |
| `{{ notification_center_url }}`  | Notification preferences  |

#### Template Variables (generic.mjml)

| Variable           | Description                            |
| ------------------ | -------------------------------------- |
| `{{{ subject }}}`  | Email subject (triple braces for HTML) |
| `{{{ message }}}`  | Main content (triple braces for HTML)  |
| `{{ buttonText }}` | Button text (optional)                 |
| `{{ buttonLink }}` | Button URL (optional)                  |
