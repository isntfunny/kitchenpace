# Ingredient references implementation plan

**Goal:** Preserve recipe-specific ingredient quantities and resolve ingredient mentions for new imports and existing recipes.
**Spec:** YouTrack KUC-88 and the approved design in this conversation.
**Architecture:** Use RecipeIngredient.id as the durable reference, separate from the catalogue ingredientId. Preserve duplicate ingredient occurrences; resolve source IDs before saving. Share a conservative resolver between save paths and migration. Migration plans are read-only by default, journal original values before applying, and use optimistic concurrency for apply/rollback.
**Constraints:** No production writes or deployment in this task. No inferred quantities. Preserve overrides, photos, graph structure and user edits. No dependency additions. Execute inline.

- [x] Resolver and tests: explicit mappings, unique legacy catalogue references, safe legacy name matches, ambiguity reporting, missing plain-text mentions only when explicitly referenced by a step.
- [x] Save paths and schema: retain import IDs through editing, preserve duplicate rows, atomically save ingredient rows and rewritten nodes, update read models/editor with both IDs.
- [x] Viewer: original string quantities and notes; accessible ingredient popovers above mobile overlays.
- [x] Migration CLI: paginated scan, JSON plan/report, explicit apply, journal before writes, conflict detection and rollback; inspect original import responses as review evidence.
- [x] Verification: resolver/migration regressions, isolated PostgreSQL integration, mobile popover interaction, scoped lint and TypeScript checks. Record limitations and deployment order in KUC-88.

Review focus: duplicate names with different quantities; removed/reordered ingredients; amount overrides and fractions; ambiguous legacy references and unavailable original import data; concurrent edits during apply and rollback.

Verified: 23 resolver/import/migration tests passed, including two isolated PostgreSQL suites; SQL migration transition verified with original rows and duplicate insertion. Mobile 390px tap/popover, overrides, empty amounts and viewport placement checked with Playwright. TypeScript, scoped ESLint (0 errors, existing file-length warnings), formatting and diff checks passed. Review findings addressed, including pre-migration editor removal/replacement and catalogue merge preservation.

Deployment and production backfill remain separate; uncertain historical occurrences require reviewed original evidence. Branch/worktree preserved for integration.
