# Personal API Implementation Plan

> Implement inline using executing-plans, with a whole-branch review after verification.

**Goal:** Ship the KUC-90 personal integration API in an isolated worktree.
**Architecture:** Hono route contracts generate OpenAPI; Better Auth verifies API keys; Prisma services enforce ownership and atomic writes; BullMQ processes private imports; Scalar renders documentation.
**Tech Stack:** Next.js, Hono, Zod 4, Better Auth 1.5.6, PostgreSQL/Prisma, BullMQ, Scalar React, Panda CSS.
**Spec:** ../specs/2026-10-14-personal-api-design.md

## Global constraints

No API-key sessions, no publishing API, no production changes. Keys default to recipes:read. Pagination 20/100. Imports: 10/day, 2 pending, 30-minute deadline, 50k text and 1MB download limits.

## Review focus

- A second account guesses private recipe/import IDs: 404 without content.
- Concurrent retries: one cook count / one import and one admission charge.
- Direct plugin HTTP calls: cannot bypass key rights or lifetime policy.
- Worker dies after saving: retry must not create a second recipe.
- Public URL redirects/DNS rebinding and metadata: no internal fetch or draft leakage.

## Tasks

1. [x] Dependencies, key plugin, schema and SQL migration; tests for permissions and key management/authentication; account actions and active-user checks.
       Files: src/lib/api/{permissions,auth,keys}.ts, src/lib/auth-server.ts, prisma/schema.prisma, prisma/migrations/\*.
2. [x] Hono app and DTOs; read and favorite/cook services. RED route isolation and idempotency tests, GREEN implementation, test/typecheck.
       Files: src/lib/api/{app,schemas,services,errors}.ts, src/app/api/v1/[[...route]]/route.ts, tests/api/\*.test.ts.
3. [x] Durable private import admissions/processor and safe URL fetch. RED quota, retry and fetch tests, GREEN services and worker integration.
       Files: src/lib/api/{imports,safe-fetch,import-processor}.ts, worker/entrypoint.ts, tests/api/\*.test.ts.
4. [x] Key account UI and navigation; Scalar docs and generated OpenAPI. Verify schema auth declarations, read-only default and explicit write toggles; typecheck/lint.
       Files: src/app/profile/api-keys/_, src/app/developers/api/_, src/components/features/QuickLinksCard.tsx.
5. [x] Draft metadata/access fixes; security regression tests. Run full API tests, disposable PostgreSQL integration tests, typecheck and lint; browser/build checks where environment permits.
6. [x] Whole-branch independent review, fix substantive findings, record verification/remaining constraints in YouTrack. Keep branch/worktree for user review; no deployment.

## Execution ledger

- User explicitly authorized implementation and worktree; proceed inline without additional approval gates.
- Repository has Playwright only and no unit suite; add Node/tsx API tests rather than introducing another test framework.

- Implemented the account UI, scoped Hono API, generated OpenAPI/Scalar documentation and durable private-import worker.
- Independent security review identified existing draft access via caller-controlled Server Action arguments. These now resolve identity/roles from the actual session; private profile history is owner-only and metadata never includes drafts.
- Disposable PostgreSQL migration applied to the previous schema; Prisma diff against the new schema reported no differences.
- Policy tests: 3 passed. Database integration/processor tests: 11 passed. Browser smoke passed key creation/reload/revocation, scope enforcement, draft metadata and light/dark documentation without page exceptions.
- Import analysis failures are terminal to avoid silently repeating paid AI calls; infrastructure queue failures retain retries. Imports do not fetch images or execute browser JavaScript. API cook/favorite writes do not emit public activity notifications.
- Existing ingredient/unit helpers can create shared catalog entries outside the recipe transaction. The private recipe, moderation record and completed import linkage are atomic; a failed import may leave unused catalog entries.
- Live paid AI import and deployment are not part of local verification. Migration must be deployed before starting the updated app and worker.

- Final production build (`npm run build`) completed successfully, including TypeScript and page generation. Targeted ESLint: zero errors; one existing max-lines warning in recipe actions.
- Final browser run also asserts Scalar's grid stylesheet is loaded; light/dark screenshots visually inspected. Full existing application E2E suite was not run.
- Remaining low-priority hardening: DNS lookup itself uses the operating-system resolver timeout; the HTTP download/redirect budget is 30 seconds. DNS answers are validated and pinned before any connection.
- Work remains on `feat/KUC-90-personal-api`; no merge, push, deployment or production migration performed.

## Bring API extension (follow-up request)

- Combined the API branch with Bring integration commit `68efb46` in this worktree; resolved additive User-model and account-navigation conflicts by retaining both features.
- Added scoped Bring list/index reads and recipe-ingredient transfer with optional portions/selection. Recipe visibility is checked server-side, ingredients are loaded from the database, and existing Bring ownership/transfer logic is reused.
- Separate `bring:read` and `bring:write` rights; new keys still default to recipes:read only. Account linking stays on the website.
- Extended shared transfer receipts with optional request context so a different recipe/portion selection cannot reuse the same API token even when expanded items happen to match. Existing website receipt hashes remain compatible. Receipts retain the existing 7-day policy; uncertain writes require list inspection before a new operation.
- Red/green regressions cover missing routes and receipt-context collisions. Independent review found no blockers; its suggested public-recipe and partial-result coverage was added. No real Bring credentials or production accounts used.

- Extension verification: 3 API policy tests, 17 database/API/processor tests and 16 Bring tests passed. Standalone typecheck and full production build passed. Browser smoke passed including creating a key with Bring read scope and receiving the documented connection-required response through the real Next/service stack. Combined migration schema diff is empty.
- Targeted lint has no errors; Hono app now has a max-lines warning (410 lines). Full external Bring account transfers are covered with simulated network boundaries, not a live account.
- Extension and combined API/Bring tree remain in the feature worktree for integration; no additional main merge, push or deployment performed by this follow-up.

## API simplification (explicit follow-up correction)

The user rejected client-generated operation keys. Removed the header entirely from
all public routes and OpenAPI. Each cook/import POST is a new operation; Bring uses
its existing list checks. Server-generated request IDs remain internal for receipts
and worker safety. Import POST still returns HTTP 202 with task `id`, and its owner
can poll GET /imports/{id} for status/recipeId/errorCode. This supersedes earlier
client-key requirements in the execution history. No database migration required.

## Embedded documentation redesign (follow-up)

- Replaced Scalar's standalone modern layout with its compact classic layout in the normal page flow, without a duplicate sidebar. Kept generated OpenAPI and interactive requests.
- Added a native three-step quickstart, copyable cURL example, account-key/reference/download links, and accessible disclosure guides for scopes, imports, Bring and limits.
- Scoped theme/typography overrides to the docs, loaded vendor CSS in its own cascade layer, removed duplicate introduction/SDK promotion, and wrapped mobile operation headers.
- Verified in Chromium at 390px and 1440px: light/dark styling, copy feedback, guide disclosures, reference anchor, endpoint expansion and request dialog without sending a request. No page exceptions or document overflow. Targeted ESLint, standalone TypeScript and diff whitespace checks passed. Independent review found no blockers; mobile truncation feedback addressed.
- UI-only changes; no API contract or importer behavior change. Recorded on the feature branch; not merged or pushed as part of this follow-up.
