# Wochenplan-Datenmodell (KUC-98)

Eine Migration (`prisma/migrations/20261121210000_meal_plan_shopping_pantry`) für alle Untertickets des Epics KUC-79 sowie die Themen-Cluster aus KUC-111.

## Migration

- Bricht mit einer Fehlermeldung ab, wenn `MealPlan`, `MealPlanRecipe`, `ShoppingList` oder `ShoppingItem` Zeilen enthalten. Diese vier Tabellen werden umgebaut; auf Live sind sie leer.
- `BringConnection` bekommt nur neue Spalten mit Standardwerten. Die bestehende Zeile bleibt erhalten; das ist auf einer DB mit altem Stand geprüft.
- CHECK-Constraints spiegeln die Zod-Regeln: Slot genau einmal, `HH:MM`, Portionen 1–100, Wochentage 1–7, `itemKey` passt zur Zutat, Menge nur mit Basiseinheit.

## Modelle je Ticket

| Ticket                    | Modelle / Felder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KUC-98/99/100 Plan        | `MealPlanRecipe`: `userId`, `recipeId` (Pflicht), `date @db.Date`, `mealType` **oder** `customMealType`, `position` (mehrere Gerichte je Slot), `time` (lokal `HH:MM`, null = Slot-Standard), `servings`, `status`, `notes`                                                                                                                                                                                                                                                                                                          |
| KUC-101 Bearbeiten        | `MealPlanRecipe.leftoverOfId` (Rest-Folgeeintrag), `MealPlanTemplate` + `MealPlanTemplateEntry` (`dayOffset` 0–6)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| KUC-102 Einstellungen     | `Profile`: `householdSize` (null = noch nicht gefragt), `weekStartDay`, `shoppingDay`, `timezone`, `mealPlanShowTime/Servings/Calories`, `mealPlanSlots` (JSON), `quietHoursStart/End`; `MealPlan.slotOverride` gilt nur für eine Woche                                                                                                                                                                                                                                                                                              |
| KUC-103 Gekocht           | `MealPlanRecipe.cookedAt`, `cookHistoryId @unique` (keine Doppelzählung), `pantryBookedAt` (Vorrat gebucht, auch „angenommen gekocht“)                                                                                                                                                                                                                                                                                                                                                                                               |
| KUC-96 Haltbarkeit        | `MealPlanRecipe.pinned` (fixierte Slots werden nicht verschoben)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| KUC-104/105 Einkaufsliste | `ShoppingList` (eine je Nutzer, `userId @unique`); `ShoppingItem` mit `itemKey` (`i:<ingredientId>` / `t:<normalisierter Name>`), eindeutig je Liste (dazu eindeutig je `ingredientId`), `status` OPEN/PURCHASED/DORMANT, `quantity` + `baseUnit` (G/ML/PIECE) + `displayUnit` + `quantityText`, `note`, `position`, `statusChangedAt`; `ShoppingItemSource` (Herkunft mit Originalangabe, Rezept, Plan-Eintrag); `ShoppingHistory` (ADDED/PURCHASED, Zeitpunkt, Menge, Rezept, Quelle KOCHTAKT/BRING)                               |
| KUC-106 Bring!-Sync       | `BringConnection`: `syncEnabled`, `syncListUuid`, `syncStatus`, `lastSyncAt`, `lastSyncError`, `syncErrorCount`, `syncSnapshot`; `ShoppingItem`: `bringName`, `bringSpec`, `bringSyncHash`, `bringSyncedAt`; `BringSyncConflict` (Protokoll)                                                                                                                                                                                                                                                                                         |
| KUC-107 Vorrat            | `PantryItem`: Zutat/Name, `quantity` + `baseUnit` + `quantityText`, `approximate` („~“), `source`, `status` AVAILABLE/USED_UP/DISCARDED, `purchasedAt`, `openedAt`, `expiresAt`, Verweis auf Kauf und Plan-Eintrag                                                                                                                                                                                                                                                                                                                   |
| KUC-108 Reste-Vorschläge  | `PantryItem.leftoverHintDismissedAt`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| KUC-109 Erinnerungen      | `Profile.notifyOnCookStart` (+ vorhandenes `notifyOnWeeklyPlanReminder`); `MealPlanReminder` je Nutzer, Art (COOK_START/WEEKLY_PLAN), Tag und Slot: `scheduledFor`, `jobId`, `fingerprint`, `status`, `sentAt`                                                                                                                                                                                                                                                                                                                       |
| KUC-110 Teilen            | `MealPlan` (Wochen-Datensatz, `@@unique([userId, startDate])`): `shareToken @unique`, `shareCreatedAt`, `shareRevokedAt`, `shareModerationStatus`                                                                                                                                                                                                                                                                                                                                                                                    |
| KUC-111 Themen-Cluster    | `RecipeClusterRun` (`k`, `seed`, `model`, `status`, `recipeCount`, `iterations`, `stabilityRatio`, `error`, `approvedAt`, `approvedById`, `finishedAt`); `RecipeCluster` (`runId`, `key` stabil über Läufe, `label`, `centroid Float[]` wie `RecipeEmbedding.embedding`, `size`, `filterTags String[]` (Tag-Namen), `filterCategories String[]` (Kategorie-Slugs), `filters Json?`, `topTerms Json?`, `eligible`, `active` = Freigabe); `RecipeClusterMember` (`clusterId`, `recipeId`, `similarity`, `@@id([clusterId, recipeId])`) |
| KUC-124 Kaufrhythmus      | `ShoppingHistory` (PURCHASED-Zeitpunkte je `itemKey`), `ShoppingSuggestionSnooze` (`snoozedUntil`, `dismissCount`)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| KUC-125 Icons             | `Ingredient.icon`, `IngredientCategory.icon` (IconOven-Name ohne Präfix)                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| KUC-94                    | Packungsgröße, Haltbarkeit nach Anbruch und „anbruchempfindlich“ gibt es bereits; nichts ergänzt                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Mengen

Die Logik liegt in `src/lib/shopping/quantity.ts`:

- Mengen werden in der Basiseinheit gespeichert (g, ml oder Stk).
- Andere Einheiten rechnet die Funktion über `IngredientUnit.grams` um, dann über `Unit.gramsDefault`.
- Stück und Gramm werden nur zusammengezählt, wenn das Stückgewicht der Zutat bekannt ist.
- Was sich nicht sicher umrechnen lässt, bleibt als Text stehen, zum Beispiel „200 g + 1 Bund“.
- Bei Bereichen zählt die Obergrenze („2–3“ → 3), damit genug eingekauft wird.

## Datenzugriff

Alle Funktionen haben die Form `fn(db, userId, input)`. Sie prüfen den Besitz und validieren die Eingabe mit Zod. Ein fremder Datensatz meldet denselben Fehler wie ein fehlender: `DataAccessError` mit `NOT_FOUND`.

- `src/lib/meal-plan/`
    - `week.ts`: Daten, Wochenstart, KW, Zeitzone, Umrechnung nach UTC, sommerzeitsicher
    - `slots.ts`: Standard-Slots, eigene Slots, Overrides
    - `schemas.ts`
    - `repository.ts`: Einstellungen, Einträge, Rückgängig, Gekocht, Wochen-Override
    - `share.ts`
    - `db.ts`
- `src/lib/shopping/`
    - `item-key.ts`, `quantity.ts`, `schemas.ts`
    - `repository.ts`: Liste, Hinzufügen mit Zusammenführen und Wiedereröffnen, Status mit Historie, Snooze
    - `merge-ingredient.ts`: Zutaten-Merge aus KUC-114
- `src/lib/pantry/`
    - `rules.ts`: Ablauf nach Anbruch, Bedingungen für den Rest-Hinweis
    - `repository.ts`

Tests: `npm run test:meal-plan` (nur Unit-Tests, mit einer Fake-DB in `tests/meal-plan/fake-db.ts`).

## Annahmen

- Standard-Slots: Frühstück 07:30, Mittag 12:30 und Abend 19:00 sind an, Snack 15:30 ist aus. Ohne Haushaltsgröße gelten 2 Portionen.
- `MealPlanRecipe.time = null` bedeutet „Standardzeit des Slots“. So wirken geänderte Slot-Zeiten auch auf bestehende Einträge.
- Eigene Slots haben einen Schlüssel `c_<slug>` in `customMealType`; Name und Zeit stehen im Slot-JSON.
- Wird ein gekaufter oder ruhender Artikel erneut hinzugefügt, beginnt eine neue Runde: Die Menge startet neu und die alten Herkünfte werden entfernt. Die Historie bleibt.
- Ruhezeiten speichert jeder Nutzer selbst; null heißt keine. Die Standardwerte legt KUC-109 fest.
- Wird eine Zutat gelöscht, setzt die DB die Zutat in Liste, Historie und Vorrat auf null. Der Eintrag behält seinen alten `i:`-Schlüssel.
