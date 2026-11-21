# Observability (SigNoz / OpenTelemetry)

KitchenPace exportiert **Traces**, **strukturierte Logs**, **Runtime-Metriken** und **Client-Fehler** via OTLP/HTTP an **SigNoz**. GlitchTip/Sentry sowie Winston/Seq sind vollständig entfernt.

## Architektur über alle Services

| Service            | `OTEL_SERVICE_NAME`          | Einstiegspunkt                                                            | Auto-Instrumentation & Instrumentierung                                                                                                                                                                                                                                     |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js App**    | `kitchenpace-web`            | `instrumentation.ts` → `shared/telemetry/node-sdk.ts`                     | Next.js Request/RSC-Spans, `PgInstrumentation` (`requireParentSpan: true`), `IORedisInstrumentation` (`requireParentSpan: true`), `UndiciInstrumentation`, `HttpInstrumentation` (outbound only), `AwsInstrumentation` (S3), `RuntimeNodeInstrumentation`, `onRequestError` |
| **BullMQ Worker**  | `kitchenpace-worker`         | `tsx --import ./shared/telemetry/worker-register.ts worker/entrypoint.ts` | Alle Auto-Instrumentierungen + expliziter Consumer-Span `job.<queue>.<jobName>` je Job + `flushTelemetry()` im `finally` + `shutdownTelemetry()` bei Shutdown                                                                                                               |
| **Python Scraper** | `kitchenpace-scraper`        | `services/scraper/app/telemetry.py`                                       | `FastAPIInstrumentor` (ohne `/health`), `HTTPXClientInstrumentor`, `LoggingInstrumentor` + OTLP Log/Trace-Export                                                                                                                                                            |
| **Browser**        | `kitchenpace-web` (`client`) | `instrumentation-client.ts` + Error Boundaries                            | Deduplizierter Beacon an `POST /api/telemetry/client-error` → erzeugt `client.error`-Span + korrelierten Log                                                                                                                                                                |

## Aktivierung & Umgebungsvariablen

Ohne gesetzten `OTEL_EXPORTER_OTLP_ENDPOINT` (oder bei `OTEL_SDK_DISABLED=true`) bleibt der OTLP-Export lokal und in Tests deaktiviert; `createLogger` schreibt weiterhin sauber auf die Konsole.

| Variable                                                                | Zweck                                                                       | Standard / Beispiel                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                           | Basis-URL des SigNoz OTel-Collectors                                        | `https://otelcollectorhttp-ld8l97e9o7rrkxe2gz9h5pmg.dev.isntlab.de` |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                           | `http/protobuf` oder `http/json` für Traces/Metrics (Logs nutzen OTLP/HTTP) | `http/protobuf`                                                     |
| `OTEL_SERVICE_NAME`                                                     | Dienstname in SigNoz                                                        | `kitchenpace-web` / `kitchenpace-worker` / `kitchenpace-scraper`    |
| `OTEL_RESOURCE_ATTRIBUTES`                                              | Zusätzliche Ressourcen-Attribute                                            | `deployment.environment=production` bzw. `beta`                     |
| `OTEL_TRACES_EXPORTER` / `OTEL_LOGS_EXPORTER` / `OTEL_METRICS_EXPORTER` | Einzelne Signale via `none` deaktivieren                                    | —                                                                   |
| `OTEL_SDK_DISABLED`                                                     | Gesamtes SDK abschalten                                                     | `false`                                                             |
| `OTEL_LOG_LEVEL`                                                        | OTel SDK-Diagnose (`NONE`, `ERROR`, `WARN`, `INFO`, `DEBUG`)                | `WARN`                                                              |
| `LOG_LEVEL`                                                             | Konsolen- & OTLP-Log-Minimum (`debug`, `info`, `warn`, `error`)             | `info` (Prod), `debug` (Dev)                                        |
| `RELEASE_VERSION` / `SOURCE_COMMIT`                                     | Release-Tag für `service.version` und Client-Reports                        | automatisch über `next.config.ts`                                   |

## Logging (`shared/logger.ts`)

`createLogger(module)` bleibt als zentrale API bestehen:

- **Strukturiert & korreliert:** Schreibt in Produktion JSON auf stdout/stderr, im Dev-Modus kompakte farbige Zeilen, und emittiert native OTLP-LogRecords mit aktiver `trace_id` und `span_id`.
- **Secret-Redaktion:** Felder mit sensiblen Schlüsselnamen (`password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `credential`, …) sowie Bearer-Tokens und URL-Passwörter werden automatisch durch `[redacted]` ersetzt.
- **SigNoz Exceptions:** `log.error(..., { error })` sowie `recordError(...)` zeichnen Fehler direkt als OTel-`exception`-Span-Event (mit `SpanStatusCode.ERROR`) auf dem aktiven Span bzw. einem eigenen `error.logged`-Span auf.

## Custom Spans & Fehlererfassung

- `withSpan(name, fn, opts)` aus `shared/telemetry/tracing.ts` führt synchrone oder asynchrone Operationen in einem aktiven Span aus, markiert echte Fehler (`isNextControlFlowError` wird nicht als Fehler gewertet) und beendet den Span sicher.
- `recordError(event, error, attributes, opts)` meldet gefangene Fehler (z. B. Hono Personal API 5xx, tRPC `INTERNAL_SERVER_ERROR`, Next `onRequestError`, Worker `uncaughtException`) inklusive korreliertem Error-Log.
- `observeExporter` (`shared/telemetry/exporter-health.ts`) meldet Export-Ausfälle gedrosselt direkt auf `stderr` (`docker logs`), ohne in den broken Log-Exporter zurückzulaufen.

## Datenschutz & Browser-Fehler

- Kein Session Replay, keine Tracking-Cookies und keine Collector-Credentials im Browser.
- `instrumentation-client.ts`, `src/app/global-error.tsx` und `src/app/error.tsx` senden deduplizierte Fehler-Beacons (max. 20 pro Seitenaufruf, 16 KB/Payload, 60/min Rate-Limit am Server) an `/api/telemetry/client-error`.

## Coolify-Konfiguration (Deployment-Hinweis)

In Coolify (Beta & Live) muss für den Stack lediglich gesetzt werden:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://otelcollectorhttp-ld8l97e9o7rrkxe2gz9h5pmg.dev.isntlab.de
```

`OTEL_SERVICE_NAME` und `OTEL_RESOURCE_ATTRIBUTES` werden je Container bereits über `docker-compose.yml` bzw. `docker-compose.live.yml` gesetzt. Alte `SEQ_URL`, `SEQ_API_KEY` oder Sentry-Variablen können entfernt werden.

## Lokale Verifikation

```bash
npm run test:telemetry
```
