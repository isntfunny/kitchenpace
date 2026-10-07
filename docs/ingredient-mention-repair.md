# Zutatenverweise reparieren (KUC-88)

## Was sich ändert

Schritte verweisen auf `RecipeIngredient.id`, also auf die konkrete Verwendung einer Zutat in diesem Rezept. `ingredientId` bleibt die ID im Zutatenkatalog. `sourceId` hält die ursprüngliche Editor-/Import-ID über wiederholtes Speichern stabil. Zwei Salz-Zeilen mit verschiedenen Mengen/Hinweisen bleiben zwei Zeilen. Mengen werden als ursprüngliche Zeichenfolge angezeigt, einschließlich Brüchen und Bereichen. Explizite Teilmengen in `@[Name|Menge](id)` bleiben erhalten.

Die Anzeige unterstützt eindeutige alte Katalog-IDs während des Übergangs. Temporäre Import-IDs werden mit dem Reparaturlauf umgeschrieben. Mengen, die beim früheren Zusammenfassen verloren gingen, werden nicht erfunden. Zutaten gruppieren ist eine mögliche Erweiterung; diese Änderung bewahrt bereits die dafür nötigen einzelnen Verwendungen.

## Reihenfolge bei der Bereitstellung

1. Datenbank sichern und die Prisma-Migration `20261007140000_recipe_ingredient_occurrences` anwenden. Sie entfernt die Beschränkung auf eine Zeile pro Katalogzutat und ergänzt `sourceId`; bestehende Mengen bleiben unverändert.
2. Die neue Anwendung bereitstellen und einen neuen Import prüfen. Alte Importinstanzen sollten anschließend keine neuen Rezepte mehr speichern.
3. Erst den Bericht für bestehende Rezepte erstellen, prüfen und dann dessen sichere Änderungen anwenden. Zuerst in Staging prüfen. Deployments weiterhin ausschließlich aus `main`.

Das Skript verlangt eine explizit injizierte `DATABASE_URL`. Mit Infisical das beabsichtigte Environment auswählen; keine Zugangsdaten in Dateien schreiben. Die folgenden Beispiele verwenden Staging. Das Skript bootet keine KI, Warteschlangen oder Webanwendung.

## Bericht ohne Datenänderung

```bash
infisical run --env=staging -- npx tsx scripts/repair-ingredient-mentions.ts \
  --report /tmp/ingredient-mentions-plan.json

# Optional zunächst nur das Lángos-Rezept:
infisical run --env=staging -- npx tsx scripts/repair-ingredient-mentions.ts \
  --recipe ungarische-langos-mit-knoblauchcreme-und-kaese \
  --report /tmp/langos-mentions-plan.json
```

Ohne `--apply` gibt es keine Datenbankänderungen. Alle Rezepte werden seitenweise geprüft, unabhängig von Import-Markierungen und Veröffentlichungsstatus. Die Berichtsdatei wird mit exklusiver Neuanlage und Rechten `0600` geschrieben; vorhandene Dateien werden nicht überschrieben.

- `entries`: überprüfbare Vorher-/Nachher-Snapshots mit sicheren Änderungen.
- `review`: unaufgelöste/mehrdeutige Verweise und, soweit verfügbar, ursprüngliche Import-Zutaten als Prüfhilfe. Ein nur über Quell-URL/Autor gefundener Import ist ausdrücklich nicht als sicher dem Rezept zugeordnet markiert.
- `invalid`: Rezepte mit unerwarteter Flow-Datenstruktur; diese werden nicht geändert.

Ein Rezept kann sichere Änderungen **und** offene Verweise enthalten. Offene Verweise bleiben unangetastet. Ein zweiter Lauf darf daraus keine Zuordnung zur falschen Menge ableiten. Alte `imported_N`-Nummern werden niemals mit der heutigen Zutatenposition gleichgesetzt. Automatische Namenszuordnung verwendet nur eindeutige exakte Namen oder hinterlegte Aliase, keine Ähnlichkeitssuche.

## Geprüfte Entscheidungen und verlorene Zutatenverwendungen

Eine optionale JSON-Datei mit Entscheidungen ist nach Rezept-ID strukturiert:

```json
{
    "REZEPT-ID": {
        "sourceIds": {
            "imported_2": "VORHANDENE-TEIG-SALZ-ZEILEN-ID",
            "imported_11": "NEUE-UUID"
        },
        "restoreRows": [
            {
                "id": "NEUE-UUID",
                "ingredientId": "SALZ-KATALOG-ID",
                "unitId": "EINHEIT-ID",
                "name": "Salz",
                "amount": "",
                "unit": "Stk",
                "notes": "zum Abschmecken",
                "position": 12,
                "isOptional": false
            }
        ]
    }
}
```

Die Werte im Beispiel sind Platzhalter, keine Reparaturdaten für das echte Lángos-Rezept. Menge, Einheit und Hinweise nur aus geprüften Originaldaten übernehmen. `amount: ""` bedeutet unbekannte Menge, nicht null Gramm. `sourceId` für wiederhergestellte Zeilen weglassen oder null setzen; Katalog-Aliase werden beim Erstellen des Plans ergänzt. Bestehende Zutatenmengen werden durch das Skript nicht verändert. Neue Zeilen sind nur über ausdrücklich geprüfte Entscheidungen erlaubt. Bei entfernten, nicht wiederherzustellenden Zutaten den Schritt im Editor korrigieren.

```bash
infisical run --env=staging -- npx tsx scripts/repair-ingredient-mentions.ts \
  --decisions /tmp/ingredient-decisions.json \
  --report /tmp/ingredient-mentions-reviewed.json
```

## Anwenden, Fortsetzen und Rücknahme

```bash
infisical run --env=staging -- npx tsx scripts/repair-ingredient-mentions.ts \
  --apply /tmp/ingredient-mentions-reviewed.json \
  --journal /tmp/ingredient-mentions-undo.json

infisical run --env=staging -- npx tsx scripts/repair-ingredient-mentions.ts \
  --resume /tmp/ingredient-mentions-undo.json

infisical run --env=staging -- npx tsx scripts/repair-ingredient-mentions.ts \
  --rollback /tmp/ingredient-mentions-undo.json
```

Vor der ersten Datenänderung werden Journal und dessen Verzeichniseintrag synchron auf den Datenträger geschrieben. Je Rezept wird eine Transaktion mit Sperren und vollständigem Snapshot-Vergleich verwendet. Dieser berücksichtigt auch Zutatenänderungen, die den Rezept-Zeitstempel nicht aktualisieren. Neuere Änderungen führen zu einem Konflikt statt zum Überschreiben. Bereits erreichte Zielzustände werden beim Fortsetzen/Rücknehmen übersprungen; fehlgeschlagene Transaktionen hinterlassen keine halbe Reparatur. Konflikte/Fehler setzen Exit-Code 1 und werden je Rezept ausgegeben.

Berichte und Journal sicher bis zur abschließenden Prüfung aufbewahren. Rücknahme stellt nur die Rezeptschritte und durch diesen Lauf ergänzte Zutatenverwendungen wieder her. Bei einem unveränderten Rezept wird auch sein ursprünglicher Zeitstempel wiederhergestellt. Allgemeine Änderungen an Katalogzutaten oder Rezeptinhalten sind nicht Bestandteil der Migration.

## Verifikation

```bash
node --import tsx --test src/lib/ingredients/*.test.ts src/lib/importer/import-references.test.ts

# Nur gegen eine ausdrücklich isolierte Testdatenbank mit aktuellem Schema:
MENTION_TEST_DATABASE_URL=... node --import tsx --test \
  cli/lib/mention-repair-store.test.ts src/lib/importer/save-references.integration.test.ts
```

Integrationstests legen eigene Fixtures an und entfernen sie anschließend. Der Speichertest benötigt die vorhandene native Nodehun-Abhängigkeit und deutsche Hunspell-Wörterbücher. Die Moderationsantwort kommt ausschließlich von einem lokalen Testserver; es gibt keine OpenAI-Aufrufe. Produktionsdatenbanken sind keine Testumgebung.
