# Wochenauswahl (KUC-126) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „Plan mir die Woche“ öffnet einen Dialog, der die Suchseite als gemeinsamen Baustein nutzt. Man wählt dort Gerichte je Mahlzeitart in einer lebendig sortierten Liste. „Übernehmen“ verteilt sie auf die gewählten Plätze.

**Architecture:**

- Die Hülle der Suchseite wird aufgeteilt in reinen Filterzustand, URL-Abgleich und eine Such-Ansicht mit Props. Die Suchseite und der Dialog nutzen dieselben Bausteine.
- Die Suchanfrage bekommt einen verborgenen Grundfilter `context` (Art, ausgeschlossene Ids, Auswahl, Woche). Dazu kommt eine gemeinsame Rangfolge in `shared/recipe-ranking/`: Suchvektor, kNN, Punkteformel, MMR und Gründe. Die Sortierungen `taste` und `week` nutzen sie beide.
- Das Verteilen auf die Plätze ist eine reine Funktion. Server-Aktionen schreiben das Ergebnis über `runWrite`.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query + `@tanstack/react-virtual`, Panda CSS, Radix (`radix-ui`), OpenSearch (`recipes` + k-NN-Index `recipe-embeddings`), Prisma 7, `node:test` mit `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-22-wochenauswahl-design.md` (freigegeben am 22.11.2026). Mock: `design/wochenauswahl/a-desktop.html`, `a-mobile.html`.

**Branch/Worktree:** `feat/KUC-126-wochenauswahl` in `/home/paseo/worktrees/kitchenpace-kuc79`. Merge in `feat/KUC-79-wochenplan` erst nach Review durch den Lead.

## Global Constraints

- Keine OpenAI-Aufrufe. Alle Vektoren kommen aus `Profile.tasteEmbedding`, `RecipeEmbedding` und dem Index `recipe-embeddings`.
- Nur Unit-Tests mit `node --import tsx --test <dateien>`. Keine E2E- oder Browser-Tests.
- Ränder: Nie ein Seitenkürzel (`borderTop: '1px solid'`) zusammen mit `borderColor` verwenden, sondern `borderTopColor` usw. (siehe KUC-129).
- Alle Texte der Oberfläche auf Deutsch, genau wie in der Spec: „Passt zu deiner Woche“, „Probier auch mal“, „Dazu passt: …“, „Übernehmen“, „+1 Reste-Tag“, „4 von 8 Plätzen“.
- Keine neuen npm-Abhängigkeiten.
- Rate-Limit-Bucket `mealPlan` für alle neuen Server-Aktionen, über `run`/`runWrite` aus `src/app/plan/run.ts`. `/api/recipes/filter` bleibt ohne Rate-Limit.
- Die Suchseite verhält sich nach Teil A wie vorher: URL, Zurück-Taste, gespeicherte Sortierung, Ansicht, Nachladen.
- Startgewichte der Rangfolge (aus `scripts/probe-week-selection.mjs`, `CONFIG`): taste 4, pick 3, season 2, rating 1.5. Dazu b = 0.15 je Gericht (höchstens 0.5), kNN k = 150, nearDuplicate 0.8, bayesM 5, minRatedForGlobalMean 20, Listengröße 12, Probier-Reihe 5. MMR: cosStart 0.5, cosWeightPick 0.5, cosWeightList 0.4, artPick 0.12, artList 0.07, artListCap 3, jaccardStart 0.3, jaccardWeight 0.2.
- Kategorien-Slugs (auf Beta geprüft): `hauptgericht`, `beilage`, `getraenk`, `dessert`, `salat`, `backen`, `fruehstueck`, `vorspeise`. Tags: `Brunch`, `Kaffee & Kuchen`, `Grundrezept`, `Vorratshaltung`, `Geschenk aus der Küche`, Jahreszeiten `Frühling`, `Sommer`, `Herbst`, `Winter`.
- Test-Lauf am Ende (alle grün):
    ```bash
    node --import tsx --test shared/meal-planning/*.test.ts shared/recipe-ranking/*.test.ts shared/theme-clusters/*.test.ts shared/shopping-rhythm/*.test.ts worker/queues/*.test.ts tests/{bring,ingredients,meal-plan,pantry,recipes,shopping}/*.test.ts tests/meal-plan/intelligence/*.test.ts
    ```

## Entscheidungen, die die Spec offen ließ

- **Reste-Tage:** `leftoverDays(servings, household) = max(0, floor((servings − household) / household))`. Bei Haushalt 2 ergeben 3 Portionen keinen Reste-Tag, 4 Portionen einen und 6 Portionen zwei.
- **Art der festen Plätze:** `BREAKFAST` ist Frühstück, `LUNCH` und `DINNER` sind Hauptgerichte, `SNACK` ist „Kaffee & Snack“. Eigene Plätze: vor 11:00 Frühstück, von 14:00 bis vor 17:00 Kaffee & Snack, sonst Hauptgericht.
- **Der Index braucht alle Kategorien:** Heute speichert er nur die erste (`opensearch-processor.ts:159`), dabei haben 83 Hauptgerichte auf Beta mehrere. Neu kommen `categorySlugs` und `ratingCount` dazu (Task 6).
- **Bald ablaufender Vorrat** bekommt das Gewicht `expiring: 1.5`. Es zählt nur, wenn Vorrat da ist, und nur bei der Sortierung `week`.
- **„Passt zu dir“ ohne Geschmacksprofil** fällt wie heute auf `popular` zurück. Nur `week` rechnet ohne Profil mit neutralem Geschmack.
- **Die Beilage („Dazu passt“)** kommt nur in den Hauptplatz, nicht in den Reste-Eintrag.

## Review Focus

1. **Nutzer ohne Geschmacksprofil und ohne Auswahl** öffnet den Dialog. Die Liste zeigt beliebte und saisonale Hauptgerichte, ohne kNN und ohne Fehler (Task 8: Test `ranks without profile and picks`).
2. **Rezept ohne Embedding oder k-NN-Index nicht erreichbar:** Die Sortierung fällt auf Kosinus über die DB beziehungsweise auf die Bewertung zurück. Es erscheint keine Fehlermeldung (Task 9: Test `falls back when knn throws`).
3. **Filter lassen weniger als 12 oder gar keine Rezepte übrig:** Die Liste wird aufgefüllt beziehungsweise zeigt den leeren Zustand. Die Probier-Reihe ist leer und stürzt nicht ab (Task 8: `fills up below 12`; Task 10: `returns empty without candidates`).
4. **Ein Platz wird zwischen Öffnen und Übernehmen belegt** (zweiter Tab): Er wird übersprungen und in der Meldung gezählt. Nichts wird doppelt geschrieben (Task 13: Test `skips slots taken meanwhile`).
5. **Zurück-Taste auf `/recipes` nach Filter, Tippen und Sortierwechsel:** Eintippen ersetzt den Verlaufseintrag, einzelne Filteränderungen fügen einen hinzu, Zurück stellt den Zustand wieder her (Task 2: Tests zu `historyModeFor`).

---

## Teil A: Suchseite auf den gemeinsamen Baustein umstellen (ohne sichtbare Änderung)

### Task 1: Filter-Hilfen als reine Funktionen

**Files:**

- Create: `src/app/recipes/components/filter-state.ts`
- Test: `tests/recipes/filter-state.test.ts`

**Interfaces:**

- Produces:
    - `type FiltersWithSort = RecipeFilterSearchParams & { sort: RecipeSortOption }`
    - `clearedFilters(prev: FiltersWithSort): FiltersWithSort`: leert alle Werte aus `useSearchFilters.ts:146-166`, behält `sort`
    - `toggleFilterSet(prev: FiltersWithSort, set: FilterSetWithRelations, all: FilterSetWithRelations[] | undefined): FiltersWithSort`: Logik aus `useSearchFilters.ts:197-248`
    - `toggleTheme(prev, theme: ThemeChip): FiltersWithSort`
    - `countActiveFilters(filters: RecipeFilterSearchParams): number`: Logik aus `useSearchFilters.ts:255-265`

- [ ] **Step 1: Tests schreiben**
    - `clears every filter but keeps the sort`: Aus einem Zustand mit tags, excludeIngredients, maxTotalTime, query, filterSetId und sort `fastest` wird `{ sort: 'fastest', tags: [], …, query: undefined, filterSetId: undefined }`.
    - `filter set on, switch, off`:
        - Set A (Tag `Herbst`, Kategorie `suppe`) an: Die Tags enthalten `Herbst`, `filterSetId` ist A.
        - Auf Set B (Tag `Schnell`) wechseln: `Herbst` ist entfernt, `Schnell` ist da.
        - B aus: Die eigenen Tags des Nutzers (`Vegan`) bleiben, `filterSetId` ist `undefined`.
    - `counts arrays, numbers and query`: tags 2, minRating 4, query `'  '` → 3. Ein Leerzeichen-Query zählt nicht.
- [ ] **Step 2:** `node --import tsx --test tests/recipes/filter-state.test.ts` schlägt fehl, weil das Modul fehlt.
- [ ] **Step 3:** Die Funktionen aus `useSearchFilters.ts` herausziehen, ohne die Logik zu ändern. `toggleTheme` nutzt `toggleThemeFilters` aus `@shared/theme-clusters/release`.
- [ ] **Step 4:** Der Test ist grün.
- [ ] **Step 5:** Commit `refactor(search): pure filter helpers (KUC-126)`

### Task 2: Zustand und URL-Abgleich trennen

**Files:**

- Create: `src/app/recipes/components/useRecipeFilterState.ts`, `src/app/recipes/components/useFilterUrlSync.ts`
- Modify: `src/app/recipes/components/filter-state.ts` (adds `historyModeFor`), `src/app/recipes/page.tsx`
- Delete: `src/app/recipes/components/useSearchFilters.ts` (in Task 4, sobald der Client umgestellt ist)
- Test: `tests/recipes/filter-state.test.ts`

**Interfaces:**

- Consumes: Task 1
- Produces:

    ```ts
    type FilterStateOptions = {
        initialFilters: RecipeFilterSearchParams;
        filterSets?: FilterSetWithRelations[];
        isLoggedIn: boolean;
        /** Sort when initialFilters.sort is missing, e.g. 'week' in the dialog */
        defaultSort?: RecipeSortOption;
        /** localStorage key of the remembered sort; undefined = not remembered */
        sortStorageKey?: string;
        /** true when the URL sets ?sort=: the remembered sort must not override it */
        sortLocked?: boolean;
    };
    function useRecipeFilterState(o: FilterStateOptions): {
        filters: FiltersWithSort;
        queryInput: string;
        setQueryInput(v: string): void;
        updateFilters(next: Partial<RecipeFilterSearchParams>): void;
        replaceFilters(next: FiltersWithSort, origin: 'user' | 'restore'): void;
        resetFilters(): void;
        handleSortChange(sort: RecipeSortOption): void;
        handleFilterSetToggle(set: FilterSetWithRelations): void;
        handleThemeToggle(t: ThemeChip): void;
        activeFilterCount: number;
        lastOrigin: 'user' | 'typing' | 'restore';
    };
    function useFilterUrlSync(
        state: ReturnType<typeof useRecipeFilterState>,
        o: {
            pathname: string;
            initialFilters: RecipeFilterSearchParams;
            isLoggedIn: boolean;
            sortStorageKey: string;
        },
    ): void;
    function historyModeFor(
        origin: 'user' | 'typing' | 'restore',
        isFirst: boolean,
    ): 'push' | 'replace';
    ```

- [ ] **Step 1: Tests schreiben**
    - `first write replaces`: `historyModeFor('user', true) === 'replace'`
    - `typing replaces`: `historyModeFor('typing', false) === 'replace'`
    - `restore replaces`: `historyModeFor('restore', false) === 'replace'`
    - `discrete change pushes`: `historyModeFor('user', false) === 'push'`
- [ ] **Step 2:** Der Test schlägt fehl.
- [ ] **Step 3:** `historyModeFor` implementieren.
    - `useRecipeFilterState` übernimmt aus `useSearchFilters.ts` die Teile ohne URL:
        - Zustand und Debounce der Eingabe (400 ms; setzt `lastOrigin = 'typing'`)
        - gespeicherte Sortierung über `useLocalStorage(sortStorageKey)`, nur wenn `!sortLocked` und der Nutzer noch nicht gewählt hat
        - Handler über die Funktionen aus Task 1
    - `useFilterUrlSync` übernimmt das Schreiben der URL (`useSearchFilters.ts:94-115`, Modus über `historyModeFor`), `popstate` (`:123-139`, ruft `replaceFilters(parsed, 'restore')`) und den Abgleich bei neuen `initialFilters` (`:56-63`, ebenfalls `'restore'`).
    - `page.tsx` reicht `sortLocked={(await searchParams).sort !== undefined}` an den Client weiter. Damit entfällt der Zugriff auf `window.location` beim Wiederherstellen der Sortierung.
- [ ] **Step 4:** Der Test ist grün.
- [ ] **Step 5:** Commit `refactor(search): split filter state from URL sync (KUC-126)`

### Task 3: Spalten nach Containerbreite, Scroll-Container wählbar

**Files:**

- Create: `src/app/recipes/components/grid-columns.ts`, `src/app/recipes/components/VirtualRecipeRows.tsx`
- Test: `tests/recipes/grid-columns.test.ts`

**Interfaces:**

- Produces:
    - `columnsForWidth(width: number, viewMode: 'grid' | 'list'): 1 | 2 | 3`. Die Stufen entsprechen den alten Breakpoints, gemessen an der Breite der Ergebnisliste. Die Liste ist bei 540 px Fenster etwa 540 px breit und bei 1280 px Fenster etwa 850 px. Neue Grenzen: `< 500 → 1`, `< 800 → 2`, sonst 3. `list` ergibt immer 1.
    - `useContainerColumns(ref: RefObject<HTMLElement>, viewMode): number` (ResizeObserver)
    - `VirtualRecipeRows` mit den Props `{ rows: RecipeCardData[][]; estimateSize: number; scrollElement?: RefObject<HTMLElement | null>; renderRow(row: RecipeCardData[]): ReactNode; onNearEnd(): void; dimmed: boolean }`. Ohne `scrollElement` rendert es eine innere Komponente mit `useWindowVirtualizer` (wie `RecipeSearchClient.tsx:411-457`, inklusive `scrollMargin`). Mit `scrollElement` rendert es eine andere innere Komponente mit `useVirtualizer({ getScrollElement: () => scrollElement.current })`. So bleiben die Hooks bedingungslos.

- [ ] **Step 1: Test schreiben.** `columns follow container width`: (320, grid) → 1, (520, grid) → 2, (900, grid) → 3, (900, list) → 1, (0, grid) → 1.
- [ ] **Step 2:** Der Test schlägt fehl.
- [ ] **Step 3:** `columnsForWidth`, `useContainerColumns` und `VirtualRecipeRows` implementieren. Das Zurückscrollen bei Filterwechsel (`:427-440`) kommt als Prop `resetKey: unknown` hinein: Es scrollt das Fenster oder das Element an den Anfang der Liste.
- [ ] **Step 4:** Der Test ist grün.
- [ ] **Step 5:** Commit `refactor(search): container-based columns and virtual rows (KUC-126)`

### Task 4: RecipeSearchView und Props für Kopf, Leiste und Karte

**Files:**

- Create: `src/app/recipes/components/RecipeSearchView.tsx`
- Modify:
    - `RecipeSearchClient.tsx` wird dünn: nur noch die State-Hooks und die View.
    - `SearchHeader.tsx` bekommt Titel, Sortierungen und einen Zusatz rechts.
    - `FilterSidebar.tsx` und `MobileFilterSheet.tsx` bekommen `hiddenSections`.
    - `src/components/features/RecipeCard.tsx` bekommt einen Auswahl-Slot.
    - `src/app/actions/recipes.ts`: `RecipeCardData` bekommt `reason?: string`.
- Delete: `useSearchFilters.ts`

**Interfaces:**

- Consumes: Tasks 2 und 3
- Produces:

    ```ts
    type SortChoice = { value: RecipeSortOption; label: string };
    function searchSortOptions(isLoggedIn: boolean): SortChoice[]; // heutige Liste SearchHeader.tsx:201-206
    type RecipeSearchViewProps = {
        state: ReturnType<typeof useRecipeFilterState>;
        results: RecipeSearchState; // aus useRecipeSearch
        filterOptions: FilterOptions;
        filterSets?: FilterSetWithRelations[];
        themes?: ThemeChip[];
        currentSeason?: Season;
        isLoggedIn: boolean;
        title?: string; // default: heutiger Titel
        sortOptions?: SortChoice[]; // default: searchSortOptions(isLoggedIn)
        headerExtra?: ReactNode;
        hiddenSections?: FilterSection[]; // 'categories' | …
        scrollElement?: RefObject<HTMLElement | null>;
        renderCardSelection?: (recipe: RecipeCardData) => RecipeCardSelection | undefined;
        listFooter?: ReactNode; // Probier-Reihe im Dialog
        leading?: RecipeCardData[]; // gewählte Karten vorn, nicht virtualisiert
    };
    type FilterSection =
        | 'tags'
        | 'categories'
        | 'ingredients'
        | 'exclude'
        | 'effort'
        | 'time'
        | 'rating';
    type RecipeCardSelection = {
        selected: boolean;
        disabled?: boolean;
        onToggle(): void;
        footer?: ReactNode;
        reason?: string;
    };
    ```

    - `RecipeCard` bekommt `selection?: RecipeCardSelection`. Ist sie gesetzt, ist die Wurzel ein `<button type="button" aria-pressed={selected}>`. Innere `Link`s werden dann zu `span`s, `reason` steht unter dem Titel und `footer` unter der Karte. Ohne `selection` bleibt alles wie heute.

- [ ] **Step 1:** Die JSX aus `RecipeSearchClient.tsx:464-612` nach `RecipeSearchView` verschieben. Spalten über `useContainerColumns` auf dem Wrapper der Liste, Zeilen über `VirtualRecipeRows`. `viewMode` bleibt `useLocalStorage(STORAGE_KEYS.searchViewMode)` in der View.
- [ ] **Step 2:** Die Props in `SearchHeader`, `FilterSidebar`, `MobileFilterSheet` und `RecipeCard` wie oben ergänzen. Die Abschnitte in `FilterSidebar.tsx:411-582` bekommen je einen Schlüssel aus `FilterSection`.
- [ ] **Step 3:** `RecipeSearchClient` setzt sich nur noch aus `useRecipeFilterState({ …, sortStorageKey: STORAGE_KEYS.searchSort, sortLocked })`, `useFilterUrlSync`, `useRecipeSearch`, `useStableFacets` und `RecipeSearchView` zusammen.
- [ ] **Step 4:** `npx tsc --noEmit -p .` meldet nur den bekannten Fehler `licenses.json`. `npm run lint` ist sauber. Die Tests aus Task 1–3 sind grün.
- [ ] **Step 5:** Commit `refactor(search): RecipeSearchView with props for the dialog (KUC-126)`

### Task 5: Startdaten der Filterleiste als Funktion

**Files:**

- Create: `src/app/recipes/start-data.ts`
- Modify: `src/app/recipes/page.tsx`

**Interfaces:**

- Produces:
    - `type SearchStartData = { filterOptions: { tags: string[]; ingredients: string[]; categories: CategoryOption[] }; filterSets: FilterSetWithRelations[]; themes: ThemeChip[]; currentSeason: Season }`
    - `loadSearchStartData(): Promise<SearchStartData>`. Inhalt aus `page.tsx`: `Promise.all` von `fetchFilterTags`, `fetchFilterIngredients`, Kategorien, Filtersets nach `sortOrder`, `getThemeChips().catch(() => [])` und `detectSeason`.
    - Die Kategorien kommen direkt aus der Quelle, auf die `trpc.filters.categories` zugreift, ohne den tRPC-QueryClient. Damit ist die Funktion auch in einer Server-Aktion nutzbar.

- [ ] **Step 1:** Implementieren. `page.tsx` ruft `loadSearchStartData()` auf und behält `mergeFilterSetIntoFilters`.
- [ ] **Step 2:** `tsc` und `lint` sind sauber.
- [ ] **Step 3:** Commit `refactor(search): loadSearchStartData for page and dialog (KUC-126)`

> **Lead-Prüfung nach Teil A:** Beta-Deploy des Zwischenstands ist nicht nötig. Lokal `npm run build` grün. Auf `/recipes` per Hand prüfen:
>
> - Filter setzen, tippen und die Sortierung wechseln, dann Zurück und Vor
> - neu laden mit `?sort=fastest`
> - Liste und Raster, nachladen bis Seite 3

---

## Teil B: Suche mit Grundfilter, Art und gemeinsamer Rangfolge

### Task 6: Index um `categorySlugs` und `ratingCount` erweitern

**Files:**

- Modify: `shared/opensearch/client.ts` (`RECIPES_MAPPINGS`), `worker/queues/opensearch-processor.ts` (Select `ratingCount`, `RecipeDocument`, `transformToDocument`), Suchtreffer von `/api/search/multi` (Datei per `grep -rn "search/multi" src/app/api`)
- Test: `worker/queues/opensearch-document.test.ts`

**Interfaces:**

- Produces:
    - Index-Felder `categorySlugs: keyword[]` (alle Kategorien des Rezepts) und `ratingCount: integer`
    - `transformToDocument` exportieren, damit es testbar ist
    - Die Rezepttreffer von `/api/search/multi` bekommen `categorySlugs` und `tags`

- [ ] **Step 1: Test schreiben.** `document carries all category slugs and rating count`: Ein Rezept mit den Kategorien Beilage und Hauptgericht und `ratingCount` 3 ergibt `categorySlugs: ['beilage', 'hauptgericht']` und `ratingCount: 3`. `categorySlug` bleibt die erste Kategorie.
- [ ] **Step 2:** Der Test schlägt fehl.
- [ ] **Step 3:** Implementieren. Die vorhandene Logik in `client.ts:185-198` ergänzt neue Felder per `putMapping`.
- [ ] **Step 4:** Der Test ist grün.
- [ ] **Step 5:** Commit `feat(search): index all category slugs and rating count (KUC-126)`
- [ ] **Betriebsschritt für den Lead nach dem Deploy:** Auf Beta den Redis-Schlüssel `opensearch:watermark:recipes` löschen und `sync-recipes` in `/admin/worker` starten. Dann läuft ein voller Sync, ohne OpenAI-Kosten.

### Task 7: Mahlzeitart als Regel aus einer Quelle

**Files:**

- Create: `shared/meal-planning/meal-kind.ts`
- Modify: `shared/meal-planning/index.ts` (Export)
- Test: `shared/meal-planning/meal-kind.test.ts`

**Interfaces:**

- Produces:
    ```ts
    type MealKind = 'main' | 'breakfast' | 'snack';
    const MEAL_KIND_LABELS: Record<MealKind, string> = {
        main: 'Hauptgerichte',
        breakfast: 'Frühstück',
        snack: 'Kaffee & Snack',
    };
    function mealKindOf(slot: { key: string; time: string }): MealKind;
    function allowedFor(
        kind: MealKind,
        recipe: { categorySlugs: string[]; tags: string[] },
    ): boolean;
    function mealKindQuery(kind: MealKind): Record<string, unknown>; // OpenSearch bool auf categorySlugs/tags
    ```
- Regeln wie in der Spec, Abschnitt „Welche Rezepte in welchen Reiter dürfen“:
    - Nie allein in einem Platz: `getraenk`, `beilage`, `vorspeise` und `salat`, außer zusammen mit `hauptgericht`.
    - Die Tags `Grundrezept`, `Vorratshaltung` und `Geschenk aus der Küche` schließen immer aus.
    - „Kaffee & Snack“ schließt `getraenk` aus.

- [ ] **Step 1: Tests schreiben**
    - `fixed slots`: BREAKFAST → breakfast, LUNCH → main, DINNER → main, SNACK → snack.
    - `custom slot times`: `c_a` 10:59 → breakfast, 11:00 → main, 14:00 → snack, 16:59 → snack, 17:00 → main, 21:30 → main.
    - `main dish rules`:
        - `['hauptgericht']` erlaubt
        - `['beilage', 'hauptgericht']` erlaubt
        - `['beilage']` nein
        - `['hauptgericht']` mit Tag `Grundrezept` nein
        - `['salat']` nein
    - `breakfast`: `['fruehstueck']` ja; `['backen']` mit Tag `Brunch` ja; `['dessert']` nein.
    - `snack`: `['backen']` ja; `['dessert']` ja; `[]` mit Tag `Kaffee & Kuchen` ja; `['dessert', 'getraenk']` nein.
    - `query matches predicate`: Für eine Tabelle aus 12 Rezepten gilt `evaluate(mealKindQuery(kind), r) === allowedFor(kind, r)` für alle drei Arten. `evaluate` ist im Test ein kleiner Interpreter für `bool`/`must`/`should`/`must_not`/`term`/`terms` über `categorySlugs` und `tags`.
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Die Tests sind grün.
- [ ] **Step 5:** Commit `feat(meal-plan): meal kind rules for slots and search (KUC-126)`

### Task 8: Gemeinsame Rangfolge `shared/recipe-ranking/`

**Files:**

- Create in `shared/recipe-ranking/`: `config.ts`, `vector.ts`, `features.ts`, `dish-type.ts`, `score.ts`, `mmr.ts`, `index.ts`
- Test: `shared/recipe-ranking/ranking.test.ts`, `shared/recipe-ranking/dish-type.test.ts`

**Interfaces:**

- Produces:
    ```ts
    // config.ts: Werte aus Global Constraints, plus expiring 1.5
    const RANKING_CONFIG: RankingConfig;
    // features.ts: was der Server je Rezept lädt (Task 9)
    type RankingRecipe = {
        id: string;
        title: string;
        categorySlugs: string[];
        tags: string[];
        ingredients: { id: string; name: string; root: string | null; optional: boolean }[];
        rating: number;
        ratingCount: number;
        totalTime: number;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
        stepCount: number;
        embedding: number[] | null; // normalisiert
    };
    function meaningfulIngredientIds(r: RankingRecipe): Set<string>; // ohne STAPLE_ROOTS/COMMON_NAME
    function styleTags(r: RankingRecipe): string[]; // STYLE_TAGS
    // dish-type.ts
    type DishType =
        | 'Suppe/Eintopf'
        | 'Salat'
        | 'Nudeln'
        | 'Reis'
        | 'Brot/Teig'
        | 'Kartoffel'
        | 'Hülsenfrüchte'
        | 'Fisch'
        | 'Fleisch'
        | 'Gemüse/Sonstiges';
    function dishTypeOf(r: RankingRecipe): DishType;
    // vector.ts
    function searchVector(
        profile: number[] | null,
        picks: number[][],
        cfg?: RankingConfig,
    ): number[] | null;
    function bayesRating(rating: number, count: number, globalMean: number, m: number): number;
    function globalMeanRating(
        rated: { rating: number; ratingCount: number }[],
        minRated: number,
    ): number; // < minRated → 3.5
    // score.ts
    type ScoreContext = {
        profile: number[] | null;
        picks: RankingRecipe[];
        season: Season;
        globalMean: number;
        expiring: { id: string; name: string }[];
        withReasons: boolean;
    };
    type Scored = {
        id: string;
        relevance: number;
        reason?: string;
        dishType: DishType;
        parts: { taste: number; pick: number; season: number; rating: number; expiring: number };
    };
    function scoreCandidates(
        pool: RankingRecipe[],
        ctx: ScoreContext,
        cfg?: RankingConfig,
    ): Scored[];
    // mmr.ts
    function diversify(
        scored: Scored[],
        pool: Map<string, RankingRecipe>,
        picks: RankingRecipe[],
        cfg?: RankingConfig,
    ): Scored[]; // ganze Reihenfolge
    ```
- Konstanten und Regex aus `scripts/probe-week-selection.mjs` übernehmen:
    - `STYLE_TAGS`, `STAPLE_ROOTS`, `PROTEIN_ROOTS`, `COMMON_NAME`, `ARTS` (Zeilen ~45–145)
    - `artOf` → `dishTypeOf`, `scoreRelevance` → `scoreCandidates`, `buildList` → `diversify` (Zeilen ~191–452)
- Abweichungen vom Prüfskript:
    - `searchVector` mischt `a = 1 − b` mit `b = min(blendMax, blendPerPick · n)`. Ohne Profil ist das Ergebnis der normierte Mittelwert der Auswahl, ohne beides `null`.
    - Pick-Teilwert wie `scoreRelevance`, zusätzlich `− 0.5`, wenn die größte Kosinus-Ähnlichkeit zu einem gewählten Gericht über `nearDuplicate` liegt.
    - Der Geschmack wird per Min-Max über den Pool skaliert, bei `hi == lo` oder ohne Profil ist er 0.5.
    - Saison: 1, wenn der Tag zur Saison passt; 0, wenn nur andere Jahreszeiten getaggt sind; sonst 0.5.
    - `expiring = min(1, gemeinsame Vorrats-Zutaten / 2)` geht nur in die Summe ein, wenn `expiring` nicht leer ist. Der Grund lautet dann `Verbraucht <Name>`.
    - Gründe in derselben Reihenfolge wie im Skript, nur wenn `withReasons`:
        - „Passt zu deinem Geschmack“
        - „Teilt n Zutat(en) mit deiner Auswahl“
        - „Passt zum <Saison>“
        - „Gut bewertet“ (erst ab 3 Bewertungen)
        - „Verbraucht …“
        - Fallback „Gut für die Woche“

- [ ] **Step 1: Tests schreiben** (`ranking.test.ts`; Embeddings als kleine 3-D-Vektoren)
    - `search vector`:
        - nur Profil → normalisiert das Profil
        - Profil und 2 Picks → `b = 0.3`
        - 5 Picks → `b = 0.5` (gedeckelt)
        - kein Profil, 1 Pick → normierter Pick
        - nichts → `null`
    - `bayes damps single ratings`: `bayesRating(5, 1, 3.5, 5) < bayesRating(4.6, 40, 3.5, 5)`. `globalMeanRating` mit 3 bewerteten Rezepten ergibt 3.5.
    - `weights order`: Zwei Rezepte unterscheiden sich nur im Geschmack (1 vs 0), zwei andere nur in der Saison. Der Abstand beim Geschmack ist größer als der bei der Saison.
    - `shared ingredients lift, near duplicates drop`:
        - Ein Kandidat mit 2 gemeinsamen bedeutsamen Zutaten liegt über einem ohne.
        - Salz und Olivenöl zählen nicht.
        - Ein Kandidat mit Kosinus 0.9 zu einem Pick liegt unter einem mit 0.3.
    - `ranks without profile and picks`: Ohne Profil ist `taste` bei allen 0.5. Die Reihenfolge folgt Saison und Bewertung.
    - `mmr caps dish types`: 10 Nudel-Kandidaten mit hoher Relevanz und 5 andere. Unter den ersten 12 nach `diversify` sind höchstens 3 Nudelgerichte.
    - `reasons`: Mit `withReasons` und 2 gemeinsamen Zutaten lautet der Grund „Teilt 2 Zutaten mit deiner Auswahl“. Ohne `withReasons` ist der Grund `undefined`.
    - `dish-type.test.ts`:
        - „Spaghetti Carbonara“ → Nudeln
        - „Linsensuppe“ → Suppe/Eintopf
        - „Ofenlachs“ ohne Treffer, mit Zutat aus der Wurzel `fisch` → Fisch
        - „Nudelsalat“ → Salat (Titel-Treffer Salat und Nudeln je 3, Reihenfolge der Liste entscheidet)
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren, Konstanten wie oben übernommen.
- [ ] **Step 4:** Die Tests sind grün.
- [ ] **Step 5:** Commit `feat(ranking): shared recipe ranking with picks, MMR and reasons (KUC-126)`

### Task 9: Grundfilter und gerankte Suche im Server

**Files:**

- Create:
    - `src/lib/recipeSearchQuery.ts` (reiner Filteraufbau und Kontext)
    - `src/lib/recipes/ranking-features.server.ts` (DB-Lader)
    - `src/lib/recipes/ranked-search.server.ts`
- Modify:
    - `src/lib/recipeSearch.ts` nutzt den Filteraufbau, `queryRecipes(filters, userId, context?)`, Sortierungen `taste`/`week` über `rankedSearch`
    - `src/lib/recipeFilters.ts`: `RecipeSortOption` um `'week'` erweitern und in `validSorts` aufnehmen
    - `src/lib/recipes/taste-ranking.ts`: `resolveEffectiveSort` kennt `week` (Gast → `popular`); `TASTE_POOL_SIZE` und `paginate` entfallen, wenn ungenutzt
    - `src/app/api/recipes/filter/route.ts` parst den Kontext
    - `src/app/recipes/components/useRecipeSearch.ts`: `options.context`, im Query-Key und im Abruf
- Test: `tests/recipes/search-query.test.ts`, `tests/recipes/ranked-search.test.ts`

**Interfaces:**

- Consumes: Task 7 (`mealKindQuery`), Task 8 (alles)
- Produces:
    ```ts
    type RecipeSearchContext = {
        kind?: MealKind;
        excludeIds?: string[];
        pickIds?: string[];
        week?: IsoDate;
    };
    function parseRecipeSearchContext(p: URLSearchParams): RecipeSearchContext | undefined; // Parameter kind, exclude, picks, week; je max. 200/30 Ids, idSchema
    function appendRecipeSearchContext(p: URLSearchParams, c?: RecipeSearchContext): void;
    function buildRecipeBoolQuery(
        filters: RecipeFilterSearchParams,
        context?: RecipeSearchContext,
    ): Record<string, unknown>;
    // Grundfilter (mealKindQuery, must_not ids) steht immer in bool.filter / bool.must_not,
    // auch im OR-Modus, damit Facetten und Treffer ihn enthalten.
    function loadRankingRecipes(db: Db, ids: string[]): Promise<Map<string, RankingRecipe>>;
    function loadGlobalMeanRating(db: Db): Promise<number>; // 10 Min. im Speicher
    type RankDeps = {
        knn(vector: number[], k: number, allowedIds: string[]): Promise<string[]>;
        load: typeof loadRankingRecipes;
        tasteFallback: typeof rankRecipeIdsByTaste;
    };
    function rankedSearch(
        input: {
            idsByRating: string[];
            profile: number[] | null;
            context?: RecipeSearchContext;
            expiring: { id: string; name: string }[];
            season: Season;
            withReasons: boolean;
            globalMean: number;
        },
        deps: RankDeps,
    ): Promise<{ id: string; reason?: string }[]>;
    ```
- Ablauf in `queryRecipes` für `taste`/`week`:
    1. OpenSearch: Bool-Query mit Grundfilter, `size: 1000`, `_source: false`, Sortierung nach Bewertung, gleiche `aggs`. Das liefert die Ids und die Facetten.
    2. Bei `week` werden Profil, Picks (`pickIds` über `loadRankingRecipes`) und Vorrat geladen. Der Vorrat kommt aus der vorhandenen Abfrage in `getLeftoverHints` (`src/lib/pantry/leftovers.ts`), nur Ids und Namen.
    3. `rankedSearch`:
        - Ist der Vektor nicht `null`, liefert kNN die Top 150 aus den erlaubten Ids. Sonst nimmt es die ersten 300 nach Bewertung.
        - Bei weniger als 12 Treffern wird mit den bestbewerteten Ids aufgefüllt.
        - Danach: Merkmale laden, `scoreCandidates`, `diversify`.
    4. Die Seite `page`/`limit` aus der Reihenfolge schneiden. Die Karten holt eine `ids`-Query auf den Index, in derselben Reihenfolge. `reason` kommt nur bei `week` dazu. `meta.total` ist die Länge der Reihenfolge.
- kNN wie im Prüfskript, `knn(...)` in Zeile ~293: `query: { knn: { embedding: { vector, k, filter: { terms: { id: allowedIds } } } } }`, `_source: false`. Wirft kNN einen Fehler, nutzt `rankedSearch` `tasteFallback` mit denselben Ids (Kosinus über die DB), ohne Profil die Bewertung.

- [ ] **Step 1: Tests schreiben**
    - `search-query.test.ts`:
        - `context round trip`: `parse(append(ctx))` ergibt `ctx`. Mehr als 200 `exclude`-Ids werden abgeschnitten, ungültige Ids verworfen, eine unbekannte `kind` ergibt `undefined`.
        - `base filter stays out of visible filters`: `buildRecipeFilterQuery(filters)` enthält weder `kind` noch `exclude`.
        - `base filter is in filter even in OR mode`: Mit `filterMode: 'or'` und `kind: 'main'` steht `mealKindQuery('main')` in `bool.filter`, die Ids stehen in `bool.must_not`.
        - `same clauses as before`: Für 4 typische Filter (Query, Tags, Ausschluss, Zeitbereich) ohne Kontext ergibt `buildRecipeBoolQuery` dieselbe Query wie die alte Inline-Logik. Erwartete Objekte stehen im Test.
    - `ranked-search.test.ts`, mit Fake-`RankDeps`:
        - `uses knn with picks blended`: `knn` erhält einen Vektor ungleich dem Profil und `allowedIds` gleich `idsByRating`.
        - `fills up below 12`: `knn` liefert 5 Ids. Das Ergebnis hat 12 Ids, die fehlenden 7 in der Reihenfolge der Bewertung.
        - `falls back when knn throws`: `knn` wirft. `tasteFallback` wird mit denselben Ids aufgerufen, das Ergebnis ist nicht leer.
        - `no vector, no knn`: Ohne Profil und Picks wird `knn` nicht aufgerufen.
        - `excludes picks`: Die Ids aus `excludeIds` kommen nie im Ergebnis vor, auch nicht beim Auffüllen.
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren. `semanticRecipeSearch` bleibt unverändert.
- [ ] **Step 4:** Die Tests sind grün. Die Tests aus Teil A und `tests/recipes/taste-ranking.test.ts` werden angepasst, falls entfernte Exporte betroffen sind.
- [ ] **Step 5:** Commit `feat(search): base filter context and shared ranking for taste and week sort (KUC-126)`

### Task 10: „Probier auch mal“ und „Dazu passt“

**Files:**

- Create: `shared/recipe-ranking/try-also.ts`, `shared/meal-planning/side-dish.ts`, `src/app/plan/selection-actions.ts` (zunächst `loadTryAlso` und `loadSideDishes`)
- Test: `shared/recipe-ranking/try-also.test.ts`, `shared/meal-planning/side-dish.test.ts`

**Interfaces:**

- Consumes: Tasks 7–9
- Produces:

    ```ts
    function pickTryAlso(pool: RankingRecipe[], ctx: { profile: number[] | null; picks: RankingRecipe[]; globalMean: number; seed: string; need: number; minBayes: number }): { id: string; reason: string }[];
    // minBayes 3.8; zu wenige darüber → mit höchsten bayes auffüllen; max. 1 je DishType und je Stil-Tag;
    // Gegenpol = kleinste Kosinus-Ähnlichkeit zu Profil, sonst zum Mittel der Picks, sonst hash01(seed+id);
    // reason "Mal was anderes: <Stil-Tag oder DishType>"
    type SideNeed = 'starch' | 'veg' | null;
    function sideNeedOf(main: RankingRecipe): SideNeed;   // STARCH_NAME/STARCH_ROOTS, VEG_NAME/NOT_VEG_NAME aus dem Prüfskript; Sättigendes gewinnt
    function isSauceTitle(title: string): boolean;        // SAUCE_TITLE
    function pickSide(main: RankingRecipe, candidates: RankingRecipe[]): { id: string; need: Exclude<SideNeed, null> } | null;
    // Kandidaten: need starch → Kategorie beilage, need veg → salat; nie hauptgericht, nie Sauce; Rang = 0.7·Kosinus zum Hauptgericht + 0.3·bayes-Teilwert
    // Server-Aktionen (über run):
    loadTryAlso(input: { startDate: IsoDate; filters: RecipeFilterSearchParams; pickIds: string[]; excludeIds: string[]; need: number }): Promise<PlanActionResult<RecipeCardData[]>>;
    loadSideDishes(input: { filters: RecipeFilterSearchParams; mainIds: string[] }): Promise<PlanActionResult<Record<string, { card: RecipeCardData; label: string } | null>>>;
    // label "Dazu passt: <Titel>"; Kandidaten über buildRecipeBoolQuery(filters, { kind: undefined }) plus Kategorie-Filter → Filter wie "ohne Kartoffeln" gelten
    ```

- [ ] **Step 1: Tests schreiben**
    - `try-also.test.ts`:
        - `picks the farthest from the profile`
        - `one per dish type and style`
        - `nothing from the list` (Ids aus `exclude` fehlen)
        - `refill keeps need` (`need` 1 liefert genau 1)
        - `returns empty without candidates`
        - `seeded spread is stable` (gleicher Seed, gleiche Ids)
    - `side-dish.test.ts`:
        - `starch missing → Beilage`: Gulasch ohne Kartoffeln oder Nudeln
        - `veg missing → Salat`: Spaghetti Carbonara (Starch ja, Gemüse nein)
        - `both missing → starch wins`
        - `nothing missing → null`
        - `sauce is never a side`: Kandidat „Bratensoße“ in der Beilage
        - `filters apply`: Ohne Kandidaten mit Kartoffeln, also nach dem Filter, gibt es keine Ofenkartoffeln.
        - `no duplicate`: Zwei Hauptgerichte bekommen nicht dieselbe Beilage, wenn es eine zweite gibt.
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Die Tests sind grün.
- [ ] **Step 5:** Commit `feat(meal-plan): try-also row and side dish suggestions (KUC-126)`

---

## Teil C: Verteilen, Dialog und Einstieg

### Task 11: Verteilen auf die Plätze

**Files:**

- Create: `shared/meal-planning/effort.ts`, `shared/meal-planning/distribute.ts`
- Test: `shared/meal-planning/distribute.test.ts`

**Interfaces:**

- Consumes: Task 7 (`MealKind`), `durationFit`, `diffDays`, `isWeekend`, `addDays` aus `shared/meal-planning`
- Produces:
    ```ts
    function effortOf(r: {
        stepCount: number;
        totalTime: number;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    }): number; // Prüfskript `effort`, Zeile ~207
    type SelectionSlot = { date: IsoDate; slotKey: string; kind: MealKind };
    type SelectionPick = {
        recipeId: string;
        kind: MealKind;
        servings: number;
        effort: number;
        totalTime: number;
        mainCategory: string | null;
        dishType: string;
        shortestShelfLifeDays: number | null;
        sideRecipeId?: string;
    };
    type PlannedEntry = {
        date: IsoDate;
        slotKey: string;
        recipeId: string;
        servings: number;
        leftoverOf?: number /* Index des Haupteintrags */;
        sideOf?: number;
    };
    function leftoverDays(servings: number, household: number): number;
    function distributeSelection(
        picks: SelectionPick[],
        slots: SelectionSlot[],
        ctx: { household: number; purchaseDate: IsoDate },
    ): { entries: PlannedEntry[]; unplaced: string[] };
    ```
- Algorithmus (gierig):
    - Für jedes Paar aus Gericht und Platz derselben Art gilt `fit = 1.0·effortFit + 1.0·durationFit + 1.5·freshFit − 1.0·variety`.
        - `effortFit`: am Wochenende `effort`, sonst `1 − effort`
        - `freshFit`: `1 − p · clamp01(diffDays(date, purchaseDate) / 6)` mit `p = shortestShelfLifeDays == null ? 0 : clamp01(1 − days / 7)`
        - `variety`: 1, wenn am Vor- oder Folgetag schon ein Gericht mit gleicher `mainCategory` oder gleichem `dishType` steht
    - Bestes Paar zuordnen, `variety` neu berechnen und wiederholen.
    - Ein Paar ist nur zulässig, wenn auch alle `leftoverDays` des Gerichts Platz finden: zuerst derselbe `slotKey` am Folgetag, sonst der nächste freie gewählte Platz derselben Art nach dem Datum.
    - Reste-Einträge haben `servings = household`, das Hauptgericht hat `servings = pick.servings`.
    - Eine Beilage wird ein Eintrag mit `sideOf` im selben Platz und mit denselben Portionen.

- [ ] **Step 1: Tests schreiben**
    - `leftover day`: Haushalt 2, 4 Portionen → 2 Einträge, der zweite am Folgetag im selben Platz mit `leftoverOf: 0` und `servings` 2. Bei 3 Portionen gibt es keinen Reste-Eintrag.
    - `leftover moves to next free slot of the kind`: Der Folgetag ist nicht gewählt, der übernächste schon → der Reste-Eintrag landet dort.
    - `heavy dish goes to the weekend`: effort 0.9 und 0.1, Plätze Mi und Sa → das aufwändige Gericht landet am Samstag.
    - `perishable goes early`: Fisch (Haltbarkeit 2 Tage) und Linsen (`null`), Plätze Mo und Do, Einkauf Mo → der Fisch landet am Montag.
    - `no same category on neighbour days`: 2 Nudelgerichte und 1 Reisgericht auf Mo, Di und Mi → die Nudeln stehen nicht nebeneinander.
    - `only matching kind`: Ein Frühstück landet nie im Abendplatz.
    - `fewer picks than slots`: Die übrigen Plätze bleiben ohne Eintrag.
    - `too many leftovers`: Ein Gericht, dessen Reste-Tage keinen Platz finden, steht in `unplaced`.
    - `side dish`: Ein Eintrag mit `sideOf` steht im selben Platz.
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Die Tests sind grün.
- [ ] **Step 5:** Commit `feat(meal-plan): distribute selection with leftovers, effort and freshness (KUC-126)`

### Task 12: Zustand der Auswahl im Dialog

**Files:**

- Create: `src/components/meal-plan/selection/selection-state.ts`
- Test: `tests/meal-plan/selection-state.test.ts`

**Interfaces:**

- Consumes: `leftoverDays` (Task 11), `MealKind`
- Produces:

    ```ts
    type Pick = {
        recipe: RecipeCardData;
        kind: MealKind;
        servings: number;
        side?: { card: RecipeCardData; accepted: boolean };
    };
    type SelectionState = {
        household: number;
        chosenSlots: string[] /* "date|slotKey" */;
        slotKinds: Record<string, MealKind>;
        picks: Pick[];
    };
    type SelectionAction =
        | { type: 'toggleSlot'; key: string }
        | { type: 'setSlots'; keys: string[] }
        | { type: 'togglePick'; recipe: RecipeCardData; kind: MealKind }
        | { type: 'servings'; recipeId: string; delta: 1 | -1 }
        | { type: 'side'; recipeId: string; side: { card: RecipeCardData } | null }
        | { type: 'acceptSide'; recipeId: string; accepted: boolean };
    function selectionReducer(s: SelectionState, a: SelectionAction): SelectionState;
    function capacityOf(s: SelectionState, kind: MealKind): number; // gewählte Plätze der Art
    function usedOf(s: SelectionState, kind: MealKind): number; // Σ 1 + leftoverDays
    function canPick(s, kind): boolean;
    function canIncrement(s, recipeId): boolean;
    function tabsOf(
        s,
    ): { kind: MealKind; label: string; used: number; capacity: number; full: boolean }[]; // nur Arten mit capacity > 0, Reihenfolge main, breakfast, snack
    ```

- [ ] **Step 1: Tests schreiben**
    - `pick starts with household servings`
    - `toggle twice unpicks`
    - `full tab blocks picks`
    - `plus is blocked when the next portion needs a slot`: Haushalt 2, Kapazität 2, ein Pick mit 2 Portionen. 3 geht, 4 braucht einen Reste-Tag und geht noch. 6 bräuchte einen dritten Platz und ist gesperrt.
    - `minus never below 1`
    - `deselecting a slot drops overflowing picks from the end`: Kapazität sinkt auf 1 → der letzte Pick der Art fällt weg.
    - `tabs only for kinds with slots`, und `full` ist wahr bei `used == capacity`.
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Die Tests sind grün.
- [ ] **Step 5:** Commit `feat(meal-plan): selection state for the week dialog (KUC-126)`

### Task 13: Öffnen und Übernehmen auf dem Server

**Files:**

- Create: `src/lib/meal-plan/selection.ts` (lädt und schreibt; nimmt `db`)
- Modify: `src/app/plan/selection-actions.ts`
- Test: `tests/meal-plan/selection.test.ts` (mit `tests/meal-plan/fake-db.ts` wie `tests/meal-plan/edit.test.ts`)

**Interfaces:**

- Consumes: `loadWeekContext` (`week-planner.ts:48`), `addMealPlanEntry`, `mealKindOf`, `allowedFor`, `distributeSelection`, `loadRankingRecipes`, `loadSearchStartData`, `purchaseDateFor` (`mappers.ts:252`), Haltbarkeit der Zutaten wie in `previewShelfLifeOrder`
- Produces:

    ```ts
    type WeekSelectionOpen = {
        startDate: IsoDate; days: IsoDate[]; household: number;
        slots: { key: string; label: string; time: string; kind: MealKind }[];
        occupied: string[];                  // "date|slotKey" mit Eintrag
        startData: SearchStartData;
    };
    openWeekSelection(input: { startDate: IsoDate }): Promise<PlanActionResult<WeekSelectionOpen>>;     // run
    applyWeekSelection(input: { startDate: IsoDate; slots: string[]; picks: { recipeId: string; kind: MealKind; servings: number; sideRecipeId?: string }[] }): Promise<PlanActionResult<{ planned: number; skipped: number; unplaced: number; entryIds: string[] }>>; // runWrite
    // lib: planWeekSelection(db, userId, input) — validiert (zod, max 40 slots, 30 picks),
    // prüft allowedFor je Pick serverseitig, verwirft belegte Plätze (skipped), verteilt, schreibt
    // Haupteinträge zuerst, dann Reste mit leftoverOfId und Beilagen mit position 1.
    ```

- [ ] **Step 1: Tests schreiben**
    - `writes picks into chosen slots`: 2 Picks, 2 freie Plätze → 2 Einträge, `planned` 2.
    - `writes leftover entries linked to the main entry`: `leftoverOfId` zeigt auf die Id des Haupteintrags.
    - `skips slots taken meanwhile`: Ein gewählter Platz ist in der Fake-DB inzwischen belegt → `skipped` 1, dort entsteht kein Eintrag.
    - `rejects a recipe not allowed for the kind`: Eine Sauce als `main` ergibt einen `ZodError` oder `DataAccessError` `INVALID`, und es wird nichts geschrieben.
    - `side dish lands at position 1 with main servings`
- [ ] **Step 2:** Die Tests schlagen fehl.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Die Tests sind grün.
- [ ] **Step 5:** Commit `feat(meal-plan): open and apply week selection (KUC-126)`

### Task 14: Der Dialog

**Files:**

- Create in `src/components/meal-plan/selection/`:
    - `WeekSelectionDialog.tsx`
    - `SlotPicker.tsx`
    - `KindTabs.tsx`
    - `SelectionCardFooter.tsx`
    - `TryAlsoRow.tsx`
    - `SelectionBar.tsx`
    - `useWeekSelection.ts`
    - `usePersistedFilters.ts`
- Modify: `src/lib/storageKeys.ts` (`weekSelectionFilters: 'kitchenpace-week-selection-filters'`)

**Interfaces:**

- Consumes: Tasks 4, 9, 10, 12, 13
- Produces: `WeekSelectionDialog` mit den Props `{ startDate: IsoDate; open: boolean; onOpenChange(open: boolean): void; onApplied(r: { planned: number; skipped: number; entryIds: string[] }): void }`
- Aufbau nach Mock A (`design/wochenauswahl/a-desktop.html`, `a-mobile.html`):
    - Hülle: Radix `Dialog` wie in `SlotSearchDialog.tsx`. Desktop breit, mobil Vollbild. Der Inhaltsbereich ist das `scrollElement` von `RecipeSearchView`.
    - Kopf mit `SlotPicker`: Mahlzeit- und Tage-Chips. Vorbelegt sind die freien Plätze, belegte sind gesperrt. Mobil ist der Kopf eine Zeile zum Aufklappen.
    - Reiter `KindTabs`: `tabsOf(state)` mit „gewählt/Plätze“. Ein voller Reiter wird grün.
    - Such-Baustein: `RecipeSearchView` mit:
        - `title` = Name des Reiters
        - `sortOptions` = `[{ value: 'week', label: 'Passt zu deiner Woche' }, ...searchSortOptions(true)]`
        - `hiddenSections: ['categories']`
        - `leading` = gewählte Karten des Reiters in der Reihenfolge der Wahl
        - `renderCardSelection` aus `canPick`/`canIncrement`
        - `listFooter` = `TryAlsoRow`, nur im Reiter `main`. Die Reihe wird einmal je Öffnen geladen und bleibt stehen. Wird eine ihrer Karten gewählt, wandert sie in die Auswahl, und `loadTryAlso({ need: 1, excludeIds: Liste ∪ Reihe ∪ Auswahl })` füllt den Platz nach.
    - Filterzustand: `useRecipeFilterState({ initialFilters: gespeicherter Stand, defaultSort: 'week', isLoggedIn: true })`. Kein URL-Abgleich. `usePersistedFilters` schreibt Änderungen nach `STORAGE_KEYS.weekSelectionFilters`, „Zurücksetzen“ leert den gespeicherten Stand.
    - Abfrage: `useRecipeSearch(filters, { context: { kind, excludeIds: alle Pick-Ids, pickIds: um 300 ms verzögert, week: startDate } })`
    - `SelectionCardFooter`: + / − mit `ServingsStepper` aus `FormParts.tsx`, „+1 Reste-Tag“ ab `leftoverDays ≥ 1`, „Dazu passt: … +“. `loadSideDishes` läuft nach jeder Wahl eines Hauptgerichts.
    - `SelectionBar` fest am unteren Rand: kleine Bilder der Auswahl, „4 von 8 Plätzen“, auf dem Desktop die Zähler je Art, Fortschritt und „Übernehmen“ (primär).
    - Nach dem Übernehmen schließt der Dialog. `onApplied` zeigt über `useToastContext` „5 Gerichte eingeplant“ mit der Aktion „Auf die Einkaufsliste“, die `addMealPlanEntriesToShoppingList(entryIds)` aufruft. Bei `skipped > 0` steht dazu „· 1 Platz war inzwischen belegt“.
- Ränder nur mit `border{Side}Color` (siehe Global Constraints).

- [ ] **Step 1:** Die Bausteine implementieren. Reiner Code (Zähler, Bezeichnungen) bleibt in `selection-state.ts` und ist dort getestet.
- [ ] **Step 2:** `tsc` und `lint` sind sauber, alle Unit-Tests grün.
- [ ] **Step 3:** Commit `feat(meal-plan): week selection dialog on the shared search view (KUC-126)`

### Task 15: Einstieg ersetzen, Altes entfernen, Platz-Suche

**Files:**

- Modify:
    - `src/components/meal-plan/intelligence/IntelligentWeekView.tsx`: Der Vorschlags-Zustand, `plan`, `swap`, `accept` und die gestrichelte Leiste entfallen. „Plan mir die Woche“ öffnet `WeekSelectionDialog`, danach `router.refresh()`.
    - `src/app/plan/intelligence-actions.ts`: `planWeekAction`, `swapSuggestionAction` und `acceptSuggestionsAction` entfallen.
    - `src/lib/meal-plan/intelligence/week-planner.ts`: `suggestForWeek`, `swapForWeek`, `toSuggestionDTO`, `seedOf` und die DTOs entfallen. `loadRecipeRows` und `toCandidates` bleiben für `getLeftoverNotices`.
    - `shared/meal-planning/index.ts` (Export `suggest-week` entfernen)
    - `src/components/meal-plan/types.ts`, `WeekView.tsx`: Erweiterungspunkt `suggestions`, wenn danach ungenutzt
    - `src/app/plan/actions.ts` → `getPickerLists(input?: { slotKey: string; time: string })` filtert Favoriten und Gekochtes mit `allowedFor(mealKindOf(...))`. `pickerSelect` bekommt Kategorie-Slugs und Tags.
    - `src/components/meal-plan/SlotSearchDialog.tsx`: Übergibt den Platz und filtert die Treffer der Mehrfachsuche mit `allowedFor`. Die Felder kommen aus Task 6.
    - `src/app/changelog/page.tsx`: neuer Eintrag aus Nutzersicht
- Delete:
    - `src/components/meal-plan/intelligence/SuggestionCard.tsx`
    - `shared/meal-planning/suggest-week.ts` und `suggest-week.test.ts`
    - Tests in `tests/meal-plan/intelligence/week-planner.test.ts`, die nur die entfernten Funktionen prüfen
- Test: `tests/meal-plan/picker-kind.test.ts`

**Interfaces:**

- Consumes: Tasks 7, 14
- Produces: nichts Neues für andere Tasks

- [ ] **Step 1: Test schreiben.** `picker lists hide sauces for dinner`: Mit der Fake-DB enthalten Favoriten mit „Bratensoße“ (`beilage`) und „Gulasch“ (`hauptgericht`) für den Platz `DINNER` nur Gulasch. Für einen eigenen Platz um 15:30 gilt die Regel für Snacks.
- [ ] **Step 2:** Der Test schlägt fehl.
- [ ] **Step 3:** Umsetzen. Mit `grep -rn "suggestWeek\|SuggestionDTO\|planWeekAction\|SuggestionCard" src shared tests` prüfen, dass kein Verweis übrig ist.
- [ ] **Step 4:** Der gesamte Test-Lauf aus den Global Constraints ist grün. `npx tsc --noEmit -p .` meldet nur den bekannten Fehler `licenses.json`. `npm run lint` ist sauber.
- [ ] **Step 5:** Der Changelog-Text lautet: „Plan mir die Woche“ öffnet jetzt eine Auswahl wie bei einer Kochbox: Gerichte wählen, Portionen anpassen, „Übernehmen“ verteilt sie auf die Woche.
- [ ] **Step 6:** Commit `feat(meal-plan): week selection replaces the old week planner (KUC-126)`

### Task 16: Gesamtprüfung (Lead)

- [ ] **Build:** `next build` gegen eine Wegwerf-Postgres-DB (Stand Key facts: `docker run --network container:$(hostname) -e PGPORT=55432 postgres:16-alpine`, `prisma migrate deploy`, `npm run build`). Erwartet: grün.
- [ ] **Unit-Tests:** der gesamte Lauf aus den Global Constraints. Erwartet: grün, Anzahl notieren.
- [ ] **Review des Branch-Diffs gegen die Spec** durch den Lead, besonders die Punkte im Review Focus.
- [ ] **Nach OK des Nutzers:** Merge `--no-ff` nach `feat/KUC-79-wochenplan`, dann Beta. Den Betriebsschritt aus Task 6 ausführen (Watermark löschen, `sync-recipes`).
- [ ] **Auf Beta von Hand prüfen:**
    - `/recipes` wie nach Teil A
    - den Dialog mit dem Profil von Seb
    - Gewichte gemeinsam mit dem Nutzer einstellen
- [ ] **KUC-126:** Übergabekommentar nach dem YouTrack-Skill. Das Ticket bleibt auf Doing bis zur Abnahme.
