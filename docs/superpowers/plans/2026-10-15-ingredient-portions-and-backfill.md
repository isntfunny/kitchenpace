# Ingredient portions and historical repair implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display correct serving-adjusted ingredient amounts throughout cooking and repair safe historical references without losing distinct ingredient uses.

**Architecture:** Integrate the prepared KUC-88 occurrence identities into current main. Keep original string quantities in storage; use shared pure formatting at display/export boundaries. Run the existing journaled backfill only after schema/application verification, with explicitly reviewed restoration for Lángos.

**Tech Stack:** Existing Next.js 16, React, TypeScript, Prisma 7, PostgreSQL, node:test, Playwright. No new product dependencies.

**Spec:** `docs/superpowers/specs/2026-10-15-ingredient-groups-and-quantities-design.md` (approved with grouping deferred).

## Global Constraints

- Groups, group schema/UI and AI grouping prompts are deferred to KUC-92.
- No new secrets, model switch, product dependencies or general recipe-page redesign.
- Original string amounts are authoritative. Unknown amounts are never inferred.
- RecipeIngredient.id is the occurrence identity; ingredientId remains catalogue identity.
- Preserve true explicit partial amounts, original photos, graph structure and later user edits.
- Execute inline in `/home/paseo/worktrees/kitchenpace-kuc-88`; no squash merges; deploy only from main.
- Isolated test databases only. No fixtures or test runs on jupiter.
- Live changes are real authorized repairs, preceded by backup, reviewed plan and durable rollback journal.

## Review Focus

- Equal catalogue IDs with different occurrence quantities: save/API/Bring must retain both (Task 1).
- Tiny positive values, mixed fractions, ranges and free-text amounts must not become zero or invented numbers (Task 2).
- Changing servings and then switching views, including portalled details, must not reset or double-scale amounts (Task 3).
- Invalid mobile/Cast serving inputs and old messages must safely use original servings (Task 3).
- Historical source ambiguity, partial previous repair and concurrent edits must not assign dough salt to cream or overwrite edits (Task 5).

---

### Task 1: Integrate occurrence identities with current save/API/shopping paths

**Files:** Existing KUC-88 changes in `src/components/recipe/recipeMutations.ts`, `src/lib/importer/pipeline.ts`, `prisma/schema.prisma`; modify `src/lib/api/services.ts`, `src/lib/api/bring.ts`, `src/lib/bring/service.ts`, `src/components/bring/AddToListButton.tsx` and their existing tests. Extend `src/lib/importer/save-references.integration.test.ts`.

**Interfaces:** Existing KUC-88 RecipeIngredient `id`, `ingredientId`, `sourceId` and resolver are retained. Personal recipe API keeps `ingredients[].id` as catalogue ID for compatibility and adds `recipeIngredientId` for the occurrence. Bring selections use occurrence IDs internally; any legacy catalogue-ID request selects all matching occurrences without silently dropping one.

- [ ] Record clean worktree state, fetch origin and merge the intended current main into this branch without squash. Resolve against current API/Bring behavior, preserving both features. Run existing KUC-88 and API/Bring baseline suites before adding behavior; investigate failures rather than blanket-updating expectations.
- [ ] Add failing regressions: two salt occurrences (`2 TL`, unknown amount with cream notes) survive import, repeated autosave, API serialization and independent Bring selection; a repeated save leaves exactly two rows with stable IDs. Catalogue ID remains backward compatible, occurrence IDs differ.
- [ ] Run the affected suites and confirm the new assertions fail for missing occurrence propagation, then implement the interface above across those paths. Keep private API import semantics and transaction boundaries.
- [ ] Provision a disposable PostgreSQL database on mars/container, generate Prisma against the merged schema, and run with an explicitly isolated `MENTION_TEST_DATABASE_URL`: `node --import tsx --test cli/lib/mention-repair-store.test.ts src/lib/importer/save-references.integration.test.ts`. Neither suite may be skipped in the recorded integration result.
- [ ] Re-run affected API/Bring tests, verify the unique-index migration accepts duplicate catalogue ingredients while preserving old amounts, and commit as `fix: integrate ingredient occurrences across API and shopping (KUC-88)`.

### Task 2: Share quantity parsing and scaling

**Files:** Create `src/lib/ingredients/quantities.ts` and `.test.ts`; modify `src/lib/bring/items.ts`, `src/lib/format.ts` and the existing Bring quantity tests.

**Interfaces:** Export `scaleQuantity(raw: string, factor: number): string`, `scaleMentionOverride(raw: string, factor: number): string`, and `portionFactor(servings: number, originalServings: number): number`. Bring's old `scaleQuantity` import remains available via re-export. Invalid serving inputs produce neutral factor 1.

- [ ] Write failing table tests with these exact assertions:

```ts
assert.equal(scaleQuantity('1/2', 2), '1');
assert.equal(scaleQuantity('1 1/2', 2), '3');
assert.equal(scaleQuantity('½', 2), '1');
assert.equal(scaleQuantity('0,5', 2), '1');
assert.equal(scaleQuantity('2–3', 2), '4–6');
assert.equal(scaleQuantity('0,001', 2), '0,002');
assert.equal(scaleQuantity('1/2', 1), '1/2');
assert.equal(scaleQuantity('nach Geschmack', 2), 'nach Geschmack');
assert.equal(scaleQuantity('', 2), '');
assert.equal(scaleQuantity('1/0', 2), '1/0');
assert.equal(scaleQuantity('2', Infinity), '2');
assert.equal(scaleMentionOverride('100 ml', 2), '200 ml');
assert.equal(scaleMentionOverride('nach Geschmack', 2), 'nach Geschmack');
assert.equal(portionFactor(10, 5), 2);
assert.equal(portionFactor(10, 0), 1);
```

- [ ] Run `node --import tsx --test src/lib/ingredients/quantities.test.ts`; confirm missing functionality fails. Implement strict number/fraction/range parsing and spec formatting. Preserve malformed/unrecognized values; no parseFloat truncation and no unit conversion.
- [ ] Reuse the pure implementation from Bring and the existing numeric formatting wrapper; add tests for zero/NaN factors, decimal points, Unicode mixed fractions and values below 0.01 remaining positive.
- [ ] Re-run new quantity and existing Bring tests; commit as `fix: share precise recipe quantity scaling (KUC-88)`.

### Task 3: Connect portions to every cooking view and detail popover

**Files:** Create `src/components/flow/viewer/IngredientPortionsContext.tsx`; modify `IngredientMention.tsx`, `viewerUtils.tsx`, `NodeDetailModal.tsx`, `viewerTypes.ts`, `RecipeStepsViewer.tsx`, `src/app/recipe/[id]/RecipeDetailClient.tsx`, `src/app/recipe/[id]/components/IngredientList.tsx`, `src/app/recipe/[id]/mobile/page.tsx`, `MobileRecipeClient.tsx`, `src/hooks/useCast.ts`, `src/app/cast/receiver/page.tsx`. Add `e2e/ingredient-portions.spec.ts` with isolated fixture setup.

**Interfaces:** Viewer props gain optional `servings` and `originalServings`, defaulting to factor 1. `IngredientPortionsProvider` exposes a validated factor through `useIngredientPortionFactor()`. Ingredients stay unscaled; IngredientMention and ingredient chips/details format at the display boundary. Portals inherit React context. Existing view components continue receiving the same occurrence refs. Cast LOAD_RECIPE gains optional `servings`; the receiver uses a validated query parameter.

- [ ] Add failing browser cases on an isolated recipe: default five servings shows 200 g Schmand; selecting ten shows 400 g in list, description and popover; a 100 ml explicit partial amount becomes 200 ml while its total 250 ml becomes 500 ml; returning to five restores originals. Both salt occurrences keep their own amount/notes, and unknown cream amount stays unknown.
- [ ] Run the new browser cases against the local application/isolated database and confirm current unscaled rendering fails. Implement provider, formatter usage and serving propagation. Use original rawAmount in the list; no writes on portion changes. Keep popovers usable above mobile overlays.
- [ ] Add view-switch assertions across text, mobile, flow and enabled lane view. Check ingredient chips and details do not scale a pre-scaled value again. Embedded views without portion props stay at original amounts.
- [ ] Add standalone mobile tests for query `servings=10`, absent/invalid/negative/nonfinite values, and changing portions through accessible compact controls. Stub Cast SDK locally to assert optional servings transmission and receiver compatibility with messages lacking servings.
- [ ] Run `npx playwright test e2e/ingredient-portions.spec.ts` against the isolated local fixture, scoped ESLint and TypeScript. Commit as `fix: scale cooking instructions and ingredient details with portions (KUC-88)`.

### Task 4: Preserve quantities in print and downstream consumers

**Files:** Modify `src/app/recipe/[id]/components/PrintRecipe.ts`, relevant `IngredientList.tsx` formatting and Bring/API tests; add print assertions to `e2e/ingredient-portions.spec.ts`.

**Interfaces:** Print consumes original `rawAmount` and chosen portions through shared quantity functions. Rendered instructions contain readable ingredient names/amounts rather than mention markup. Personal API continues returning base quantities and original servings, with stable occurrence IDs from Task 1.

- [ ] Add failing print-window assertions for ten servings: `1/2` becomes `1`, `2–3` becomes `4–6`, unknown quantity stays empty/text and instructions contain no raw `@[` markup. Escape user text in generated print HTML.
- [ ] Verify those fail, then update print formatting and instruction conversion using the shared quantity implementation. Each occurrence appears once; do not deduplicate by catalogue ID.
- [ ] Assert shopping transfer independently selects both salt uses, scales exactly once and retains unknown-amount notes. Run existing nutrition tests with duplicated catalogue ingredient rows; fix only occurrence loss/double-counting caused by this change.
- [ ] Run the relevant print/browser, Bring/API and nutrition suites; commit as `fix: preserve serving quantities in recipe exports and shopping (KUC-88)`.

### Task 5: Complete backfill support and verified release

**Files:** Modify `src/lib/ingredients/mention-migration.ts`, `.test.ts`, `cli/commands/repair-ingredient-mentions.ts`, `cli/lib/mention-repair-store.test.ts`, `docs/ingredient-mention-repair.md`. Keep actual production snapshots, plans and decision files outside git under `/home/paseo/task-artifacts/` with restricted permissions.

**Interfaces:** Existing `planRecipeRepair(snapshot, decisions)` and apply/journal/resume/rollback remain. Add optional reviewed `descriptionOverrides: Record<nodeId, { expected: string; replacement: string }>` to the decisions schema. Require an exact current-description match before accepting each override; apply these checked descriptions before ID repair. The plan/journal captures their effects so existing snapshot checks and rollback cover them. Unknown nodes, stale text and unmapped restored rows fail validation.

- [ ] Add failing regressions: Lángos source snapshots restore a distinct cream-salt occurrence; only the known live-added whole-amount overrides are removed, genuine partial amounts survive; stale reviewed text is rejected; IDs remain distinct after a second run. Assert no inferred `2 TL` on cream salt.
- [ ] Run `node --import tsx --test src/lib/ingredients/mention-migration.test.ts`; confirm absent decision handling fails. Implement exact checked overrides and extend integration coverage for apply/resume/rollback and conflicts, including ingredient edits that do not change recipe updatedAt.
- [ ] Run all quantity/resolver/import/migration suites and isolated database suites; scoped ESLint, formatting, `npx tsc --noEmit`, relevant browser suites and project build. Record real failures/limitations; do not call skipped integration tests passing. Perform a whole-diff review against the spec; correct findings and re-run affected checks.
- [ ] Document commands and deployment order. Update ticket with implementation/review evidence. Merge to main without squash; run deployment workflow on staging. Verify schema, new real import/save and serving behavior there before production release. Do not release from the feature branch.
- [ ] Before production data edits, take a durable database backup and verify its artifact; obtain read-only snapshot/plan for all recipes. Assemble and review the Lángos decisions using the saved before/after snapshots and original import response; reject any intervening edits. Journal the real one-recipe correction before apply, then verify database state and live mobile/main-page amounts at five and ten servings.
- [ ] Apply only the reviewed safe entries of the all-recipes plan with durable journal. Re-scan and record counts: scanned, already correct, changed, unresolved and invalid. Retain plans, evidence, journals and rollback instructions; do not guess unresolved historical quantities or describe all recipes as fixed if review cases remain.
- [ ] Update KUC-88 with deployment version, verification and remaining blockers. Mark Done only when its acceptance criteria are met. KUC-92 remains Backlog.
