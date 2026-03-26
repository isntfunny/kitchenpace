# Thumbnail Route Rework — Path-Based URLs

**Date:** 2026-03-26
**Status:** Approved

## Motivation

Die aktuelle Thumbnail-Route nutzt Query-Parameter (`?key=...&aspect=...&w=...`), wodurch S3-Keys im Frontend sichtbar sind und URLs unuebersichtlich werden. Ziel: saubere, pfad-basierte URLs mit Format-Suffix, die S3-Keys vollstaendig aus dem User-Frontend entfernen.

## URL-Schema

### Catch-All Route

```
src/app/api/thumbnail/[...params]/route.ts
```

Ersetzt die bestehende `src/app/api/thumbnail/route.ts`.

### Segmentstruktur

```
/api/thumbnail/{type}/{id}/{aspect}/{width}.{format}
```

| Segment        | Beschreibung                                  | Werte                                                               |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `type`         | Entity-Typ oder `key`                         | `recipe`, `user`, `cook`, `comment`, `key`                          |
| `id`           | Entity-ID oder base64url-encodierter S3-Key   | z.B. `clx1abc...` oder `dXBsb2Fkcy8uLi4`                            |
| `aspect`       | Seitenverhaeltnis (Doppelpunkt → Bindestrich) | `16-9`, `4-3`, `3-2`, `1-1`, `4-1`, `3-1`, `3-4`, `2-1`, `original` |
| `width.format` | Breakpoint-Breite + Dateiformat               | `1280.webp`, `1200.jpg`, `320.webp`                                 |

### Beispiel-URLs

```
# Website (WebP)
/api/thumbnail/recipe/clx1abc/16-9/1280.webp       # Recipe Hero
/api/thumbnail/user/usr123/1-1/320.webp             # Avatar
/api/thumbnail/cook/ck456/1-1/320.webp              # Cook Image
/api/thumbnail/comment/cm789/original/640.webp      # Comment Image

# OG / Social Sharing (JPEG)
/api/thumbnail/recipe/clx1abc/16-9/1200.jpg         # OG Embed

# Interner Fallback (base64url-encodierter S3 Key)
/api/thumbnail/key/dXBsb2Fkcy9yZWNpcGUvMTIz/3-1/960.webp   # Step Image
```

## Entity Resolution

Jeder Typ wird ueber einen Prisma-Lookup in einen S3-Key aufgeloest:

```typescript
async function resolveImageKey(type: string, id: string): Promise<string | null> {
    switch (type) {
        case 'recipe': {
            const recipe = await prisma.recipe.findUnique({
                where: { id },
                select: { imageKey: true },
            });
            return recipe?.imageKey ?? null;
        }
        case 'user': {
            const profile = await prisma.profile.findUnique({
                where: { userId: id },
                select: { photoKey: true },
            });
            return profile?.photoKey ?? null;
        }
        case 'cook': {
            const cookImage = await prisma.cookImage.findUnique({
                where: { id },
                select: { imageKey: true },
            });
            return cookImage?.imageKey ?? null;
        }
        case 'comment': {
            const comment = await prisma.comment.findUnique({
                where: { id },
                select: { imageKey: true },
            });
            return comment?.imageKey ?? null;
        }
        case 'key': {
            // base64url-decode → S3 key
            return Buffer.from(id, 'base64url').toString('utf8');
        }
        default:
            return null;
    }
}
```

## Format-Handling

Das Datei-Suffix bestimmt das Ausgabeformat:

| Suffix  | sharp-Aufruf             | Content-Type | Verwendung                      |
| ------- | ------------------------ | ------------ | ------------------------------- |
| `.webp` | `.webp({ quality: 80 })` | `image/webp` | Website (SmartImage, srcset)    |
| `.jpg`  | `.jpeg({ quality: 85 })` | `image/jpeg` | OG-Tags, Social Sharing, Embeds |

### Thumb-Cache Keys

Format wird im Cache-Key beruecksichtigt, damit WebP und JPEG getrennt gecacht werden:

```
thumbs/{hash}/{aspect}/{width}.webp
thumbs/{hash}/{aspect}/{width}.jpg
```

Die bestehende `thumbKey()`-Funktion in `src/lib/s3/keys.ts` erhaelt einen optionalen `format`-Parameter:

```typescript
export function thumbKey(
    originalKey: string,
    aspect: AspectRatio,
    width: number,
    format: 'webp' | 'jpg' = 'webp',
): string {
    return `thumbs/${keyHash(originalKey)}/${aspectSlug(aspect)}/${width}.${format}`;
}
```

## Segment-Parsing

Die Catch-All Route parst `params` als Array:

```typescript
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ params: string[] }> },
) {
    const segments = (await params).params;

    // Mindestens 4 Segmente: type, id, aspect, width.format
    // Bei type='key' kann der base64url-Teil '/' enthalten → alles zwischen
    // segments[1] und segments[n-2] ist die ID

    const type = segments[0]; // 'recipe' | 'user' | 'cook' | 'comment' | 'key'
    const widthFile = segments[segments.length - 1]; // '1280.webp'
    const aspect = segments[segments.length - 2]; // '16-9'
    const id = segments.slice(1, -2).join('/'); // Entity-ID oder base64url-Key

    // width + format aus letztem Segment extrahieren
    const match = widthFile.match(/^(\d+)\.(webp|jpg)$/);
    // ...
}
```

### Aspect-Parsing

Aspect kommt als `16-9` rein und wird zu `16:9` konvertiert:

```typescript
const aspectMap: Record<string, AspectRatio> = {
    '16-9': '16:9',
    '4-3': '4:3',
    '3-2': '3:2',
    '1-1': '1:1',
    '4-1': '4:1',
    '3-1': '3:1',
    '3-4': '3:4',
    '2-1': '2:1',
    original: 'original',
};
```

## Client-Seitige URL-Builder

`src/lib/thumbnail-client.ts` wird komplett ueberarbeitet:

```typescript
import type { AspectRatio } from './s3/keys';

const BREAKPOINTS = [320, 640, 960, 1280, 1920];

type ThumbnailType = 'recipe' | 'user' | 'cook' | 'comment';
type Format = 'webp' | 'jpg';

function aspectToSlug(aspect: AspectRatio): string {
    return aspect.replace(':', '-');
}

/** Pfad-basierte Thumbnail-URL fuer eine Entity */
export function getThumbnailPath(
    type: ThumbnailType,
    id: string,
    aspect: AspectRatio = 'original',
    width: number = 960,
    format: Format = 'webp',
): string {
    if (!id) return '/recipe_placeholder.jpg';
    return `/api/thumbnail/${type}/${id}/${aspectToSlug(aspect)}/${width}.${format}`;
}

/** Pfad-basierte Thumbnail-URL fuer einen direkten S3 Key (Steps, generisch) */
export function getThumbnailKeyPath(
    key: string,
    aspect: AspectRatio = 'original',
    width: number = 960,
    format: Format = 'webp',
): string {
    if (!key) return '/recipe_placeholder.jpg';
    const encoded = Buffer.from(key).toString('base64url');
    return `/api/thumbnail/key/${encoded}/${aspectToSlug(aspect)}/${width}.${format}`;
}

/** srcset fuer responsive Bilder (WebP) */
export function getSrcSet(
    type: ThumbnailType,
    id: string,
    aspect: AspectRatio = 'original',
): string {
    return BREAKPOINTS.map((w) => `${getThumbnailPath(type, id, aspect, w)} ${w}w`).join(', ');
}

/** srcset fuer key-basierte Bilder (Steps) */
export function getSrcSetByKey(key: string, aspect: AspectRatio = 'original'): string {
    return BREAKPOINTS.map((w) => `${getThumbnailKeyPath(key, aspect, w)} ${w}w`).join(', ');
}

// extractKeyFromUrl() entfaellt — nicht mehr noetig
```

**Hinweis:** `getThumbnailKeyPath` nutzt `Buffer.from(...).toString('base64url')`. Im Browser-Kontext (Client Components) muss stattdessen `btoa()` + URL-safe-Replacement verwendet werden:

```typescript
// Browser-kompatible base64url-Encodierung
function toBase64Url(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
```

## Access Control

Bleibt identisch. Nach Entity-Resolution wird `canAccessKey(resolvedKey)` aufgerufen. Keine Aenderung an der Logik.

## Breakpoint-Set-Generation

Bleibt identisch in der Kernlogik. Einzige Aenderung: das Ausgabeformat (WebP vs JPEG) wird vom Request-Suffix bestimmt.

Bei Set-Generation (Tier 3 Cache-Miss) werden nur Varianten im angeforderten Format generiert — kein automatisches Dual-Format-Generieren.

## Memory Cache

Bleibt identisch. Cache-Key ist weiterhin der S3 Thumb-Key (`thumbs/{hash}/{aspect}/{width}.{format}`), der jetzt das Format enthaelt.

## Placeholder-Bereinigung

Aktuell wird `recipe_placeholder.jpg` an mehreren Stellen direkt als statisches Asset referenziert, statt ueber die Thumbnail-Route zu gehen. Diese Stellen werden bereinigt:

| Datei                                 | Aktuell                                                         | Neu                                                                          |
| ------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/atoms/SmartImage.tsx` | `RECIPE_PLACEHOLDER = '/recipe_placeholder.jpg'` hartcodiert    | Placeholder ueber Thumbnail-Route oder CSS-Fallback (wie Avatar-Komponente)  |
| `src/lib/thumbnail-client.ts`         | `return '/placeholder.jpg'` bei fehlendem Key                   | Leerer String oder `null` — Aufrufer entscheidet ueber Fallback              |
| `src/app/api/thumbnail/route.ts`      | `readFile('public/recipe_placeholder.jpg')` als Server-Fallback | Bleibt — serverseitig ist das korrekt (kein S3 Key → Placeholder ausliefern) |

Die statische Datei `public/recipe_placeholder.jpg` bleibt bestehen (wird vom Server-Fallback benoetigt), aber Client-Komponenten referenzieren sie nicht mehr direkt.

## Betroffene Dateien

### Route (neu/ersetzt)

| Aktion    | Datei                                        |
| --------- | -------------------------------------------- |
| Loeschen  | `src/app/api/thumbnail/route.ts`             |
| Erstellen | `src/app/api/thumbnail/[...params]/route.ts` |

### Client URL-Builder

| Aktion        | Datei                         |
| ------------- | ----------------------------- |
| Ueberarbeiten | `src/lib/thumbnail-client.ts` |

### S3 Keys

| Aktion    | Datei                                                          |
| --------- | -------------------------------------------------------------- |
| Erweitern | `src/lib/s3/keys.ts` — `thumbKey()` erhaelt `format`-Parameter |

### Aufrufer-Migration (Entity-basiert → `getThumbnailPath`)

Diese Stellen werden von `getThumbnailUrl(key, ...)` auf `getThumbnailPath(type, id, ...)` umgestellt:

| Datei                                                 | Entity-Typ              |
| ----------------------------------------------------- | ----------------------- |
| `src/components/atoms/SmartImage.tsx`                 | recipe/user (via Props) |
| `src/app/recipe/[id]/page.tsx`                        | recipe (OG: `.jpg`)     |
| `src/app/recipe/[id]/RecipeJsonLd.tsx`                | recipe (`.jpg`)         |
| `src/app/recipe/[id]/RecipeDetailClient.tsx`          | recipe                  |
| `src/app/recipe/[id]/components/CookDialog.tsx`       | cook                    |
| `src/app/recipe/[id]/components/HeroImageGallery.tsx` | cook                    |
| `src/app/user/[id]/page.tsx`                          | user                    |
| `src/app/profile/page.tsx`                            | user                    |
| `src/app/profile/images/UserCookImagesClient.tsx`     | cook                    |
| `src/app/actions/cooks.ts`                            | user                    |
| `src/app/actions/recipes.ts`                          | recipe                  |
| `src/lib/recipe-card.ts`                              | recipe                  |
| `src/lib/admin-inbox.ts`                              | user                    |
| `src/lib/admin/search-users.ts`                       | user                    |
| `src/app/admin/content/actions.ts`                    | user                    |
| `src/app/admin/content/content-moderation-form.tsx`   | recipe, user            |
| `src/app/admin/notifications/send-message-form.tsx`   | user                    |
| `src/components/features/ShareButton.tsx`             | recipe                  |

### Aufrufer-Migration (Key-basiert → `getThumbnailKeyPath`)

Diese Stellen haben keinen Entity-ID-Zugriff und nutzen den base64url-Fallback:

| Datei                                                 | Kontext             |
| ----------------------------------------------------- | ------------------- |
| `src/components/flow/viewer/NodeDetailModal.tsx`      | RecipeStep photoKey |
| `src/components/flow/viewer/SimpleTextView.tsx`       | RecipeStep photoKey |
| `src/components/flow/viewer/StepCard.tsx`             | RecipeStep photoKey |
| `src/components/flow/viewer/MobileView.tsx`           | RecipeStep photoKey |
| `src/components/flow/editor/RecipeNode.tsx`           | RecipeStep photoKey |
| `src/components/flow/editor/NodeEditPanel.tsx`        | RecipeStep photoKey |
| `src/components/flow/editor/lane-wizard/StepCard.tsx` | RecipeStep photoKey |

### Aufrufer-Migration (Mod Snapshots → `getThumbnailKeyPath`)

| Datei                                                   | Kontext                |
| ------------------------------------------------------- | ---------------------- |
| `src/app/admin/moderation/QueueColumns.tsx`             | Snapshot imageKey      |
| `src/app/admin/moderation/QueueActions.tsx`             | Snapshot imageKey      |
| `src/app/admin/moderation/moderation-history-table.tsx` | Snapshot imageKey      |
| `src/lib/moderation/moderationService.ts`               | Moderation image check |

### Nicht betroffen

| Datei                      | Grund                                         |
| -------------------------- | --------------------------------------------- |
| `src/lib/s3/operations.ts` | Kein Thumbnail-URL-Bezug                      |
| `src/lib/s3/responsive.ts` | Generiert S3-Keys, keine URLs                 |
| `src/lib/s3/client.ts`     | S3-Client-Config                              |
| `src/lib/tracking.ts`      | Erkennt Route-Pfad — muss ggf. Regex anpassen |

## Abwaertskompatibilitaet

Die alte Query-Parameter-Route wird geloescht. Es gibt keinen Redirect — alle Aufrufer werden im selben Release migriert. Extern gecachte URLs (CDN, Browser-Cache) laufen aus (`max-age=86400`).
