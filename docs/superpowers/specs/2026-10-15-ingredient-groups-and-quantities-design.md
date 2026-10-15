# Zutatenverwendungen und dynamische Portionsmengen

Stand: 15.10.2026. Vom Nutzer nach Rückstellung der Gruppierung inhaltlich bestätigt.
Ticket: KUC-88. KUC-92 (Zutatengruppen) bleibt im Backlog.

## Ziel und Umfang

Zutaten in Anleitung und Zutatenliste zeigen die Menge für die ausgewählte
Portionszahl. Antippen öffnet die Details der konkreten Verwendung. Dieselbe
Katalogzutat darf mehrfach mit verschiedenen Mengen und Hinweisen vorkommen.
Neue Importe, manuelles Bearbeiten und alte Rezepte nutzen dieselben Identitäten.

Beauftragt sind Mengenreparatur, dynamische Skalierung und geprüfte Bestandskorrektur.
Unklare historische Mengen und Verweise bleiben konkrete Prüffälle. Zutatengruppen,
KI-Gruppentitel, Gruppenmodell und Gruppenbearbeitung sind zurückgestellt: Titel
allein wären einfach, die verlässliche Zuordnung und Integration sind Zusatzarbeit.

## Bestand und Datenmodell

`fix/KUC-88-ingredient-references`, Commit `e4fe753`, enthält bereits Resolver,
getrennte Verwendungen, Popover und Reparatur-CLI mit Journal. Der Branch muss mit
aktuellem `main` integriert werden, ohne Squash; Bring! und persönliche API kamen
seitdem hinzu. Vorhandene fremde Änderungen bleiben erhalten.

`RecipeIngredient.id` identifiziert eine konkrete Verwendung. `ingredientId`
bleibt die Katalogidentität. `sourceId` hält Import-/Editor-IDs über wiederholtes
Speichern stabil. Die vorbereitete Migration entfernt den Unique-Index je
Katalogzutat und ergänzt `sourceId`. Keine weitere Schemaänderung für Gruppen.

Der aktuelle Viewer erhält unskalierte Mengen. Die vorbereitete Detailanzeige
allein löst diese Lücke nicht. Beim Speichern dürfen getrennte Verwendungen weder
zusammenfallen noch durch erneutes Autosave vervielfacht werden. Alle Importwege
(URL, Text, Bulk, CLI, Editor, persönliche API) nutzen denselben Resolver.

## Mengenberechnung

Eine gemeinsame reine Zahlenlogik verarbeitet die originale Mengenzeichenfolge
mit dem Faktor `ausgewählte Portionen / Originalportionen`. Zutatenliste, Viewer,
Druck und Bring! verwenden sie, ohne Mengen doppelt zu skalieren.

- Dezimalpunkt/-komma, Brüche, gemischte und Unicode-Brüche sowie einfache Bereiche.
- Faktor eins erhält die Originalschreibweise. Sonst deutsche Zahlendarstellung,
  höchstens zwei Nachkommastellen, ohne unnötige Nullen. Sehr kleine positive
  Mengen werden mit zwei signifikanten Stellen statt als null dargestellt.
- Beispiele bei Faktor zwei: `1/2` → `1`, `2–3` → `4–6`, `0,5` → `1`, `0,001` → `0,002`.
- Einheiten bleiben unverändert. Leere/unbekannte Mengen, „nach Geschmack“, „zum
  Frittieren“ und nicht eindeutig numerische Texte bleiben unverändert.
- Ungültige Faktoren (nicht endlich oder nicht positiv) verändern die Menge nicht;
  ungültige Portionswerte werden an der Eingabe abgewiesen.
- Normale Mentions speichern keine Gesamtmenge: `@[Schmand](row-id)`. Der Renderer
  liest die Verwendung und skaliert beim Anzeigen.
- Explizite Teilmengen wie `@[Wasser|100 ml](row-id)` beziehen sich auf die
  Originalportionen und skalieren ebenfalls einmal. Freie Overrides bleiben Text.
- Der Popover zeigt die skalierte Teilmenge, gegebenenfalls die skalierte gesamte
  Verwendung und deren Hinweise. Keine Übernahme der Menge einer anderen Verwendung.

## Anzeige und Transport

Die vorhandene Portionsauswahl steuert Zutatenliste, Text-, Flow-, Lane- und mobile
Kochansicht. Ansichtswechsel setzt Mengen nicht zurück. Eine gemeinsame Viewer-
Mengenquelle verhindert, dass einzelne Ansichten eigene Regeln entwickeln.

Die eigenständige `/mobile`-Seite bekommt eine kompakte Portionsauswahl und einen
validierten optionalen `servings`-Queryparameter. Ohne gültigen Parameter gelten
Originalportionen. Cast überträgt die gewählten Portionen optional mit dem Rezept;
der Receiver bleibt zu alten Nachrichten ohne Portionszahl kompatibel.

Druck erhält dieselben skalierten Originalmengen, auch bei Brüchen/Bereichen, und
lesbare Anleitungstexte ohne rohe Mention-Syntax. Suchindex und Nährwertberechnung
berücksichtigen jede Verwendung genau einmal. Bring!-Auswahl identifiziert eine
Verwendung separat vom Katalogartikel und skaliert deren Menge genau einmal.
Unbekannte Mengen bleiben als Hinweise erhalten. Die persönliche API erhält
bestehende Felder und ergänzt, soweit nötig, die eindeutige Verwendungsidentität.

## Bestandsreparatur und Lángos

Die CLI bleibt ohne Apply read-only. Plan und Journal enthalten Verweise und
wiederhergestellte Verwendungen; vollständiger Vorhervergleich verhindert das
Überschreiben paralleler Änderungen. Idempotenz, Resume und Rollback bleiben Pflicht.

Sichere Verweise werden automatisch repariert. Fehlende Verwendungen werden nur
aus geprüfter Evidenz bzw. einer expliziten Entscheidungsdatei wiederhergestellt.
Quell-URL allein und heutige Zutatenpositionen sind keine ausreichende Evidenz.

Lángos `cmn1pai9300lqszmg6f1alje6` wurde beim Live-Versuch mit Katalogverweisen und
festen Mention-Mengen für fünf Portionen versehen. Snapshots und Rücknahme liegen
unter `/home/paseo/task-artifacts/kuc88-live-single-20261015/` und auf jupiter unter
`/root/maintenance/kuc88-langos-20261015/`.

Den aktuellen Stand gegen diese Snapshots prüfen; aus der belegten Originalstruktur
Verwendungsreferenzen rekonstruieren, Creme-Salz ohne erfundene Menge als eigene
Verwendung wiederherstellen und ausschließlich die durch den Live-Versuch erzeugten
Gesamtmengen-Overrides entfernen. Echte Teilmengen und spätere Bearbeitungen bleiben
erhalten. Kein vorübergehendes Zurückrollen auf den fehlerhaften alten Zustand.

Alle übrigen Rezepte werden gescannt. Abschlussbericht: geprüft, bereits korrekt,
sicher repariert, ungültig und offen wegen fehlender Evidenz. Sichere Teilmigration
bedeutet nicht, dass sämtliche verlorenen Daten wiederhergestellt sind.

## Nachweis und Bereitstellung

Lokal und in isolierter Datenbank testen: 5 → 10 → 5 Portionen, doppelte Salzzeilen,
Teilmenge, unbekannte Menge, Popover, Autosave, Import, API, Druck und Einkauf.
Keine Testfixtures oder Tests auf jupiter. Browserprüfung auf Mobile und Desktop.

Review, Merge ohne Squash nach `main`, Schema-/App-Bereitstellung zuerst auf Staging.
Backup und geprüfte Bestandspläne vor produktivem Apply. Live ausschließlich reale
beauftragte Korrekturen und anschließende Verifikation: Lángos zuerst vollständig,
danach sichere Änderungen des Gesamtplans; verbleibende Prüffälle beziffern.

Keine neuen Secrets, Modellwechsel, Produktabhängigkeiten oder allgemeine
Neugestaltung der Rezeptseite. Umsetzung inline im bestehenden isolierten Worktree
ist die empfohlene Ausführung; der Ausführungsplan wird vor Beginn geprüft.
