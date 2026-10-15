# Bring! integration (KUC-89)

## Scope

One Bring account per KochTakt user. Existing lists are read directly from Bring; local shopping-list tables are not mirrored. Users can select a default list, add ingredients with serving-adjusted quantities, edit details, mark purchased, restore and remove items. Connected users can also create lists directly from the list switcher. Deletion/renaming/sharing of lists stays in Bring.

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

15 domain/service/action tests and 12 browser component tests pass. Migration smoke checks passed on a disposable PostgreSQL 17 instance, which was removed afterwards. Changed-file ESLint has no errors (the existing IngredientList length warning remains).

The initial TypeScript check and the final `tsc --noEmit` after the standard Turbopack compile both pass. The additional Webpack compile attempt fails resolving the pre-existing `nodehun` native import; its generated validators also reject existing non-Promise parameter unions in `/recipe/[id]`, `/recipe/[id]/mobile`, and `/user/[id]`. These variant-specific findings do not occur in the final Turbopack-generated typecheck. A full release build is still not claimed.

No live Bring login, migration on an application database, Infisical secret change, deployment or merge was performed. Those runtime checks remain required before release.

Turbopack verification: `next build --experimental-build-mode compile` completed successfully (exit 0), including compilation and page-data collection. This compile-mode check skips final generation; the subsequent TypeScript check passes with its generated validators. Implementation commit: `d5a7c15` on `feat/KUC-89-bring-integration`.

## UI alignment (2026-10-14)

Bring surfaces use the existing Button, Heading/Text, Select and Skeleton components and the existing PageShell/ProfileSidebarLayout. Inputs, checkboxes, card rows, links and feedback use semantic theme tokens. The recipe dialog retains Radix focus management, uses the app overlay token and blur treatment, and opens as a mobile bottom sheet with safe-area padding. Select menus sit above the dialog and wrap long household list names within the viewport. Mobile item actions are grouped together with 44px targets.

Verified: 12 browser component tests (including keyboard selection/focus restoration, long mobile list names and 390px/1280px light/dark views), 15 domain/service/action tests, TypeScript, ESLint and Prettier. Loading, empty and error screenshots were also inspected. Browser responses are synthetic; screenshots use compiled app font faces when `BRING_UI_FONT_CSS` points to the generated Next.js font CSS chunk. The harness supplies the app theme CSS and fonts but does not render the complete authenticated Next.js layout. Full-app/live Bring acceptance remains pending as described above.

Independent UI review found mobile overflow for long list names; reproduced with a failing browser test and fixed. Keyboard focus returns to the recipe action after closing the dialog. A removed/default list cannot be saved from the connection card when it is absent from the loaded lists.

## Shopping-list structure and ingredient autocomplete (2026-10-15)

The shopping page keeps PageShell and the existing component/theme system. A compact list selector and refresh action sit above open/purchased counts and quick-add. Quantity/details are optional until selected. Items share one continuous list with their quantity on a secondary line; the Radix action menu provides edit/remove. Purchased items remain collapsible. Editing one item does not overwrite the separate quick-add draft.

Quick-add uses the same `searchIngredients` server action as the recipe editor, backed by the ingredient index and quantity parser. Suggestions start after two characters with a 180ms debounce. Selection is explicit and fills the ingredient/parsed amount; adding remains a separate action. Free-text household articles remain supported and do not create ingredient database records. Request cleanup ignores old responses, and search failure does not block free-text entry.

Regression coverage includes keyboard selection, parsed amounts, delayed/out-of-order search responses, free-text fallback, edit/add draft isolation, menu actions and a shared-list update during editing. Edits retain the quantity from when editing began for the server's conflict check. Screenshots cover ten-item lists on mobile/desktop in both themes, plus the suggestion dropdown. These are component-harness checks with synthetic service responses, not a live Bring account test.

### Creating lists

The list switcher offers “Neue Liste”, opening a compact name form using existing controls. A successful create selects the returned list without changing the configured default. Errors retain the name. Names are trimmed and limited to 100 characters. Creation requires a connected, authenticated account and uses the existing rate limit and account write lock.

The endpoint is `POST /rest/bringusers/{userUuid}/lists` (without `v2`), with form-encoded `name` and grocery `theme`, returning `bringListUUID`; source: [Bring client project API wiki](https://github.com/miaucl/bring-api/wiki/Raw-API-Requests#create-a-new-list). This is an unofficial API; real-account verification remains required. A namespaced creation receipt in `BringTransfer` records pending/completed attempts independently of transaction rollback. Repeating the same operation never submits a second remote creation; an ambiguous response requires refreshing the lists before starting another attempt. No automatic creation retry or default-list change occurs.

Regression checks cover encoded names/endpoint, invalid responses, authentication/input validation, successful receipt replay and uncertain receipt finalization, plus browser creation/selection and preserved names after errors.
