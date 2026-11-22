# Wochenauswahl im Box-Stil (KUC-126)

Stand: 22.11.2026 (überarbeitet) · Ticket: KUC-126 (Unterticket von KUC-79) · ersetzt „Plan mir die Woche“ aus KUC-113 · Mock: `design/wochenauswahl` (Variante A)

## Anlass

Beta-Test am 22.11.: „Plan mir die Woche“ füllt jeden freien Platz mit dem Rezept, das in einer festen Punkteformel am besten abschneidet. Dabei landete „Salatsoße auf Vorrat“ als Mittagessen. Der Planer prüft weder, ob ein Rezept ein Hauptgericht ist, noch ob es zur Mahlzeit passt. Sein Pool sind die 250 bestbewerteten Rezepte, unabhängig vom Geschmack.

Der Nutzer will stattdessen eine Auswahl wie bei einer Kochbox. Er sieht eine Liste von Gerichten und wie viele er schon gewählt hat. Jedes gewählte Gericht hat + und − für Portionen. Die Liste entsteht aus dem Geschmacksprofil und passt sich live an die Auswahl an. Darunter steht eine Reihe „Probier auch mal“.

Die erste Fassung dieser Spec sah einen eigenen Dialog mit eigener Kandidatenlogik vor. Nach dem Prüfskript hat der Nutzer entschieden: Die Auswahl soll **dieselbe Suche** sein wie `/recipes`, mit allen Pills, Facetten, Filtersets und Filtern (zum Beispiel „ohne Kartoffeln“), nur mit Feinheiten. Doppelten Code soll es nicht geben.

## Ziele und Erfolgskriterien

- Kein Getränk, keine Sauce, keine Beilage und kein Grundrezept steht allein in einem Platz.
- Alle Filter der Suchseite gibt es auch in der Auswahl, aus demselben Code: Suche, Sortierung, Filtersets, Themen, Pills, Filterleiste mit „Enthält nicht“, Facetten mit Zahlen.
- Nach jedem Antippen ordnet sich die Liste neu, ohne dass die Auswahl wartet. Gewählte Karten bleiben stehen.
- „Übernehmen“ füllt genau die gewählten Plätze. Mehr Portionen, als der Haushalt isst, ergeben einen Reste-Tag.
- Die Suchseite verhält sich nach dem Umbau wie vorher: URL, Zurück-Taste, gespeicherte Sortierung, Ansicht, Nachladen.
- Die Reihenfolge folgt einer nachvollziehbaren, getesteten Punkteformel. Die Gewichte werden in der echten Oberfläche auf Beta mit dem Nutzer eingestellt.

## Entscheidungen des Nutzers

| Thema             | Entscheidung                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Einstieg          | Ersetzt „Plan mir die Woche“. Die alten gestrichelten Vorschlagskarten und „Alle übernehmen“ entfallen.                               |
| Form              | Dialog im Plan (Handy: Vollbild). Er nutzt die Suchseite als gemeinsamen Baustein. Die Suchseite wird dafür aufgeteilt.               |
| Mahlzeitarten     | Reiter je Art: „Hauptgerichte“, „Frühstück“, „Kaffee & Snack“. Nur Arten, die in den gewählten Plätzen vorkommen. Zähler je Reiter.   |
| Art als Filter    | Die Reiter sind die Art. Es gibt keine Art-Pill und keine Kategorien in der Filterleiste des Dialogs.                                 |
| Tage              | Gewählte Gerichte werden beim Übernehmen automatisch auf die Plätze verteilt.                                                         |
| Anzahl            | Kopf mit Mahlzeit- und Tage-Chips, vorbelegt mit den freien Plätzen. Die Zielanzahl je Art ergibt sich daraus.                        |
| Live-Anpassung    | Ergänzen statt wiederholen: Gemeinsame Zutaten geben Pluspunkte, fast gleiche Gerichte Abzug, Abwechslung in der Liste.               |
| Probier auch mal  | Eigene Reihe unter der Liste. Gut bewertete Gerichte, die weit weg vom Geschmacksprofil liegen.                                       |
| Portionen         | Start mit der Haushaltsgröße. + / − ändert die Menge. Was über den Haushalt hinausgeht, ergibt automatisch einen Reste-Tag.           |
| Aufwand           | Über die vorhandenen Filter (Dauer, Schwierigkeit, Arbeitsschritte) und die Sortierung „Schnellste“. Keine eigene Aufwandssortierung. |
| Ohne Profil       | Beliebte und saisonale Gerichte. Ab dem ersten gewählten Gericht übernimmt die Auswahl als Suchvektor.                                |
| Beilagen          | „Dazu passt“ nur, wenn dem Hauptgericht Sättigendes oder Gemüse fehlt, höchstens ein Vorschlag je Karte.                              |
| Eigene Mahlzeiten | Die Art ergibt sich aus der Uhrzeit des Platzes. „Kaffee & Snack“ ist eine eigene Art.                                                |
| Umfang            | Alles in einem Release, zusammen mit dem Wochenplan-Epic.                                                                             |

## Ablauf

1. Im Plan öffnet „Plan mir die Woche“ den Dialog für die gezeigte Woche. Desktop: breiter Dialog. Handy: Vollbild.
2. **Kopf:**
    - Mahlzeit-Chips: aktive Plätze der Woche, also feste und eigene.
    - Tage-Chips: Mo–So.
    - Vorbelegt ist jede Kombination aus Mahlzeit und Tag, die im Plan frei ist. Belegte Plätze sind nicht wählbar.
    - Auf dem Handy ist der Kopf eine Zeile („8 freie Plätze · Abend, Frühstück Sa/So, Kaffee So ›“), die sich aufklappen lässt.
3. **Reiter je Art** mit Zähler „gewählt/Plätze“, zum Beispiel „Hauptgerichte 3/5“. Ein voller Reiter wird grün.
4. **Such-Baustein** (identisch mit `/recipes`):
    - Suchfeld, Sortierung, Filtersets und Themen, aktive Filter als Pills, Filterleiste (Desktop links, Handy als Sheet hinter „Filter“).
    - Die Sortierung bietet „Passt zu deiner Woche“ (Standard) und die Sortierungen der Suchseite.
    - Die Filter gelten für alle Reiter. Die Art kommt nur aus dem Reiter.
5. **Liste „Passt zu deiner Woche“:** Karten mit Bild, Titel, Dauer, Schwierigkeit und einem kurzen Grund. Gewählte Karten stehen vorn in der Reihenfolge, in der sie gewählt wurden.
6. **Reihe „Probier auch mal“** unter der Liste: 4–6 Karten, horizontal scrollbar. Nur im Reiter „Hauptgerichte“.
7. **Antippen** wählt ein Gericht. Die gewählte Karte zeigt + / − für Portionen, gegebenenfalls „+1 Reste-Tag“ und einen „Dazu passt“-Vorschlag. Erneutes Antippen hebt die Auswahl auf. Ist ein Reiter voll, sind seine übrigen Karten blass und nicht wählbar, und + ist gesperrt, wenn es einen weiteren Platz bräuchte.
8. **Untere Leiste,** fest am Rand: gewählte Gerichte als kleine Bilder, „4 von 8 Plätzen“, auf dem Desktop dazu die Zähler je Art, Fortschritt und „Übernehmen“. „Übernehmen“ geht auch mit weniger Gerichten als Plätzen.
9. **Übernehmen:**
    - Verteilt die Auswahl auf die gewählten Plätze und schreibt den Plan.
    - Schließt den Dialog.
    - Zeigt eine Meldung, zum Beispiel „5 Gerichte eingeplant · Auf die Einkaufsliste?“. Die Aktion dahinter gibt es bereits.

## Gemeinsamer Such-Baustein

Die Suchseite besteht heute aus prop-gesteuerten Bausteinen und einer Hülle, die an der Seite hängt. Die Bausteine bleiben, die Hülle wird aufgeteilt.

**Bleibt wie es ist** (reine Props):

- `FilterSidebar`, `ActiveFilters`, `FilterSetChipBar`, `SearchableFilterChips`, `MobileFilterSheet`
- `useRecipeSearch`, `useStableFacets`, `/api/recipes/filter`, `queryRecipes`

**Wird aufgeteilt:**

| Heute                                                   | Danach                                                                                                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useSearchFilters` schreibt jede Änderung in die URL    | `useRecipeFilterState` hält nur den Zustand (Filter, Suchtext, Sortierung, Filterset, Themen, Zurücksetzen). `useFilterUrlSync` gleicht ihn mit URL und Zurück-Taste ab und wird nur von `/recipes` genutzt. |
| `RecipeSearchClient` scrollt mit `useWindowVirtualizer` | `RecipeSearchView` bekommt den Scroll-Container als Prop. Ohne Prop bleibt es das Fenster, im Dialog ist es der Inhaltsbereich (`useVirtualizer` mit `getScrollElement`).                                    |
| Spaltenzahl nach Fensterbreite                          | Spaltenzahl nach Breite des Containers (ResizeObserver), mit denselben Stufen 1/2/3.                                                                                                                         |
| `SearchHeader` mit festem Titel und fester Sortierliste | Titel, Sortierungen und Zusatz rechts als Props. Die Suchseite übergibt die heutigen Werte.                                                                                                                  |
| `RecipeCard` ist immer ein Link                         | Optionaler Slot für eine Aktion: Im Dialog wählt ein Tipp die Karte und zeigt + / −, „Dazu passt“ und den Grund. Ohne Slot bleibt alles wie heute.                                                           |
| Startdaten lädt die Seite beim Rendern                  | Eine Funktion lädt Tags, Zutaten, Filtersets und Themen. Die Seite ruft sie beim Rendern auf, der Dialog beim Öffnen über eine Server-Aktion.                                                                |
| `FilterSidebar` zeigt immer alle Abschnitte             | Eine Prop blendet Abschnitte aus. Der Dialog blendet „Kategorien“ aus.                                                                                                                                       |

- **Verborgener Grundfilter:** Die Art und die Ids, die nicht in der Liste stehen sollen, gehen als `context` an die Suche. Der sichtbare Filterzustand kennt sie nicht, Pills und Leiste zeigen sie also nicht. Die Facetten werden mit Grundfilter berechnet, die Zahlen stimmen also.
- **Filter im Dialog:** Sie bleiben auf dem Gerät gespeichert (eigener Schlüssel, nicht der der Suchseite). „Zurücksetzen“ leert sie.
- **Reihenfolge der Umsetzung:** Erst die Suchseite auf den Baustein umstellen, ohne sichtbare Änderung, dann den Dialog bauen.

## Welche Rezepte in welchen Reiter dürfen

| Art (Reiter)   | Erlaubte Rezepte                                                                       | Plätze                                                              |
| -------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Hauptgerichte  | Kategorie „Hauptgericht“                                                               | Mittagessen, Abendessen, eigene Plätze außerhalb der anderen Zeiten |
| Frühstück      | Kategorie „Frühstück“ oder Tag „Brunch“                                                | Frühstück, eigene Plätze vor 11:00                                  |
| Kaffee & Snack | Kategorie „Backen“ oder „Dessert“ oder Tag „Kaffee & Kuchen“, ohne Kategorie „Getränk“ | eigene Plätze 14:00–17:00                                           |

- Nie allein in einem Platz: Kategorie „Getränk“, „Beilage“, „Vorspeise“ und „Salat“ ohne „Hauptgericht“. Ebenso die Tags „Grundrezept“, „Vorratshaltung“ und „Geschenk aus der Küche“.
- Ein Rezept mit „Hauptgericht“ und einer dieser Kategorien bleibt erlaubt.
- Stand live: 268 von 967 veröffentlichten Rezepten sind Hauptgerichte.
- Die Regel gibt es zweimal aus einer Quelle:
    - als reine Funktionen `mealKindOf(slot)` und `allowedFor(kind, recipe)` für das Verteilen und für Tests
    - als `mealKindQuery(kind)`, die dieselbe Regel als OpenSearch-Filter ausdrückt (`categorySlug`, `tags`)
- Die Regel gilt auch für die Platz-Suche (KUC-100), die damit keine Saucen mehr als Hauptgericht anbietet.

## Rangfolge (gemeinsam für Suche und Woche)

Ein gemeinsames Modul `shared/recipe-ranking/` ersetzt die heutige Sortierung „Passt zu dir“ der Suche:

- **Suche, „Passt zu dir“:** die Formel ohne Auswahl
- **Dialog, „Passt zu deiner Woche“:** die Formel mit Auswahl und Woche

Heute holt „Passt zu dir“ die 200 bestbewerteten Treffer und sortiert sie nur nach Kosinus. Danach gilt für beide Sortierungen:

### Kandidaten

1. Die Suchanfrage mit allen Filtern und dem Grundfilter liefert die passenden Ids (bis 1.000, ohne Quelltext) und die Facetten.
2. **Suchvektor:** `q = normalize(a · Profil + b · Mittel(gewählte Gerichte))`. Ohne Auswahl ist b = 0. Mit jedem gewählten Gericht wächst b bis zu einer Obergrenze. Startwerte aus dem Prüfskript: b = 0,15 je Gericht, höchstens 0,5.
3. **kNN** auf `recipe-embeddings` mit `k ≈ 150`, gefiltert auf die Ids aus Schritt 1 (`terms`). Das Prüfskript hat gezeigt: Ungefiltert sind nur 21–76 % der Treffer Hauptgerichte, gefiltert 100 %.
4. Bleiben weniger als 12 übrig, wird mit den bestbewerteten Ids aus Schritt 1 aufgefüllt.
5. **Ohne Profil und ohne Auswahl** gibt es keine kNN-Suche. Die Ids aus Schritt 1 werden nach der Formel sortiert, der Geschmack zählt neutral.

### Punkteformel

Eine reine Funktion `scoreRecipe(candidate, context)`. Alle Teilwerte liegen zwischen 0 und 1. Startgewichte aus dem Prüfskript, in absteigender Reihenfolge:

1. **Geschmack (4):** Kosinus zum Profil, auf 0..1 skaliert. Ohne Profil 0,5.
2. **Auswahl, ergänzen statt wiederholen (3),** nur mit Auswahl:
    - Plus für gemeinsame Zutaten mit der Auswahl. Grundzutaten wie Salz, Wasser und Öl zählen nicht (`ignoredIngredientIds`).
    - Minus, wenn die Ähnlichkeit zu einem gewählten Gericht über 0,8 liegt, also ein fast gleiches Gericht.
    - Minus für dieselbe Art (Nudeln, Suppe, Fleisch …) oder Küche wie ein gewähltes Gericht.
3. **Saison (2):** passt zur Jahreszeit der Woche (1), ohne Angabe 0,5, sonst 0.
4. **Bewertung (1,5):** Bayes-gedämpfter Durchschnitt `(R · n + m · C) / (n + m)` mit m = 5, auf 0..1 skaliert. Ein einzelnes 5★ schlägt damit nicht alles.
5. **Bald ablaufender Vorrat:** wie bisher KUC-96/KUC-108, als Bonus mit Grund „Verbraucht …“. Nur in der Woche.

**Abwechslung (MMR):** Die Liste wird gierig aufgebaut. Jeder nächste Platz geht an den Kandidaten mit dem besten Wert aus Punkten minus Ähnlichkeit zu den schon gewählten und schon gelisteten Karten. Abzug gibt es für hohe Kosinus-Ähnlichkeit, für dieselbe Art (höchstens 3 gleiche in einer Seite) und für viele gemeinsame Zutaten. Im Prüfskript stieg damit die Zahl der Arten in den ersten 12 von 2–6 auf 8–9, die größte Gruppe gleicher Art sank von bis zu 11 auf 2.

**Gründe:** Jede Karte im Dialog zeigt den stärksten Beitrag, zum Beispiel „Passt zu deinem Geschmack“, „Teilt 2 Zutaten mit deiner Auswahl“, „Passt zum Herbst“ oder „Verbraucht Sahne“. Die Suchseite zeigt keine Gründe.

**Gewichte:** Sie stehen in einer Konfiguration. Eingestellt werden sie nach dem Deploy auf Beta in der echten Oberfläche mit dem Nutzer.

### Probier auch mal

- Kandidaten: gut bewertete Hauptgerichte (gedämpfte Bewertung über einer Schwelle, wenige Bewertungen genügen), die zu allen Filtern passen und nicht in der Liste stehen.
- Darunter die 4–6 mit der kleinsten Ähnlichkeit zum Profil. Ohne Profil zählt die Ähnlichkeit zur Auswahl, ohne beides gibt es eine saisonale Streuung.
- Höchstens eins je Hauptkategorie oder Küche.
- Grund „Mal was anderes: Asiatisch“.
- Die Reihe bleibt in einer Sitzung stabil. Gewählte Karten wandern in die Auswahl, ihr Platz wird nachgefüllt.

### Dazu passt

- Ein gewähltes Hauptgericht bekommt höchstens einen Vorschlag, und nur, wenn ihm etwas fehlt:
    - **Sättigendes fehlt:** keine nicht-optionale Zutat aus `getreideprodukte-huelsenfruechte-und-kartoffeln` oder `brote-flocken-und-fruehstueckscerealien` → Vorschlag aus „Beilage“ (ohne Saucen).
    - **Gemüse fehlt:** keine nicht-optionale Zutat aus `gemuese` → Vorschlag aus „Salat“ (ohne Dressings).
    - Fehlt beides, gewinnt Sättigendes.
- Ausgewählt wird nach Ähnlichkeit zum Hauptgericht und Bewertung. Die Filter des Dialogs gelten auch hier: Mit „ohne Kartoffeln“ gibt es keine Ofenkartoffeln.
- Die Anzeige ist eine Zeile: „Dazu passt: Kartoffelpüree +“.
- Angenommen landet der Vorschlag im selben Platz nach dem Hauptgericht (Position 1). Er zählt nicht zur Zielanzahl, seine Portionen folgen dem Hauptgericht.
- Stand Beta nach der verbesserten Erkennung: Bei 77 von 266 Hauptgerichten fehlt Sättigendes, bei 19 Gemüse, jedes bekommt einen Vorschlag.

## Verteilen auf die Tage

Eine reine Funktion `distributeSelection(picks, slots, context)`:

- **Eingaben:**
    - Gewählte Gerichte mit Art, Portionen, Aufwand und Zutaten
    - Gewählte Plätze mit Art
    - Haushaltsgröße
    - Haltbarkeit der Zutaten (KUC-96)
    - Einkaufstag
- **Aufwand** eines Rezepts liegt zwischen 0 und 1. Er ergibt sich aus der Zahl der Schritte im Ablauf (`flowNodes`, ohne Start), aus `totalTime` und aus `difficulty`.
- **Reste:** Portionen über der Haushaltsgröße ergeben ein Reste-Essen einen Tag später in derselben Mahlzeit. Dafür wird die vorhandene Reste-Verknüpfung genutzt (`leftoverOfId`, KUC-101/108). Ist der Platz nicht gewählt oder belegt, kommt der nächste gewählte freie Platz derselben Art.
- **Zuordnung:** Paare aus Gericht und Platz derselben Art werden gewichtet und gierig in absteigender Reihenfolge zugeordnet:
    - Aufwand passt zum Tag: Aufwändiges kommt ans Wochenende.
    - Verderbliche Zutaten liegen früh nach dem Einkaufstag.
    - Gleiche Hauptkategorie steht nicht an benachbarten Tagen.
- Die Logik nutzt `durationFit`, Haltbarkeit und Abwechslung aus `shared/meal-planning`.
- Bleiben Plätze frei, weil weniger gewählt wurde, bleiben sie leer.

## Bausteine

| Baustein        | Ort                                                  | Aufgabe                                                                                                               |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Filterzustand   | `src/app/recipes/components/useRecipeFilterState.ts` | Zustand ohne URL; reine Hilfen für Zurücksetzen, Filterset und Themen                                                 |
| URL-Abgleich    | `src/app/recipes/components/useFilterUrlSync.ts`     | URL schreiben, Zurück-Taste; nur `/recipes`                                                                           |
| Such-Ansicht    | `src/app/recipes/components/RecipeSearchView.tsx`    | Kopf, Sets, Pills, Leiste, Liste; Scroll-Container, Kartenslot, Titel und Sortierungen als Props                      |
| Suchseite       | `src/app/recipes/components/RecipeSearchClient.tsx`  | nur noch `useRecipeFilterState` + `useFilterUrlSync` + `RecipeSearchView`                                             |
| Suchanfrage     | `src/lib/recipeSearch.ts`                            | `queryRecipes(filters, userId, context?)`; Filteraufbau als eigene Funktion; Sortierungen `taste` und `week`          |
| Rangfolge       | `shared/recipe-ranking/`                             | Suchvektor, Punkteformel, MMR, Gründe, Bayes; ersetzt die Sortierung in `src/lib/recipes/taste-ranking.ts`            |
| Art             | `shared/meal-planning/meal-kind.ts`                  | `mealKindOf(slot)`, `allowedFor(kind, recipe)`, `mealKindQuery(kind)`                                                 |
| Probier mal     | `shared/recipe-ranking/try-also.ts`                  | Auswahl und Streuung der Gegenpole                                                                                    |
| Dazu passt      | `shared/meal-planning/side-dish.ts`                  | fehlt Sättigendes oder Gemüse, Kandidat wählen                                                                        |
| Verteilen       | `shared/meal-planning/distribute.ts`                 | Auswahl und Reste auf Plätze                                                                                          |
| Server-Aktionen | `src/app/plan/selection-actions.ts`                  | `openWeekSelection(week)`, `loadTryAlso(...)`, `loadSideDishes(...)`, `applyWeekSelection(...)` über `run`/`runWrite` |
| Dialog          | `src/components/meal-plan/selection/`                | Dialog/Sheet, Plätze-Kopf, Reiter, Kartenslot, Probier-Reihe, Leiste                                                  |
| Prüfskript      | `scripts/probe-week-selection.mjs`                   | bleibt als Werkzeug, nur lesend                                                                                       |

Wegfallen:

- die Vorschlagsschicht in `IntelligentWeekView` (Vorschläge, „Neu vorschlagen“, „Tauschen“, „Alle übernehmen“) und `SuggestionCard`
- `suggestWeek`, `swapSuggestion` und `week-planner.ts`, soweit `distribute.ts` sie nicht übernimmt
- `loadRecipeRows` mit dem festen Pool der 250 bestbewerteten Rezepte, soweit nichts anderes ihn nutzt

Inspiration (KUC-112), Haltbarkeit (KUC-96) und Reste-Hinweise (KUC-108) bleiben.

## Datenfluss und Fehler

- **Öffnen:** `openWeekSelection(week)` lädt in einem Aufruf die freien Plätze je Art, die Haushaltsgröße, die Startdaten der Filterleiste und die gespeicherten Filter.
- **Liste:** `useRecipeSearch` ruft `/api/recipes/filter` mit Filtern, Sortierung `week` und `context` (Art, Woche, gewählte Ids). Der Abfrage-Schlüssel enthält die Auswahl. Eine Änderung der Auswahl löst nach etwa 300 ms eine neue Abfrage aus. Gewählte Karten hält der Dialog selbst vorn, sie warten also nie.
- **Probier mal und Dazu passt:** eigene Server-Aktionen mit denselben Filtern. Sie nutzen den Filteraufbau aus `recipeSearch.ts`.
- **Rate-Limit:** Bucket `mealPlan` für die Server-Aktionen. `/api/recipes/filter` bleibt wie heute.
- **kNN nicht erreichbar oder ohne Embedding:** Rückfall auf die Kosinus-Sortierung über die DB (`rankRecipeIdsByTaste`) mit denselben Ids. Ein Rezept ohne Embedding fällt aus der kNN-Liste, beim Auffüllen bleibt es möglich. Eine Meldung gibt es nicht.
- **Übernehmen:** ein `runWrite`-Vorgang. Ein Platz, der inzwischen belegt ist, wird übersprungen und in der Meldung genannt („1 Platz war inzwischen belegt“).
- **Keine OpenAI-Aufrufe:** Profil- und Rezept-Embeddings sind gespeichert, die Auswahl erzeugt keine neuen.

## Tests

**Unit-Tests** mit `node --import tsx --test`:

- `meal-kind`: Uhrzeit-Grenzen, Kombinationen von Kategorie und Tag, eine Sauce ist nie erlaubt, `mealKindQuery` drückt dieselbe Regel aus wie `allowedFor`.
- `recipe-ranking`:
    - Suchvektor mit und ohne Profil und Auswahl
    - Reihenfolge der Gewichte
    - gemeinsame Zutaten heben ein Rezept an, fast gleiche senken es
    - MMR: höchstens 3 gleiche Arten auf einer Seite
    - Bayes-Dämpfung
    - Gründe
- `try-also`: kleinste Ähnlichkeit, Streuung, nichts aus der Liste, Nachfüllen.
- `side-dish`: beide Regeln, keine Doppelvorschläge, Filter wie „ohne Kartoffeln“ gelten.
- `distribute`: Reste-Tag, Wochenende für Aufwändiges, Verderbliches früh, keine gleiche Kategorie an Nachbartagen, belegte Plätze, weniger Gerichte als Plätze, nur passende Art je Platz.
- Filterzustand: Zurücksetzen, Filterset an und aus, Themen. Dafür werden die Hilfen als reine Funktionen aus dem Hook gezogen.
- Filteraufbau: Grundfilter aus `context` landet im Filter und nicht in den sichtbaren Filtern. Die Facetten werden mit Grundfilter berechnet.

**Keine** E2E- oder Browser-Tests in diesem Ticket, nach Vorgabe nur Unit-Tests. Das Verhalten der Suchseite nach dem Umbau (URL, Zurück, Sortierung, Nachladen) prüft der Lead von Hand auf Beta.

## Zu prüfen beim Review dieser Spezifikation

- **„Passt zu dir“ auf der Suchseite** ändert sich mit: kNN statt Top 200 nach Bewertung, Saison, Bewertung und Abwechslung zusätzlich zum Geschmack.
- **Filter im Dialog** bleiben auf dem Gerät gespeichert und sind von denen der Suchseite getrennt.
