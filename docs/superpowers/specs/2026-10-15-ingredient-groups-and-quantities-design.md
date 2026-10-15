# Zutatenverwendungen, Portionsmengen und Teilzubereitungen

Stand: 15.10.2026. Schriftlicher Entwurf zur Review vor Umsetzung der Erweiterung.
Tickets: KUC-88 (Referenzen, Mengen, Bestandsreparatur), KUC-92 (Gruppen).

## Ziel und beauftragter Umfang

Zutaten in einer Anleitung zeigen die Menge für die ausgewählte Portionszahl.
Antippen öffnet die Details der konkreten Verwendung. Zutaten können nach
Teilzubereitungen wie „Teig“, „Knoblauchcreme“ und „Zum Belegen“ gruppiert sein.
Die KI erzeugt Gruppen und kurze bearbeitbare Titel zusammen mit dem Verlauf.
Dieselbe Katalogzutat darf mit verschiedenen Mengen in mehreren Gruppen stehen.
Neue Importe, manuelles Bearbeiten und alte Rezepte sollen dieselben Regeln nutzen.

Der Nutzer hat Mengenreparatur, Skalierung und automatische Gruppen ausdrücklich
beauftragt. Sichere Bestandskorrekturen gehören zur Arbeit; unklare historische
Mengen und Zuordnungen bleiben als konkrete Prüffälle offen, statt geraten zu werden.

## Befund und Integrationsbasis

- `fix/KUC-88-ingredient-references`, Commit `e4fe753`, enthält den vorbereiteten
  Resolver, getrennte Verwendungen, Popover und eine Reparatur-CLI mit Journal.
  Der Branch muss mit aktuellem `main` integriert werden, ohne Squash.
- `main` hat inzwischen Bring! und eine persönliche API. Diese Save-/Read-Wege
  müssen dieselben Identitäten und optionalen Gruppen erhalten.
- Die Portionsauswahl skaliert bisher nur die Zutatenliste. Der Viewer bekommt
  unskalierte Mengen; sein `override` überschreibt die Mengenauswahl vollständig.
- Der vorbereitete Popover allein schließt diese Lücke nicht.
- Der Live-Versuch änderte ausschließlich das Lángos-Rezept
  `cmn1pai9300lqszmg6f1alje6`: Katalogreferenzen und feste Mention-Mengen für fünf
  Portionen. Vorher-/Nachher-Snapshots und Rücknahme liegen unter
  `/home/paseo/task-artifacts/kuc88-live-single-20261015/` und auf jupiter unter
  `/root/maintenance/kuc88-langos-20261015/`.
- Der heutige Unique-Index lässt nur eine Verwendung je Katalogzutat zu. Dadurch
  fehlt beim Lángos die separate Salzzeile für die Creme. Die gespeicherte
  Originalantwort belegt hierfür eine unbekannte Menge zum Abschmecken.

## Entscheidung und Alternativen

Empfohlen: eigene Rezeptgruppen und konkrete Zutatenverwendungen speichern;
Mengen beim Rendern skalieren. Dies trägt manuelle Änderungen, mehrere Mengen
derselben Zutat und stabile Verweise über wiederholtes Speichern.

Gruppen nur aus aktuellen Graphverzweigungen zu berechnen wäre instabil: Ein
Schritt kann Zutaten mehrerer Teilzubereitungen zusammenführen, und eine Kante
liefert keinen zuverlässigen Gruppentitel. Feste Mengen in Beschreibungstexten
lösen dagegen weder Portionsänderungen noch verlorene Zutatenverwendungen.

## Datenmodell und Identität

- `RecipeIngredient.id` identifiziert eine konkrete Verwendung. `ingredientId`
  bleibt die Katalogidentität; `sourceId` bindet Import-/Editor-IDs stabil.
- KUC-88 entfernt die Eindeutigkeitsbeschränkung je Katalogzutat. Zwei Salzzeilen
  sind zulässig; erneutes Autosave erzeugt keine zusätzlichen Verwendungen.
- Neues `RecipeIngredientGroup`: `id`, `recipeId`, `title`, `position`.
  Gruppen gehören genau einem Rezept; beim Löschen des Rezepts verschwinden sie.
- `RecipeIngredient.groupId` ist nullable. Ungruppierte Zutaten bleiben gültig.
  Beim Löschen einer Gruppe bleiben ihre Zutaten erhalten und werden ungruppiert.
- Eine Verwendung gehört höchstens einer Gruppe. Braucht dieselbe Zutat zwei
  Mengen in zwei Teilzubereitungen, gibt es zwei Verwendungen mit eigener Menge.
- Gruppe und Verwendung werden in derselben Rezepttransaktion gespeichert.
  Fremde Gruppen-IDs und ungültige Zuordnungen werden abgewiesen.
- Gruppen haben eine explizite Reihenfolge, Zutaten ihre bestehende Reihenfolge.
  Innerhalb jeder Gruppe gilt die Zutatenreihenfolge. Leere Gruppen werden nicht
  als leere Abschnitte im öffentlichen Rezept dargestellt.

## Mengenberechnung und Anzeige

Eine gemeinsame reine Mengenfunktion verarbeitet die originale Mengenzeichenfolge
und den Faktor `ausgewählte Portionen / Originalportionen`. Sie wird von
Zutatenliste, Viewer und Druck benutzt; Bring! verwendet dieselbe Zahlenlogik.

- Dezimalpunkt und Dezimalkomma, Brüche einschließlich gemischter Brüche,
  Unicode-Brüche und einfache Bereiche werden unterstützt.
- Bei Faktor eins bleibt die ursprüngliche Schreibweise erhalten.
- Bei anderen Faktoren werden Zahlen mit maximal zwei Nachkommastellen ohne
  abschließende Nullen dargestellt; sehr kleine positive Mengen bleiben sichtbar
  und werden nicht auf null gerundet. Einheiten werden nicht umgerechnet.
- Mengenbereiche skalieren beide Grenzen. Beispielsweise wird `1/2` bei Faktor
  zwei zu `1`, `2–3` zu `4–6` und `0,5` zu `1`.
- Leere oder unbekannte Mengen, „nach Geschmack“, „zum Frittieren“ und sonstige
  nicht eindeutig numerische Hinweise bleiben Text. Es wird keine Menge erfunden.
- Nur positive endliche Portionszahlen und Faktoren sind gültig. Ungültige
  Eingaben skalieren nicht und werden an der Eingabe abgewiesen.
- Normale Mentions enthalten keine kopierte Gesamtmenge: `@[Schmand](row-id)`.
  Der Renderer liest die konkrete Verwendung und skaliert genau einmal.
- Explizite Teilmengen wie `@[Wasser|100 ml](row-id)` sind auf die Originalportionen
  bezogen und skalieren ebenfalls einmal. Nichtnumerische Overrides bleiben Text.
- Der Popover zeigt die skalierte Teilmenge, bei Abweichung die skalierte gesamte
  Rezeptverwendung und deren Hinweise. Er darf keine Menge einer anderen
  gleichnamigen Verwendung zeigen.

Die Portionsauswahl der Rezeptseite speist alle Ansichten des Viewers, einschließlich
Textansicht, Flow, Lane-Ansicht und mobiler Kochansicht. Wechsel zwischen Ansichten
darf Mengen nicht zurücksetzen. Die eigenständige `/mobile`-Seite bekommt eine
kompakte Portionsauswahl und akzeptiert einen validierten optionalen
`servings`-Queryparameter. Aufrufe ohne Parameter beginnen bei den Originalportionen.
Cast überträgt die gewählten Portionen optional mit dem Rezept; der Receiver
bleibt zu alten Nachrichten ohne Portionszahl kompatibel.

## Gruppierung bei Import und Bearbeitung

Das gemeinsame KI-Ergebnis bekommt `ingredientGroups: [{ id, title }]` und ein
nullable `groupId` pro Zutat. IDs sind lokale Ergebnis-IDs und werden beim Speichern
in Rezeptgruppen-IDs übersetzt. Ein leerer Gruppenarray bedeutet ein flaches Rezept.
Die Servervalidierung prüft eindeutige Gruppen-IDs und gültige Verweise.

Der Prompt verlangt Teilzubereitungen statt bloßer Aktionskategorien. Vorhandene
Überschriften der Quelle werden bevorzugt. Fehlen sie, darf die KI aus dem
vollständigen Rezept und dessen Zwischenprodukten kurze deutsche Titel vorschlagen.
Bei fehlender belastbarer Zuordnung bleibt `groupId` null. Mengen dürfen weder
durch Gruppierung erfunden noch auf mehrere Verwendungen kopiert werden.

URL-, Text-, Bulk-, CLI-, Editor- und persönliche API-Importe verwenden dieselben
Schemas und Transformations-/Speicherfunktionen. Zod und das strikte JSON-Schema
werden gemeinsam angepasst. Alte gespeicherte Importantworten ohne Gruppen bleiben
als Beweismaterial lesbar. Die Promptänderung benötigt keinen Modellwechsel.

Im Zutatenbereich des Formulars können Nutzer Gruppen anlegen, benennen,
umsortieren und löschen sowie jede Verwendung einer Gruppe zuweisen. Dieselbe
Katalogzutat kann erneut als eigene Verwendung hinzugefügt werden. Gruppentitel
und Zuordnung gehören zu Autosave und manuellem Speichern. Im KI-Review ist die
Gruppierung Bestandteil der Zutatenübernahme: „nur Verlauf übernehmen“ ersetzt
keine vorhandenen Gruppen, Zutaten oder manuell vergebenen Titel.

Die öffentliche Zutatenliste und der Druck zeigen geordnete Gruppenüberschriften,
danach gegebenenfalls „Weitere Zutaten“. Ein völlig ungruppiertes Rezept behält
seine flache Darstellung. Titel werden als Text behandelt.

## Kompatibilität mit Suche, Ernährung, Bring! und API

Gruppen ergänzen die bisherigen flachen Zutaten. Suchindex, Nährwertberechnung und
Einkaufsübernahme verarbeiten weiterhin jede konkrete Verwendung genau einmal.
Gleiche Katalogzutaten dürfen für eine Einkaufsliste nur bei kompatiblen Einheiten
zusammengefasst werden. Unbekannte Mengen werden nicht in numerische Summen
umgewandelt oder fallengelassen. Die API liefert zusätzlich geordnete Gruppen und
nullable `groupId`, ohne bestehende Zutatenfelder zu entfernen.

## Bestandsreparatur und Live-Versuch

Die vorhandene CLI bleibt read-only ohne explizites Apply. Bericht und Journal
enthalten auch Gruppen, Zuordnungen und bei Bedarf wiederhergestellte Verwendungen.
Vollständiger Vorhervergleich schützt Rezept, Zutaten und Gruppen vor dem
Überschreiben paralleler Änderungen. Resume, idempotenter Wiederholungslauf und
Rollback gehören zur Verifikation.

Sichere Referenzen werden automatisch repariert. Fehlende Verwendungen und Gruppen
werden nur aus überprüfter Evidenz oder einer expliziten Entscheidungsdatei
wiederhergestellt. Eine per Quell-URL gefundene Importantwort ist allein kein
Beweis. Indexpositionen der heutigen Zutatenliste sind kein Ersatz für historische
Import-IDs. Ohne belastbare Evidenz bleibt ein Rezept ungruppiert beziehungsweise
der konkrete Verweis im Prüfbericht.

Für Lángos: Vorher-/Nachher-Snapshot des Live-Versuchs gegen den aktuellen Stand
prüfen. Auf dieser Grundlage die ursprünglichen Referenzen aus der gesicherten
Originalstruktur in dauerhafte Verwendungs-IDs auflösen, Creme-Salz als eigene
Verwendung ohne erfundene Menge wiederherstellen und die nur durch den Live-Versuch
hinzugefügten festen Gesamtmengen entfernen. Andere echte Teilmengen bleiben
erhalten. Gruppen „Teig“, „Knoblauchcreme“, „Zum Ausbacken“ und „Zum Belegen“ werden
anhand der geprüften Originalzutaten und Schritte ausdrücklich zugeordnet.

Alle übrigen Rezepte werden gescannt. Der Abschlussbericht unterscheidet geprüft,
sicher repariert, bereits korrekt, ungültig sowie offen wegen fehlender Evidenz.
Eine erfolgreiche sichere Teilmigration bedeutet nicht, dass alle Altbestände
vollständig wiederhergestellt sind.

## Nachweis und Bereitstellung

1. Aktuelles `main` und KUC-88 im bestehenden isolierten Worktree integrieren.
2. Mengen-, Identitäts-, Gruppen- und Migrationsregressionen lokal und auf einer
   isolierten Datenbank prüfen. Keine Testfixtures oder Tests auf jupiter.
3. Browserprüfung auf Mobile und Desktop: 5 → 10 → 5 Portionen, sämtliche Ansichten,
   Teilmengen, Popover und Gruppen; Autosave mit wiederholten Salzverwendungen.
4. API-Import, Druck, Einkauf und Ernährung auf Erhaltung aller Verwendungen prüfen.
5. Review, Merge ohne Squash nach `main`, Schema-/Anwendungsbereitstellung zuerst
   auf Staging; Backup und überprüfte Bestandspläne vor produktivem Apply.
6. Live nur reale beauftragte Datenkorrekturen und anschließende Verifikation.
   Den Lángos-Fall zuerst vollständig prüfen, danach sichere Änderungen des
   Gesamtplans anwenden und offene Fälle mit Zahlen dokumentieren.

Die Freigabe dieses Entwurfs definiert den Umfang. Konkrete Implementierungsschritte
werden anschließend im Ausführungsplan festgelegt. Neue Secrets, Modellwechsel,
ungefragte Abhängigkeiten und allgemeine Neugestaltung der Rezeptseite sind nicht
Teil dieser Arbeit.
