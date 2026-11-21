# Error Handling & Observability Best Practices

KitchenPace nutzt **OpenTelemetry + SigNoz** für Traces, strukturierte Logs und Exception-Tracking (siehe auch `docs/OBSERVABILITY.md`).

## Überblick

- **Automatische Erfassung**:
    - Next.js Server/RSC/Action-Fehler landen über `onRequestError` (`src/instrumentation.ts`) als Span-Exceptions + korrelierte Logs in SigNoz.
    - Unbehandelte Browser-Fehler und Promise-Rejections landen über `src/instrumentation-client.ts`, `global-error.tsx` und `error.tsx` via `POST /api/telemetry/client-error` in SigNoz.
    - BullMQ-Worker-Jobs laufen jeweils in einem Consumer-Span (`job.<queue>.<jobName>`) und melden Fehler automatisch.
    - Personal API (`/api/v1`) und tRPC (`/api/trpc`) erfassen 500er-Fehler über `recordError()`.

## Verwendung im Server-Code

### 1. Strukturierter Logger (`shared/logger.ts`)

```ts
import { createLogger } from '@shared/logger';

const log = createLogger('recipe-import');

log.info('Import completed', { recipeId, stepCount });
log.warn('Fallback triggered', { reason: 'missing_image' });

// Übergabe von { error } oder { err } zeichnet zusätzlich ein Span-Exception-Event für SigNoz auf:
log.error('Import failed', { error, recipeId });
```

### 2. Eigene Spans (`withSpan`)

Für mehrstufige Server-Operationen oder Hintergrundaufgaben:

```ts
import { withSpan } from '@shared/telemetry/tracing';

export async function syncRecipe(recipeId: string) {
    return withSpan('opensearch.sync_recipe', async (span) => {
        span.setAttribute('recipe.id', recipeId);
        // Kind-Spans für Postgres (pg), Redis (ioredis), Fetch (undici) und S3 entstehen automatisch darunter.
    });
}
```

`withSpan` ignoriert Next.js Control-Flow-Signale (`redirect()`, `notFound()`, `NEXT_PRERENDER_INTERRUPTED`), markiert echte Exceptions mit `SpanStatusCode.ERROR` und wirft den ursprünglichen Fehler weiter.

### 3. Gefangene Fehler explizit melden (`recordError`)

Wenn ein Fehler abgefangen und in eine eigene Fehlerantwort umgewandelt wird (z. B. HTTP 500):

```ts
import { recordError } from '@shared/telemetry/tracing';

try {
    await processUpload();
} catch (error) {
    recordError('upload.failed', error, { contentType }, { module: 'upload' });
    return Response.json({ error: 'Upload failed' }, { status: 500 });
}
```

## Verwendung im Browser (`src/lib/telemetry/client.ts`)

```ts
import { reportClientError } from '@app/lib/telemetry/client';

try {
    await criticalClientAction();
} catch (error) {
    reportClientError(error, 'boundary');
}
```

- Validierungs- oder erwartete Fachfehler (z. B. ungültiges Formularfeld, 404) **nicht** an `recordError` oder `reportClientError` melden.
- Keine Secrets oder Passwörter in Fehlermeldungen oder Metadaten einbauen — bekannte sensitive Keys werden automatisch mit `[redacted]` maskiert.
