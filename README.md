# KitchenPace

KitchenPace ("KochTakt") ist eine Rezept-App, die klassische Schritt-für-Schritt-Rezepte in visuelle Kochabläufe übersetzt. Statt einer langen Liste sehen Nutzer:innen, was parallel passieren kann, welche Schritte voneinander abhängen und wo der kritische Pfad liegt.

## Warum es das Projekt gibt

Normale Rezepte erklären oft nur die Reihenfolge, aber nicht die Koordination. Genau das wird beim gleichzeitigen Kochen zum Problem.

KitchenPace löst das in drei Ebenen:

- Rezepte werden als Flow-Diagramm dargestellt statt nur als Textblock.
- Parallele Arbeitsschritte und Wartezeiten werden sichtbar.
- Import, Moderation, Suche und Realtime-Funktionen machen aus dem Editor eine komplette Plattform statt nur ein Flow-Spielzeug.

## Produkt in einem Satz

Eine visuelle Rezeptplattform mit Flow-Editor, KI-Import, Suche, Moderation, Realtime-Feeds und Hintergrundjobs.

## Kernfunktionen

- Flow-Editor für interaktive Rezeptabläufe mit `@xyflow/react` und Dagre-Autolayout
- KI-Import aus Freitext oder URL via OpenAI + Python-Scraper
- Rezeptsuche mit OpenSearch, Facetten, Zeitfiltern und Zutatenfiltern
- Content-Moderation für Texte und Bilder
- Realtime-Benachrichtigungen und Aktivitätsfeed via SSE + Redis
- Google Cast für die mobile Rezeptansicht auf TV/Nest Hub
- Worker-Prozesse für Search-Sync, Trending, Wartung und Backups

## Tech Stack

| Bereich    | Stack                                      |
| ---------- | ------------------------------------------ |
| Frontend   | Next.js 16, React 19, TypeScript           |
| UI         | Panda CSS, Radix UI, Framer Motion         |
| Flow       | `@xyflow/react`, Dagre                     |
| Datenbank  | Prisma 7, PostgreSQL                       |
| Suche      | OpenSearch                                 |
| Realtime   | SSE, Redis Pub/Sub                         |
| Jobs       | BullMQ, Redis                              |
| KI         | OpenAI `gpt-5.4`, `omni-moderation-latest` |
| Storage    | S3 / MinIO                                 |
| Scraping   | Python FastAPI + Scrapling/Camoufox        |
| Auth       | NextAuth                                   |
| Monitoring | Sentry, Seq, OpenPanel                     |

## So ist das Projekt aufgebaut

### 1. App-Layer: Routen und Serverlogik

`src/app/` enthält die App-Router-Struktur, Seiten, API-Routen und Server Actions.

- `src/app/page.tsx` - Startseite
- `src/app/recipes/` - Suche und Browse-Ansicht
- `src/app/recipe/` - Anzeigen, Erstellen, Bearbeiten, mobile View
- `src/app/profile/`, `src/app/user/` - Profilbereiche
- `src/app/admin/`, `src/app/moderation/` - Admin- und Moderationsoberflächen
- `src/app/api/` - Upload, AI, Search, SSE, Thumbnail, Scrape, Push usw.
- `src/app/actions/` - wiederverwendbare Server Actions für Features

### 2. Komponenten-Layer

`src/components/` ist sauber nach Verantwortung aufgeteilt.

#### React Atoms

Die Atoms bilden die kleinsten wiederverwendbaren UI-Bausteine und sind eine gute erste Anlaufstelle für UI-Konsistenz.

- `src/components/atoms/Avatar.tsx` - Avatar mit Bild, Fallbacks, Trophy-Badge und Ring-Varianten
- `src/components/atoms/Badge.tsx` - einfache Label-/Status-Badges
- `src/components/atoms/Button.tsx` - kleine generische Button-Abstraktion für einfache CTA-Fälle
- `src/components/atoms/Skeleton.tsx` - Lade-Platzhalter mit Pulse-Animation
- `src/components/atoms/SmartImage.tsx` - Thumbnail-/Fallback-Logik für Rezept- und Userbilder
- `src/components/atoms/SparkleEffect.tsx` - dekorativer Partikeleffekt für Interaktionen
- `src/components/atoms/Typography.tsx` - `Heading` und `Text` als typografische Basis

#### Provider und "Stores"

Es gibt aktuell keinen grossen zentralen Global Store im klassischen Zustand-/Redux-Sinn. Der State ist aufgeteilt in React Context, lokale Hooks, Refs und komponenteninterne Reducer.

- `src/components/providers/AuthProvider.tsx` - kapselt NextAuth und validiert Sessions
- `src/components/providers/FeatureFlagsProvider.tsx` - stellt Feature Flags bereit und sendet Telemetrie an OpenPanel/Sentry
- `src/components/providers/ProfileProvider.tsx` - leichtgewichtiger Profil-Context für Avatar/Nickname
- `src/components/providers/RecipeTabsProvider.tsx` - verwaltet gepinnte/kürzlich betrachtete Rezepte inkl. LocalStorage-Migration
- `src/components/providers/ThemeProvider.tsx` - Theme-Zustand mit Persistenz in `localStorage`
- `src/components/providers/ToastProvider.tsx` - clientseitiger Toast-"Store" inkl. SSE-Events
- `src/components/providers/PageProgress.tsx` - Seitenladebalken
- `src/components/hooks/useRecipeTabs.ts` - Hook für den RecipeTabs-Context

#### Wichtige Feature-Komponenten

- `src/components/flow/FlowEditor.tsx` - Herzstück des Editors; verwaltet Nodes, Edges, Validation, AI-Apply und Layout
- `src/components/flow/RecipeStepsViewer.tsx` - Rezept-Viewer mit Fortschritt, Timern, LocalStorage/Redis-Persistenz und Cast-Unterstützung
- `src/components/recipe/RecipeForm.tsx` - Formular-Orchestrierung für Metadaten, Zutaten, Tags, Autosave und Flow-Editor
- `src/components/search/RecipeSearchClient.tsx` - zusammengesetzte Suchoberfläche mit Sidebar, Mobile Sheet, Result Grid und Pagination
- `src/components/features/Header.tsx` - globale Navigation, Header-Suche, Menü, Theme Toggle, Rezept-Tabs
- `src/components/notifications/NotificationsPageContent.tsx` - Notification-Ansicht mit Read-State und Push-Toggle

#### Weitere Komponentenbereiche

- `src/components/features/` - produktnahe UI-Bausteine wie `RecipeCard`, Header, Upload, Sharing, Tabs, Activity UI
- `src/components/search/` - alle Such-Hooks und Such-UI-Blöcke
- `src/components/recipe/` - Form, Tabellen, Ingredient-Search, Tutorial-Flow
- `src/components/flow/editor/` - Editor-spezifische Bausteine wie Node-Panel, AI-Dialog, Step-Config, Auto-Layout
- `src/components/flow/viewer/` - Desktop-, Mobile- und Textansicht für den Rezept-Viewer
- `src/components/layouts/` - Shells und Seitenlayouts
- `src/components/notifications/` - Dropdown, List Items, Hooks, Stream-Helfer
- `src/components/auth/`, `src/components/cast/`, `src/components/home/`, `src/components/sections/`, `src/components/motion/` - thematische Unterbereiche

### 3. Utilities, Helper und Domain-Logik

`src/lib/` ist die eigentliche technische Werkzeugkiste des Projekts. Dort liegt nicht nur "Kleinkram", sondern viel Kernlogik.

#### Kleine, allgemeine Helper

- `src/lib/slug.ts` - Slug-Erzeugung mit deutscher Umlaut-Normalisierung und Unique-Slug-Helper
- `src/lib/url.ts` - zentrale `APP_URL`
- `src/lib/format.ts` - Formatierung skalierter Zutatenmengen
- `src/lib/storageKeys.ts` - Registry für alle `localStorage`-Keys
- `src/lib/ingredient-display.ts` - Singular/Plural-Anzeige für Zutatenmengen

#### UI-nahe Mapper und Display-Helper

- `src/lib/recipe-card.ts` - mappt Prisma-Rezepte in UI-taugliche Card-Daten
- `src/lib/user-card.ts` - gemeinsames UserCard-Interface
- `src/lib/activity-utils.ts` - Aktivitäts-Mapping, Icon-Konfiguration und Zeitformatierung
- `src/lib/thumbnail-client.ts` - Thumbnail-URL- und `srcset`-Builder für den Client
- `src/lib/thumbnail.ts` - serverseitige Thumbnail-Auflösung aus Rezept, User oder Key
- `src/lib/palette.ts` - zentrale Farbpalette für UI und Statusdarstellungen

#### Search- und Filterlogik

- `src/lib/recipeFilters.ts` - parst Query-Parameter, baut Such-URLs und normalisiert Filterzustand
- `src/lib/recipeSearch.ts` - erzeugt OpenSearch-Queries, Sortierung, Aggregationen und Ergebnis-Mapping
- `shared/opensearch/client.ts` - OpenSearch-Client und Index-Konfiguration

#### Realtime, Events und Notifications

- `src/lib/realtime/broker.ts` - Publish/Subscribe-Abstraktion
- `src/lib/realtime/clientStream.ts` - ref-counted EventSource-Management im Client
- `src/lib/realtime/cursor.ts` - Stream-Cursor-Handling
- `src/lib/realtime/toastEvents.ts` - Toast-spezifische Stream-Helfer
- `src/lib/events/fire.ts` - feuert Domain-Events
- `src/lib/events/persist.ts` - persistiert Notifications und Activity Logs
- `src/lib/events/views.ts` - Hilfen für View-Events

#### AI- und Import-Pipeline

- `src/lib/importer/openai-client.ts` - zentrale OpenAI-Integration
- `src/lib/importer/openai-recipe-schema.ts` - striktes JSON-Schema für Rezeptimporte
- `src/lib/importer/pipeline.ts` - End-to-End-Import von Scrape -> Analyse -> Persistenz
- `src/lib/importer/scraper.ts` - Anbindung an den Python-Scraper
- `src/lib/importer/transform.ts` - Mapping AI-Output -> App-Datenmodell
- `src/lib/importer/resolve-mentions.ts` - Auflösung von Ingredient-Referenzen
- `src/lib/importer/ai-text-analysis.ts` - Client-/Server-Vertrag für AI-Analyseergebnisse

#### Moderation, Upload, Media

- `src/lib/moderation/moderationService.ts` - Text-/Bildmoderation über OpenAI
- `src/lib/moderation/thresholds.ts` - Schwellenwerte für Review/Reject
- `src/lib/upload/processUpload.ts` - Upload-Pipeline für Dateien
- `src/lib/image-approval.ts` - Bildfreigabelogik
- `src/lib/s3.ts`, `src/lib/s3/` - S3-/MinIO-Zugriff und Key-Handling

#### Feature Flags, Tracking und Telemetrie

- `src/lib/flags/config.ts`, `src/lib/flags/definitions.ts` - Flag-Definitionen und Konfiguration
- `src/lib/flags/server.ts` - serverseitiges Laden der Flags
- `src/lib/flags/telemetry.ts` - Aufbereitung für Monitoring/Analytics
- `src/lib/tracking.ts`, `src/lib/openpanel.ts` - Tracking-Helfer

#### Weitere fachliche Module

- `src/lib/qrupload/` - QR-basierter Upload-Flow mit JWT und Redis
- `src/lib/push/send.ts` - Web-Push Versand
- `src/lib/notifuse/email.ts` - Transaktionale E-Mails über Notifuse
- `src/lib/validation/flowValidation.ts` - fachliche Prüfung für Rezept-Graphen
- `src/lib/recipe-progress/redis.ts` - Persistenz des Viewer-Fortschritts
- `src/lib/trophies/registry.ts` - visuelle Registry für Trophy-Tiers
- `src/lib/seed.ts`, `src/lib/seed-basics.ts` - Seed-Skripte für Demo-/Basisdaten

### 4. Shared- und Backend-Infrastruktur

- `shared/prisma.ts` - Prisma Singleton
- `shared/logger.ts` - gemeinsamer Logger
- `worker/` - BullMQ Worker, Scheduler, Queue-Definitionen und Prozessoren
- `services/scraper/` - externer Python-Scraper für Rezeptimporte
- `email-templates/` - MJML + Push-Skripte für Mail-Templates
- `k6/` - Load-Tests
- `cli/` - lokales CLI (`npm run cli` bzw. `kitchen`)

## Wichtige Laufzeit-Systeme

### Flow Editor

Der Editor modelliert Rezepte als Graphen. Nodes repräsentieren Kochschritte wie `schneiden`, `kochen`, `braten` oder `servieren`, Edges repräsentieren Abhängigkeiten.

Wichtige Dateien:

- `src/components/flow/FlowEditor.tsx`
- `src/components/flow/editor/editorTypes.ts`
- `src/components/flow/editor/RecipeNode.tsx`
- `src/components/flow/editor/NodeEditPanel.tsx`
- `src/components/flow/editor/useFlowAutoLayout.ts`
- `src/lib/validation/flowValidation.ts`

### Rezeptformular und Autosave

`RecipeForm` hält Metadaten im Komponentenstate und den Flow-Zustand bewusst in Refs, damit Node-Aenderungen nicht die ganze Form neu rendern. Entwürfe werden automatisch gespeichert, veröffentlichte Rezepte nicht.

### Suche

Die Suche basiert auf OpenSearch und kombiniert Volltext, Aggregationen und Filter-URLs.

Wichtige Dateien:

- `src/components/search/useSearchFilters.ts`
- `src/components/search/useRecipeSearch.ts`
- `src/components/search/RecipeSearchClient.tsx`
- `src/lib/recipeFilters.ts`
- `src/lib/recipeSearch.ts`

### AI-Import

Import-Flow:

1. URL oder Rohtext erfassen
2. Python-Scraper bereinigt die Quelle
3. OpenAI wandelt den Inhalt in ein strukturiertes Rezept um
4. Transform-Schicht mappt das Ergebnis auf echte App-Daten
5. Flow wird in den Editor übernommen

### Moderation

Texte und Bilder werden automatisiert moderiert. Bei mittleren Scores landet Inhalt in der Moderationswarteschlange, bei hohen Scores wird er blockiert.

### Realtime und Notifications

Benachrichtigungen und Aktivitätsfeeds laufen über SSE und Redis Pub/Sub. `ToastProvider` und Notification-Hooks konsumieren diese Streams im Client.

### Worker und Hintergrundjobs

Der Worker ist ein separater Node-Prozess für:

- OpenSearch-Synchronisation
- Trending-Berechnungen
- Kontakt-/Benachrichtigungs-Sync
- Thumbnail-/Wartungsjobs
- Datenbank-Backups

## Entwicklungssetup

### Voraussetzungen

- Node.js 22+
- Docker + Docker Compose

### Installation

```bash
npm install --include=dev
cp .env.example .env
docker compose up -d postgres redis opensearch scraper
npm run db:generate
npm run db:push
npm run dev
```

Die App läuft dann unter `http://localhost:3000`.

### Wichtige Ports

| Dienst     | Port    | Zweck              |
| ---------- | ------- | ------------------ |
| App        | `3000`  | Next.js Anwendung  |
| PostgreSQL | `64000` | Datenbank          |
| Redis      | `62984` | Cache, Queues, SSE |
| OpenSearch | `9200`  | Suche              |
| Scraper    | `34215` | Rezept-Scraping    |

## Wichtige Scripts

```bash
npm run dev             # Next.js Dev Server
npm run worker          # BullMQ Worker lokal starten
npm run lint            # ESLint
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier
npm run db:generate     # Prisma Client generieren
npm run db:push         # Schema in DB pushen
npm run db:migrate      # Prisma Migration lokal
npm run db:seed         # Voller Seed
npm run db:seed-basics  # Kleiner Basis-Seed
npm run db:fresh        # DB reset + Seed
npm run build           # Production Build
npm run test:e2e        # Playwright Tests
```

## Wichtige Umgebungsvariablen

Die vollständige Liste steht in `.env.example`. Besonders relevant sind:

- `DATABASE_URL`
- `OPENSEARCH_URL`
- `REDIS_PASSWORD`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `SCRAPLER_URL`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_CAST_APP_ID`

## Deployment und Releases

- Deployments laufen nur von `main`; `live` ist veraltet und kann entfernt oder umbenannt werden.
- Keine Squash-Merges verwenden, weil sie Branch-Divergenzen und aufgeblasene GitHub-Diffs verursachen.
- Die CI in `.github/workflows/app-image-live.yml` reagiert auf `v*`-Tags, führt Lint + Prettier-Check aus und startet danach ein Coolify-Redeploy.
- Die betroffene Coolify-App hat die UUID `z3vcihuvscm7lxdxh4ssg63j` auf tecfriends.de; die Branch-Konfiguration soll auf `main` zeigen.

### Release-Ablauf

1. Letzten Tag ermitteln: `git tag -l 'v*' --sort=-creatordate | head -1`
2. Änderungen seit dem letzten Tag ansehen: `git log <last-tag>..HEAD --oneline`
3. Changelog vorbereiten und neuen Eintrag in `src/app/changelog/page.tsx` vorne in das `CHANGELOG`-Array setzen
4. Changelog committen: `git commit -m "docs: changelog for vYYYY-MM-DD"`
5. Checks ausführen: `npm run lint` und `npm run format:check`
6. Tag erzeugen und pushen: `git tag vYYYY-MM-DD && git push origin main --tags`
7. CI übernimmt Lint, Prettier-Check und das Redeploy

Hinweise:

- Follow-up-Releases am selben Tag verwenden `vYYYY-MM-DD.1`, `vYYYY-MM-DD.2` usw.
- Die Changelog-Seite ist unter `/changelog` erreichbar und nicht in der Hauptnavigation verlinkt.

### Changelog-Richtlinien

Der Changelog ist für Endnutzer gedacht, nicht für Entwickler. Einträge beschreiben das **sichtbare Ergebnis**, nicht die Implementierung.

**Nicht erwähnen:** Interne Tools (Flipt, OpenSearch, Redis, Sentry), Infrastruktur (Docker, CI/CD, E2E-Tests), Implementierungsdetails (SSE, Server Actions, Prisma, S3), Sicherheits-Interna (Ban-System, Moderations-Queue, AI-Schwellenwerte), Code-Cleanup.

**Gute Formulierung:** "Startseite lädt schneller" statt "Redis AOF-Persistenz hinzugefügt". "Zutaten werden automatisch in die Einzahlform gebracht" statt "Singularisierung mittels Nodehun".

## Orientierung für neue Entwickler:innen

Wenn du neu im Projekt bist, ist diese Reihenfolge sinnvoll:

1. `src/app/` ansehen, um die Produktflächen zu verstehen
2. `src/components/recipe/RecipeForm.tsx` und `src/components/flow/FlowEditor.tsx` lesen
3. `src/lib/recipeFilters.ts` und `src/lib/recipeSearch.ts` für die Suche lesen
4. `src/lib/importer/` für AI-Import anschauen
5. `worker/` für Hintergrundprozesse ansehen

## Verwandte Doku

- `email-templates/README.md` - Mail-Template-Workflow
- `k6/README.md` - Load-Testing
- `AGENTS.md` - Projektwissen für Coding-Agents
