# Personal integration API — KUC-90

User approved implementation with Hono in a separate worktree. Personal API keys first; no OAuth. Better Auth remains the only authentication system. API keys never establish browser sessions.

## Contract

Hono under `/api/v1`, explicit Zod request/response schemas and generated OpenAPI. Scalar React under `/developers/api` inside the existing layout, inheriting Panda colors and app theme. Public specification; protected data routes. `x-api-key` authentication, private no-store responses. No admin privileges via keys.

Read scopes: recipes, favorites, collections, cooks. Default keys receive only recipes:read; additional scopes opt-in. Own recipes (including drafts), accessible recipe details (own or published/approved), own favorites, own collections with accessible recipe summaries, own cook history. Cursor pagination, default 20 maximum 100. Explicit DTOs exclude moderation internals and personal account information.

Write scopes: favorites:write (idempotent PUT/DELETE), cooks:write, imports:create (also grants own import status). No publish/edit/delete recipe endpoint. Cook requests accept servings only in V1; no public text or images. Cook rows and counters update atomically; public events must not expose private recipes.

## Keys

Account page `/profile/api-keys`: named keys, selected permissions, expiration 30/90/365 days, one-time secret display, list and revoke. Server-owned permission allowlist and quotas. Better Auth plugin pinned to compatible version. Owner/session checks for all management actions; direct plugin endpoints cannot bypass application creation policy. Verified active user required. No API-key sessions.

## Imports

Durable database request record plus BullMQ worker. POST returns 202 and GET reports queued/processing/completed/failed. Requests are scoped by user. Each POST is a new request; no client-generated operation header. The response id identifies the task for status polling. Default 10 admissions per UTC day and 2 pending/running jobs per user. Admission is atomic across keys; each accepted POST consumes a slot. Worker retries reuse the stored job. Pending jobs expire after 30 minutes. Failure is sanitized; raw user text is not put into generic job logs. Worker checks account/key again before spending resources.

Use existing AI analysis. Import URL fetch must validate all redirects and pin connections to public resolved IPs; bounded HTTP HTML/text download (no browser execution) is sufficient for API V1. Limit text 50,000 characters and downloads 1 MB. External image downloads omitted for private API imports. Imported recipe always DRAFT with publishedAt null, no public activity/index enqueue. Persist moderation decision without auto-publishing. Ensure recipe creation and completed job linkage are atomic for retries.

## Privacy

Owner checks on all API object accesses. Public metadata never loads drafts. API imports have no image download. Public recipe retrieval must require PUBLISHED plus approved moderation. Verify private recipes cannot escape via recipe detail/mobile/viewer or favorites/collections/history responses. No broad unrelated redesign.

## Verification

Node test runner through tsx for route/service tests; real Hono app with injected dependencies. Integration tests with disposable PostgreSQL for plugin migration, scopes, account checks, POSTs without extra headers, internal worker replay safety and quotas. Typecheck/lint, OpenAPI validation and docs build checks. No production migrations, merge or deployment. Browser/E2E only against isolated local services.
