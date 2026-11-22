# Rezeptimport per Claude-Batch (Einmal-Skript)

Stand 22.11.2026 · Ticket: Unterticket von KUC-127

## Ziel

Deutlich mehr Rezepte in kurzer Zeit, bezahlt aus dem Anthropic-Guthaben (ca. 60 $), weil bei OpenAI nur noch ca. 10 $ übrig sind. Die Rezepte sollen genauso aussehen wie Rezepte, die über die App importiert wurden.

## Entscheidungen (Nutzer, 22.11.)

- **Ein eigenes Einmal-Skript**, `scripts/import-recipes-claude.ts`. Den Batch-Code übernimmt es aus `scripts/refresh-recipe-flows.ts`, nur gegen die Anthropic Message Batches API statt OpenAI.
- **Prompt, Schema und Speichern kommen aus dem App-Import:**
    - `IMPORT_SYSTEM_PROMPT`, `buildContextMessage` und `buildRecipeMessage` aus `src/lib/importer/import-prompt.ts`
    - `ImportedRecipeSchema` aus `openai-recipe-schema.ts`
    - `transformImportedRecipe`, `prepareImportedRecipe` und `saveImportedRecipe` aus `src/lib/importer/pipeline.ts`

    Kopiert wird nur der API-Teil. Ein Prompt, ein Schema und ein Speicherweg bleiben die einzige Quelle.

- **Modellwahl per Vergleich:** Eine Testwelle wandelt 4 Rezepte mit Claude Opus 5.5, Sonnet 5.5 und Haiku 5.5 um. Der Nutzer wählt das Modell an den echten Ergebnissen.
- **Ablauf:**
    1. Testlauf
    2. Wenn gut: Import in Wellen auf Beta und Live
- **Zutaten-Anreicherung später:** Neue Zutaten bekommen Nährwerte, Kategorie und Icon erst nach dem 6.12. über OpenAI. Das Skript löst keine Anreicherung aus.

## Ablauf des Skripts

Befehle, alle mit `--dir`, in dem Zustand und Ergebnisse liegen. Aufbau wie `refresh-recipe-flows.ts`:

1. `submit --urls=<datei> --model=<id> [--limit=N]`
    - Lädt jede Seite über den Scraper (`SCRAPLER_URL`) als Markdown.
    - Baut je Rezept einen Batch-Eintrag mit `custom_id` = laufende Nummer.
    - Die URL steht im Zustand, nicht in der `custom_id`.
    - Legt den Batch an und speichert `state.json`.
2. `status`: zeigt den Stand des Batches.
3. `fetch`:
    - Lädt die Ergebnisse, prüft jedes mit `ImportedRecipeSchema` und baut daraus `transformImportedRecipe`.
    - Schreibt `proposals.jsonl` und einen Bericht: Erfolg, Fehler, Tokens und Kosten je Modell.
4. `apply [--write] [--publish]`:
    - Speichert über `saveImportedRecipe` als Admin-Autor.
    - Ohne `--write` ist es ein Probelauf.
    - Bereits vorhandene `sourceUrl` werden übersprungen.
    - `applied.jsonl` erlaubt Fortsetzen nach Abbruch.
    - Neue Zutaten werden angelegt, ohne Anreicherung (siehe unten).
5. `compare`: nur für die Testwelle. Stellt dieselbe URL über die Modelle nebeneinander: Zutaten, Schritte, Ablauf, Tokens und Kosten.

### Anfrage an Claude

- **Modell:** `claude-opus-5-5`, `claude-sonnet-5-5` oder `claude-haiku-5-5`.
- **Prompt:** `system` = `IMPORT_SYSTEM_PROMPT`, danach Kontextnachricht (Tags und Zutatenkatalog) und Rezeptnachricht.
- **Antwortformat:** Strukturierte Ausgabe über `output_config.format` mit dem JSON-Schema aus `ImportedRecipeSchema`. Das Ergebnis wird danach mit Zod geprüft.
- **Prompt-Caching:** `cache_control` am Ende von System- und Kontextnachricht. Beide sind für alle Rezepte einer Welle identisch, der Batch cacht best-effort.
- **Effort und Länge:** Effort `medium`. `max_tokens` 32000, weil der Ablauf lang werden kann.
- **Ablehnungen:** `stop_reason` wird geprüft. `refusal` und `max_tokens` zählen als Fehler. Fehlerhafte Einträge laufen einmal erneut (`repair`, wie im Vorbild).

### Kosten und Deckel

- Der Bericht von `fetch` zeigt die echten Kosten je Rezept aus `usage`.
- `submit` schätzt die Kosten vor dem Anlegen und bricht über `--max-usd` ab (Standard 5 $ je Welle).

## Sammeln (KUC-127 Phase A, parallel, ohne KI-Kosten)

- Kandidaten-URLs aus den Sitemaps der Quellen P0–P2 (`services/scraper/RESEARCH_rezept-websites-de.md`), nur Seiten mit Recipe-JSON-LD.
- Duplikate werden erkannt:
    - gegen vorhandene `sourceUrl`
    - über den normalisierten Titel plus Hauptzutaten, auch zwischen Quellen
- Lückenanalyse gegen den Bestand: Art (Schwerpunkt Hauptgerichte), Küche, Ernährung.
- Ausgabe ist eine priorisierte URL-Liste je Welle, die `submit --urls` liest.

## Was das Speichern nebenbei auslöst

- **Neue Zutaten:**
    - Das Skript läuft mit `AI_AUTOMATION=off`. `enqueueIngredientEnrichment` reiht dann nichts ein.
    - Der tägliche Job `backfill-ingredient-enrichment` auf **Live** sieht aber jede unvollständige Zutat. Live hat KUC-128 noch nicht, siehe Risiken.
- **Suchindex:** `sync-recipe` legt das Embedding an. Das kostet bei OpenAI ca. 0,01 ct je Rezept und läuft auf Live weiter, auf Beta bei `AI_AUTOMATION=off` nicht.
- **Bilder:** werden wie bisher aus der Quelle übernommen. Importierte Rezepte überspringen die Moderation.

## Risiken und offene Punkte

1. **Live verbraucht das OpenAI-Guthaben ohnehin.** Live läuft ohne KUC-128. Der tägliche Anreicherungs-Job kostet dort ca. 4 $ am Tag, die restlichen 10 $ sind also in 2–3 Tagen weg. Jede neu importierte Zutat kommt dazu. Lösung: Live-Deploy mit KUC-128 und `AI_AUTOMATION=off` auf Live, mit OK des Nutzers.
2. **Anthropic-Schlüssel:** Im Projekt gibt es keinen. Er wird nur zur Laufzeit gelesen (`ANTHROPIC_API_KEY`), nicht in Infisical der App.
3. **Strukturierte Ausgabe:** Das OpenAI-Schema (strict) muss für Claude passen. Wenn nicht, wird es einmal angepasst. Die Zod-Prüfung bleibt die Wahrheit.

## Tests

Unit-Tests ohne Netz:

- Bau des Batch-Eintrags (Prompt-Reihenfolge, `cache_control`, Schema)
- Auswertung eines Ergebnisses (Erfolg, `refusal`, `max_tokens`, ungültiges JSON)
- Kostenrechnung aus `usage`
- Überspringen vorhandener `sourceUrl`

Das Abholen von Batch-Ergebnissen wird über eine kleine Schnittstelle als Fake getestet.
