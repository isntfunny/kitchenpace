# Bring! integration (KUC-89)

## Scope

One Bring account per KochTakt user. Existing lists are read directly from Bring; local shopping-list tables are not mirrored. Users can select a default list, add ingredients with serving-adjusted quantities, edit details, mark purchased, restore and remove items. Creation/deletion/renaming/sharing of lists stays in Bring.

Entry points: ingredient card below the serving control, ingredient landing header, desktop personal menu, mobile navigation and profile quick links. Connection management is at `/profile/integrations`; lists at `/shopping-list`. The recipe dialog connects inline and preserves a selected draft through local sign-in (session storage, one-hour expiry, no credentials).

## Runtime setup

1. Apply the checked-in Prisma migration `20261014165000_bring_integration` through the normal deployment migration process.
2. Provision `BRING_ENCRYPTION_KEY` in Infisical for dev, staging and prod. Each environment needs a cryptographically random 32-byte key encoded as base64. Use different keys per environment. Do not commit keys or copy them into `.env` files.
3. Inject that key into the Next.js process. Missing/invalid keys disable connection with a clear error.
4. Verify with a dedicated Bring test account containing disposable lists. No Bring credentials are needed at build time.

Replacing the encryption key without migrating encrypted records requires users to reconnect. Disconnect and user deletion remove stored credentials. Account passwords are encrypted using AES-256-GCM with user-bound authenticated data; no remote tokens are stored. Each server operation logs in afresh, avoiding cross-user client caches and stale sessions. Server actions apply user rate limits using the existing limiter.

## API and reliability

The adapter uses the same REST v2 endpoints as `discord-timeout-game` / `bring-shopping`, with explicit HTTP status checking, eight-second request timeouts and URLSearchParams form encoding. The web-client API identifier is public client metadata, not a user secret. This is the unofficial Bring interface, so compatibility must be checked using the test account before release.

All list reads/writes verify membership using the authenticated remote account. A PostgreSQL advisory transaction lock serializes writes and account changes per local user across processes; competing calls receive a retryable conflict. Remote household members can still change a list concurrently: detail edits check the last seen specification but the legacy Bring endpoint has no atomic compare-and-swap guarantee.

Bulk transfers persist a PENDING receipt independently of the lock transaction **before** writing remotely. Completed receipts are also saved independently, so transaction rollback cannot erase knowledge of a remote write. A pending receipt is never replayed; users must inspect the list and intentionally start another operation. Same operation IDs with different payloads are rejected. Results older than seven days are pruned on subsequent transfers; disconnect also clears receipts.

Existing open items are skipped rather than having amounts overwritten. A lost write response is reconciled by reading the remote list. Partial failures stay selected for retry; retries read current remote items again. Catalog matching is exact (including localized names); uncertain names stay unchanged. Only identity uses canonical Bring keys; the UI displays German catalog labels. Free-text quantities are preserved, while fractions, decimal commas and numeric ranges scale.

## Verification

- `npm run test:bring`: domain, adapter, crypto, service and server-action tests. Service tests replace the database/catalog boundaries and simulate rollback, ambiguous writes and authorization failures.
- `npm run test:bring:ui`: actual React components in an isolated browser harness with synthetic server-action responses; covers inline connection, portioned selection, sign-in return, list replacement and error visibility. Requires Playwright Chromium (`npx playwright install chromium`); optionally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
- `npx tsc --noEmit`, changed-file ESLint and Prettier.
- Prisma schema validation and migration smoke test against a disposable PostgreSQL 17 instance (no production data).

Screenshots from component tests are written to ignored `test-results/bring/`. These tests do not substitute for live Bring acceptance or a full deployed Next.js end-to-end run. Before release, verify both desktop/mobile login, shared lists, special characters, quantities, purchased-item restoration, unavailable/removed lists, connection removal and a deliberately interrupted transfer with the dedicated test account.

## Current branch verification (2026-10-14)

15 domain/service/action tests and 6 browser component tests pass. Migration smoke checks passed on a disposable PostgreSQL 17 instance, which was removed afterwards. Changed-file ESLint has no errors (the existing IngredientList length warning remains).

The initial TypeScript check passed. After Next generated route validators, the whole-project check reports existing non-Promise parameter unions in `/recipe/[id]`, `/recipe/[id]/mobile`, and `/user/[id]`; these page files are unchanged. The webpack compile check also fails resolving the pre-existing `nodehun` native import. These are not a green production-build result.

No live Bring login, migration on an application database, Infisical secret change, deployment or merge was performed. Those runtime checks remain required before release.
