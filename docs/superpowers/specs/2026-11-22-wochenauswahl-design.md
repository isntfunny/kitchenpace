# Wochenauswahl im Box-Stil (KUC-126)

Stand: 22.11.2026 · Ticket: KUC-126 (Unterticket von KUC-79) · ersetzt „Plan mir die Woche“ aus KUC-113

## Anlass

Beta-Test am 22.11.: „Plan mir die Woche“ füllt jeden freien Platz mit dem Rezept, das in einer festen Punkteformel am besten abschneidet. Dabei landete „Salatsoße auf Vorrat“ als Mittagessen. Der Planer prüft weder, ob ein Rezept ein Hauptgericht ist, noch ob es zur Mahlzeit passt. Sein Pool sind die 250 bestbewerteten Rezepte, unabhängig vom Geschmack.

Der Nutzer will stattdessen eine Auswahl wie bei einer Kochbox. Er bekommt eine Liste von Gerichten und sieht, wie viele er schon gewählt hat. Für jedes gewählte Gericht hat er + und − für Portionen. Die Liste entsteht aus dem Geschmacksprofil und passt sich live an die Auswahl an. Daneben gibt es eine Reihe „Probier auch mal“.

## Ziele und Erfolgskriterien

- Kein Getränk, keine Sauce, keine Beilage und kein Grundrezept steht allein in einem Platz.
- Nach jedem Antippen ordnet sich die Liste neu, ohne dass die Auswahl wartet. Gewählte Karten bleiben stehen.
- „Übernehmen“ füllt genau die gewählten Plätze. Mehr Portionen als der Haushalt isst, ergeben einen Reste-Tag.
- Die Reihenfolge folgt einer nachvollziehbaren, getesteten Punkteformel. Die Gewichte sind per Prüfskript mit dem Nutzer abgestimmt.

## Entscheidungen des Nutzers

| Thema             | Entscheidung                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Einstieg          | Ersetzt „Plan mir die Woche“. Die alten gestrichelten Vorschlagskarten und „Alle übernehmen“ entfallen.                     |
| Tage              | Gewählte Gerichte werden beim Übernehmen automatisch auf die Plätze verteilt.                                               |
| Anzahl            | Kopf mit Mahlzeit- und Tage-Chips, vorbelegt mit den freien Plätzen. Die Zielanzahl ergibt sich daraus.                     |
| Live-Anpassung    | Ergänzen statt wiederholen: Gemeinsame Zutaten geben Pluspunkte, fast gleiche Gerichte Abzug.                               |
| Probier auch mal  | Eigene Reihe unter der Liste. Gut bewertete Gerichte, die weit weg vom Geschmacksprofil liegen.                             |
| Portionen         | Start mit der Haushaltsgröße. + / − ändert die Menge. Was über den Haushalt hinausgeht, ergibt automatisch einen Reste-Tag. |
| Technik           | Kandidaten per kNN aus OpenSearch (`recipe-embeddings`). Der Suchvektor mischt Geschmacksprofil und Auswahl.                |
| Sortierung        | Punkteformel in dieser Reihenfolge: Geschmack → Auswahl → Saison → Bewertung.                                               |
| Aufwand           | Eine wählbare Sortierung der Liste (siehe „Zu prüfen“).                                                                     |
| Ohne Profil       | Beliebte und saisonale Gerichte. Ab dem ersten gewählten Gericht übernimmt die Auswahl als Suchvektor.                      |
| Beilagen          | „Dazu passt“ nur, wenn dem Hauptgericht Sättigendes oder Gemüse fehlt, höchstens ein Vorschlag je Karte.                    |
| Eigene Mahlzeiten | Die Rezeptart ergibt sich aus der Uhrzeit des Platzes.                                                                      |
| Umfang            | Alles in einem Release, zusammen mit dem Wochenplan-Epic.                                                                   |

## Ablauf

1. Im Plan öffnet „Plan mir die Woche“ die Auswahl. Auf dem Handy ist sie ein Vollbild-Sheet, auf dem Desktop ein breiter Dialog. Sie gilt für die gezeigte Woche.
2. **Kopf:**
    - Mahlzeit-Chips: aktive Plätze der Woche, also feste und eigene.
    - Tage-Chips: Mo–So.
    - Vorbelegt ist jede Kombination aus Mahlzeit und Tag, die im Plan frei ist. Belegte Plätze sind nicht wählbar.
    - Die Zielanzahl ist die Zahl der gewählten Plätze.
3. **Liste „Passt zu deiner Woche“:**
    - Etwa 12 Karten mit Bild, Titel, Dauer und einem kurzen Grund.
    - Ein Sortierschalter bietet „Passend“ (Standard), „Schnell zuerst“ und „Aufwändig zuerst“.
4. **Reihe „Probier auch mal“:** 4–6 Karten, horizontal scrollbar.
5. **Antippen** wählt ein Gericht. Die gewählte Karte zeigt + / − für Portionen und gegebenenfalls einen „Dazu passt“-Vorschlag. Erneutes Antippen hebt die Auswahl auf.
6. **Untere Leiste,** fest am Rand: „3 von 5 gewählt · Übernehmen“. Ein Gericht mit doppelten Portionen zählt für zwei Plätze, das zweite Essen ist der Reste-Tag. „Übernehmen“ geht auch mit weniger Gerichten als Zielanzahl. Mit mehr Gerichten geht es nicht, dann ist + gesperrt und weitere Karten sind nicht wählbar.
7. **Übernehmen:**
    - Verteilt die Auswahl auf die gewählten Plätze und schreibt den Plan.
    - Schließt die Auswahl.
    - Zeigt eine Meldung, zum Beispiel „5 Gerichte eingeplant · Auf die Einkaufsliste?“. Die Aktion dahinter gibt es bereits.

## Welche Rezepte in welchen Platz dürfen

Die Rezeptart eines Platzes:

| Platz                   | Erlaubte Rezepte                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Mittagessen, Abendessen | Kategorie „Hauptgericht“                                                                |
| Frühstück               | Kategorie „Frühstück“ oder Tag „Brunch“                                                 |
| Eigener Platz           | nach Uhrzeit: vor 11:00 wie Frühstück, 14:00–17:00 Kaffee/Snack, sonst wie Hauptgericht |
| Kaffee/Snack            | Kategorie „Backen“ oder „Dessert“ oder Tag „Kaffee & Kuchen“, ohne Kategorie „Getränk“  |

- Nie allein in einem Platz: Kategorie „Getränk“, „Beilage“, „Vorspeise“ und „Salat“ ohne „Hauptgericht“. Ebenso die Tags „Grundrezept“, „Vorratshaltung“ und „Geschenk aus der Küche“.
- Ein Rezept mit „Hauptgericht“ und einer dieser Kategorien bleibt erlaubt.
- Stand live: 268 von 967 veröffentlichten Rezepten sind Hauptgerichte.
- Die Regel ist eine reine Funktion `mealKindOf(slot)` und `allowedFor(kind, recipe)`. Sie gilt auch für die Platz-Suche (KUC-100), die damit keine Saucen mehr als Hauptgericht anbietet.

## Kandidaten und Sortierung

### Suchvektor und kNN

- **Suchvektor** `q = normalize(a · Profil + b · Mittel(gewählte Gerichte))`. Ohne Auswahl ist b = 0. Mit jedem gewählten Gericht wächst b bis zu einer Obergrenze. Startwerte und Obergrenze kommen aus dem Prüfskript.
- **Ohne Profil:**
    - Ohne Auswahl gibt es keine kNN-Suche. Die Kandidaten sind gut bewertete Rezepte der erlaubten Art, nach der Punkteformel sortiert. Der Geschmack zählt dabei neutral.
    - Ab dem ersten gewählten Gericht ist der Suchvektor das Mittel der Auswahl.
- **kNN:** `k ≈ 150` auf `recipe-embeddings`, danach serverseitig gefiltert:
    - veröffentlicht und nicht abgelehnt
    - erlaubte Art für mindestens eine gewählte Mahlzeit
    - nicht schon gewählt und nicht schon in dieser Woche geplant
    - die eigenen Rezeptfilter des Nutzers wie bisher in KUC-113
- Bleiben weniger als 12 Kandidaten übrig, wird mit gut bewerteten Rezepten der erlaubten Art aufgefüllt.

### Punkteformel (Sortierung „Passend“)

Eine reine Funktion `scoreForSelection(candidate, context)`. Die Gewichte fallen in dieser Reihenfolge ab, alle Teilwerte liegen zwischen 0 und 1:

1. **Geschmack:** Kosinus zum Profil, auf 0..1 skaliert. Ohne Profil 0,5.
2. **Auswahl, ergänzen statt wiederholen:**
    - Plus für gemeinsame Zutaten mit der Auswahl. Grundzutaten wie Salz, Wasser und Öl zählen nicht, wie bisher `ignoredIngredientIds`.
    - Minus, wenn die Ähnlichkeit zu einem gewählten Gericht über einer Schwelle liegt, also ein fast gleiches Gericht.
    - Minus für dieselbe Hauptkategorie oder dieselbe Küche (Tag) wie ein gewähltes Gericht.
    - Mittlere Ähnlichkeit ist neutral.
3. **Saison:** passt zur Jahreszeit der Woche (1), ohne Angabe 0,5, sonst 0.
4. **Bewertung:** Bayes-gedämpfter Durchschnitt `(R · n + m · C) / (n + m)`, auf 0..1 skaliert. Damit schlägt ein einzelnes 5★ nicht alles.
5. **Bald ablaufender Vorrat:** wie bisher KUC-96/KUC-108, als Bonus mit Grund „Verbraucht …“.

Jede Karte zeigt einen kurzen Grund, den stärksten Beitrag. Beispiele sind „Passt zu deinem Geschmack“, „Teilt 2 Zutaten mit deiner Auswahl“, „Passt zum Herbst“ und „Verbraucht Sahne“.

### Aufwand

- Der Aufwand eines Rezepts liegt zwischen 0 und 1. Er ergibt sich aus drei Angaben:
    - Zahl der Schritte im Ablauf (`flowNodes`, ohne Start)
    - `totalTime`
    - `difficulty`
- „Schnell zuerst“ und „Aufwändig zuerst“ sortieren nach Aufwand, Gleichstände nach der Punkteformel. In „Passend“ zählt der Aufwand nicht.
- Beim Verteilen auf die Tage gilt er weiter: Aufwändige Gerichte landen bevorzugt am Wochenende.

### Probier auch mal

- Kandidaten sind gut bewertete Rezepte der erlaubten Art, mit gedämpfter Bewertung über einer Schwelle und mindestens wenigen Bewertungen. Sie dürfen nicht in der Liste „Passt“ stehen.
- Darunter die 4–6 Rezepte mit der kleinsten Ähnlichkeit zum Profil. Ohne Profil zählt die Ähnlichkeit zur Auswahl, ohne beides gibt es eine saisonale Streuung.
- Die Reihe ist untereinander verschieden: höchstens eins je Hauptkategorie oder Küche.
- Jede Karte trägt einen Grund, zum Beispiel „Mal was anderes: Asiatisch“.
- Die Reihe bleibt in einer Sitzung stabil. Gewählte Karten wandern in die Auswahl, ihr Platz wird nachgefüllt.

### Dazu passt

- Ein gewähltes Hauptgericht bekommt höchstens einen Vorschlag, und nur, wenn ihm etwas fehlt:
    - **Sättigendes fehlt:** keine nicht-optionale Zutat aus `getreideprodukte-huelsenfruechte-und-kartoffeln` oder `brote-flocken-und-fruehstueckscerealien` → Vorschlag aus „Beilage“.
    - **Gemüse fehlt:** keine nicht-optionale Zutat aus `gemuese` → Vorschlag aus „Salat“.
    - Fehlt beides, gewinnt Sättigendes.
- Ausgewählt wird nach Ähnlichkeit zum Hauptgericht und Bewertung.
- Die Anzeige ist dezent, eine Zeile: „Dazu passt: Kartoffelpüree · +“.
- Angenommen landet der Vorschlag im selben Platz, nach dem Hauptgericht (Position 1). Er zählt nicht zur Zielanzahl. Seine Portionen folgen dem Hauptgericht.
- Das Prüfskript zeigt vorab für alle Hauptgerichte, wie oft die Regel greift.

## Verteilen auf die Tage

Eine reine Funktion `distributeSelection(picks, slots, context)`:

- **Eingaben:**
    - Gewählte Gerichte mit Portionen, Aufwand und Zutaten
    - Gewählte Plätze
    - Haushaltsgröße
    - Haltbarkeit der Zutaten (KUC-96)
    - Einkaufstag
- **Reste:** Portionen über der Haushaltsgröße ergeben ein Reste-Essen, ein Tag später in derselben Mahlzeit. Dafür wird die vorhandene Reste-Verknüpfung genutzt (`leftoverOfId`, KUC-101/108). Ist der Platz nicht gewählt oder belegt, kommt der nächste gewählte freie Platz.
- **Zuordnung:** Paare aus Gericht und Platz werden gewichtet und gierig in absteigender Reihenfolge zugeordnet:
    - Aufwand passt zum Tag: aufwändig am Wochenende.
    - Verderbliche Zutaten liegen früh nach dem Einkaufstag.
    - Gleiche Hauptkategorie steht nicht an benachbarten Tagen.
    - Die erlaubte Art passt zum Platz.
- Die Logik nutzt `durationFit`, Haltbarkeit und Abwechslung aus `shared/meal-planning` wieder.
- Bleiben Plätze frei, weil weniger gewählt wurde, bleiben sie leer.

## Bausteine

| Baustein        | Ort                                       | Aufgabe                                                                                                      |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Rezeptart       | `shared/meal-planning/meal-kind.ts`       | `mealKindOf(slot)`, `allowedFor(kind, recipe)`                                                               |
| Punkteformel    | `shared/meal-planning/selection-score.ts` | Teilwerte, Gewichte, Gründe, Aufwand                                                                         |
| Probier mal     | `shared/meal-planning/try-also.ts`        | Auswahl und Streuung der Gegenpole                                                                           |
| Dazu passt      | `shared/meal-planning/side-dish.ts`       | fehlt Sättigendes oder Gemüse, Kandidat wählen                                                               |
| Verteilen       | `shared/meal-planning/distribute.ts`      | Picks und Reste auf Plätze                                                                                   |
| Kandidaten      | `src/lib/meal-plan/selection/pool.ts`     | Suchvektor, kNN, Filter, Merkmale aus der DB (Zutaten, Kategorien, Tags, Bewertung, Aufwand)                 |
| Server-Aktionen | `src/app/plan/selection-actions.ts`       | `openWeekSelection`, `refreshWeekSelection(picks)`, `applyWeekSelection(picks, slots)` über `run`/`runWrite` |
| Oberfläche      | `src/components/meal-plan/selection/`     | Sheet/Dialog, Kopf, Karten, Probier-Reihe, Leiste                                                            |
| Prüfskript      | `scripts/probe-week-selection.ts`         | nur lesend, siehe unten                                                                                      |

Wegfallen werden:

- die Vorschlagsschicht in `IntelligentWeekView` (Vorschläge, „Neu vorschlagen“, „Tauschen“, „Alle übernehmen“) und `SuggestionCard`
- `suggestWeek` und `week-planner.ts`, soweit `distribute.ts` sie nicht übernimmt

Inspiration (KUC-112), Haltbarkeit (KUC-96) und Reste-Hinweise (KUC-108) bleiben.

## Datenfluss und Fehler

- **Öffnen:** `openWeekSelection(week)` lädt in einem Aufruf Plätze, erste Liste, Probier-Reihe und Merkmale.
- **Antippen:** Die Auswahl ändert sich sofort im Browser. `refreshWeekSelection` wird gebündelt nach etwa 300 ms aufgerufen und ersetzt nur die nicht gewählten Karten der Liste. Eine Antwort zu einer veralteten Auswahl wird verworfen.
- **Rate-Limit:** Bucket `mealPlan` wie die übrigen Plan-Aktionen.
- **OpenSearch nicht erreichbar:** Fallback auf die DB-Rangfolge mit `rankRecipeIdsByTaste` über den Pool der erlaubten Art. Die Auswahl bleibt nutzbar, eine Meldung gibt es nicht.
- **Fehlendes Embedding:** Das Rezept fällt aus der kNN-Liste heraus, im Auffüllen bleibt es möglich.
- **Übernehmen:** Ein `runWrite`-Vorgang. Ein Platz, der inzwischen belegt ist, wird übersprungen und in der Meldung genannt („1 Platz war inzwischen belegt“).

## Tests

**Unit-Tests** mit `node --import tsx --test`:

- `meal-kind`: Uhrzeiten-Grenzen, Kombinationen von Kategorie und Tag, eine Sauce ist nie erlaubt.
- `selection-score`:
    - Reihenfolge der Gewichte
    - gemeinsame Zutaten heben ein Rezept an, fast gleiche senken es
    - Bayes-Dämpfung
    - Gründe
    - Aufwandssortierung
- `try-also`: kleinste Ähnlichkeit, Streuung, nichts aus der Liste „Passt“, Nachfüllen.
- `side-dish`: beide Regeln, keine Doppelvorschläge, nicht nur Gewürze.
- `distribute`:
    - Reste-Tag
    - Wochenende für Aufwändiges
    - Verderbliches früh
    - keine gleiche Kategorie an Nachbartagen
    - belegte Plätze
    - weniger Gerichte als Plätze

**Keine** E2E- oder Browser-Tests in diesem Ticket, nach Vorgabe nur Unit-Tests.

## Prüfskript zum Einstellen

`scripts/probe-week-selection.ts` arbeitet nur lesend auf einer Kopie oder Beta, nie gegen die Live-DB. Es gibt aus:

- für 3–5 Beispielprofile (echte Profile pseudonymisiert oder synthetische) die Liste „Passt“, die Reihe „Probier mal“ und die Liste nach 1, 2 und 3 simulierten Auswahlen, mit Teilwerten je Karte
- für alle Hauptgerichte die Quote der „Dazu passt“-Regeln

Die Gewichte stehen in einer Konfiguration und werden mit dem Nutzer anhand der Ausgaben festgelegt.

## Zu prüfen beim Review dieser Spezifikation

- **Aufwand:** Die Antwort „Sortierung der Vorschläge Liste“ ist als wählbare Sortierung umgesetzt: „Passend“, „Schnell zuerst“, „Aufwändig zuerst“. Gemeint sein kann auch eine feste Stufe in der Standardsortierung.
- **„Kaffee/Snack“** als eigene Rezeptart für eigene Plätze zwischen 14 und 17 Uhr.
