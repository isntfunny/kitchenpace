# Wochenplan (Meal Plan) — Design-Spec

**Datum:** 2026-03-24
**Status:** Bereit zur Implementierung
**Scope:** Wochenplan-UI, Settings, Rezept-Suche, Smart Web Push
**Folge-Ticket:** Einkaufsliste (Shopping List UI) — separates Ticket

---

## 1. Ziel & Nutzen

Der Wochenplan gibt Nutzern eine strukturierte Übersicht über ihre geplanten Mahlzeiten für die aktuelle Woche. Er verbindet das Rezeptbuch mit dem Alltag: Rezepte planen, Zeiten festlegen, Nährwerte im Blick behalten — und zur richtigen Zeit eine Push-Benachrichtigung erhalten, wenn es Zeit wird, mit dem Kochen anzufangen.

---

## 2. Datenmodell

### Bestehende Modelle (bereits in `prisma/schema.prisma`)

Die folgenden Modelle existieren bereits und bilden die Grundlage:

- **`MealPlan`** — Wochenplan eines Nutzers (`userId`, `year`, `week`, `visibility`, `shareToken`)
- **`MealPlanRecipe`** — Eintrag in einem Plan (`mealPlanId`, `recipeId`, `mealType`, `servings`, `scheduledTime`, `status`)
- **`ShoppingList`** / **`ShoppingItem`** — Einkaufsliste (UI folgt als separates Ticket)
- **`MealType`** enum: `BREAKFAST / LUNCH / DINNER / SNACK`
- **`MealStatus`** enum: `PLANNED / IN_PROGRESS / COMPLETED / CANCELLED`

### Neue Felder / Erweiterungen

```prisma
// MealPlan: Kollaboratoren (forward-compatible für späteres "Circles"-Feature)
model MealPlanCollaborator {
  id         String   @id @default(cuid())
  mealPlanId String
  userId     String
  role       String   @default("viewer") // "viewer" | "editor"
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
}

// User: Display-Einstellungen für den Wochenplan
// Ergänzung in UserSettings oder als JSON-Feld in User/Profile
mealPlanSettings Json? // { showTimes: bool, showPortions: bool, showKcal: bool }
```

### Sichtbarkeit (`visibility` auf `MealPlan`)

| Wert      | Verhalten                                          |
| --------- | -------------------------------------------------- |
| `PRIVATE` | Nur für den Eigentümer (default)                   |
| `SHARED`  | Nur per direktem Link (`/meal-plan/share/[token]`) |
| `PUBLIC`  | Link per Slug + erscheint im Nutzerprofil          |

`shareToken` wird beim Erstellen des Plans automatisch als kryptographisch sicherer UUID generiert und ist nur bei `SHARED` aktiv.

---

## 3. URL-Struktur

```
/meal-plan                        → Redirect zur aktuellen KW
/meal-plan/[year]/[week]          → Wochenansicht (z.B. /meal-plan/2026/13)
/meal-plan/[year]/[week]/shopping → Einkaufsliste (Folge-Ticket)
/meal-plan/share/[token]          → Shared-Link (read-only)
```

Navigation zwischen Wochen: `‹` / `›` Buttons in der Topbar, jeweils `week ± 1` (mit Jahr-Überlauf).

---

## 4. Hauptansicht — Wochenansicht

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Topbar: ‹ KW 13 · 24–30. März 2026 › | ⚙️ Mahlzeiten  👥  │
├─────────────────────────────────────────────────────────────┤
│  ✨ Inspiration dieser Woche: [Chip] [Chip] [Chip]  Mehr →  │
├─────────────────────────────────────────────────────────────┤
│  [Heute]  [Di]  [Mi]  [Do]  [Fr]  [Sa]  [So]  │ 🛒 Widget  │
│  7 scrollbare Tageskarten                       │ (Preview) │
└─────────────────────────────────────────────────────────────┘
```

- **Topbar:** Week-Navigation + `⚙️ Mahlzeiten`-Button (öffnet Settings-Modal) + `👥 Mitbearbeiter einladen` (Button, für Kollaboratoren-Feature vorbereitet, zunächst öffnet Share-Dialog)
- **AI-Strip:** Horizontale Chip-Leiste mit Rezept-Inspirationen für die Woche (generiert aus Nutzer-Favoriten und Saison). "Mehr →" öffnet die Rezeptsuche vorausgefüllt mit KI-Vorschlägen.
- **Tageskarten:** Horizontal scrollbar, 7 Karten nebeneinander. Karte der aktuellen KW zeigt die heutige Karte als erste.

### Tageskarte

```
┌─────────────────┐
│ Heute           │  ← Heutiger Tag heißt "Heute" (statt Wochentag)
│ Montag, 24. März│  ← Datum als Untertitel
│ ~1 840 kcal     │  ← Tages-Summe (toggle-bar)
├─────────────────┤
│ FRÜHSTÜCK       │
│ [Slot]          │
│ MITTAGESSEN     │
│ [leerer Slot]   │
│ ABENDESSEN      │
│ [Slot]          │
└─────────────────┘
```

- **Heutiger Tag:** `day-name` zeigt "Heute", `day-date` zeigt "Montag, 24. März" — kein Pill-Badge
- **Andere Tage:** `day-name` zeigt den Wochentag ("Dienstag"), `day-date` zeigt das Datum
- **Kalorien-Badge:** Tages-Summe aus allen `MealPlanRecipe.recipe.nutrition.calories * servings` — nur wenn `showKcal: true` (User-Einstellung)
- **Unvollständige Tage** (weniger als 2 Mahlzeiten geplant): Karte leicht transparent (`opacity: 0.8`), Badge zeigt "unvollständig"
- **Heutige Karte:** `border: 2px solid var(--primary)` + stärkerer Schatten

### Mahlzeit-Slot

**Belegter Slot:**

```
┌────────────────────┐
│ 07:30              │  ← Mini-Zeit oben links (toggle-bar: showTimes)
│ Avocado Toast      │  ← Rezeptname, fett
│ 2 Portionen        │  ← (toggle-bar: showPortions)
└────────────────────┘
```

**Leerer Slot:**

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│    + hinzufügen     │  ← gestrichelte Border, click → Rezeptsuche
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Slot-Interaktionen:**

- **Klick auf belegten Slot** → Popover mit Rezept-Details + Aktionen (Rezept öffnen, Portionen ändern, Uhrzeit ändern, Entfernen)
- **Klick auf leeren Slot** → Rezeptsuche-Modal (mit vorausgefülltem Mahlzeit-Typ)
- **Klick auf "+ Mahlzeit hinzufügen"** am Kartenende → Dropdown: Standard-Typen + "Eigene Mahlzeit..."

---

## 5. Settings-Modal (`⚙️ Mahlzeiten`)

Öffnet sich als Radix Dialog/Modal über der Hauptansicht. Einstellungen gelten für die aktuelle Woche.

### Abschnitt 1: Aktive Mahlzeiten (KW XX)

Toggle-Tags für die Standard-Mahlzeiten + Zeit-Input je aktivierter Mahlzeit:

```
[✓ Frühstück]   07:30
[  Mittagessen] 12:00  (ausgegraut wenn inaktiv)
[✓ Snack]       15:30
[✓ Abendessen]  19:00

Eigene Mahlzeit: [_______________] [+]
```

- Eigene Mahlzeit-Namen werden als zusätzliche Slots an allen Tagen der Woche hinzugefügt
- Deaktivierte Mahlzeiten werden aus allen Tageskarten ausgeblendet (Daten bleiben erhalten)

### Abschnitt 2: Anzeige (User-Einstellung, persistent)

```
Uhrzeiten anzeigen       [Toggle] ← showTimes (default: true)
  Mini-Zeit oben links im Slot

Portionen anzeigen       [Toggle] ← showPortions (default: false)
  Anzahl Portionen pro Mahlzeit

Kalorien im Tages-Header [Toggle] ← showKcal (default: true)
  Geschätzte Tages-kcal über den Slots
```

Einstellungen werden in `User.mealPlanSettings` (JSON) gespeichert.

---

## 6. Rezept hinzufügen

### Weg A: Slot-Klick → Suchmodal

Klick auf leeren Slot öffnet ein Vollbild-Modal mit:

- Suchfeld (Freitext, debounced)
- Filter: Mahlzeit-Typ, Dauer, Kalorien-Range
- Rezept-Karten (Bild, Name, Portionen, Dauer)
- Klick auf Karte → Portionen-Input → "Zum Plan hinzufügen"

### Weg B: "Zum Plan" auf Rezept-Seite

Auf `/recipe/[id]` und der Rezept-Filterseite erscheint ein Button "Zum Plan hinzufügen". Klick öffnet ein Popover/Sheet:

```
Zum Plan hinzufügen

Woche:     [KW 13 ▾]
Tag:       [Montag  ▾]
Mahlzeit:  [Frühstück ▾]
Portionen: [2]
Uhrzeit:   [07:30]

[Hinzufügen]
```

Nach Bestätigung: Erfolgs-Toast + Link zur Wochenplan-Ansicht.

---

## 7. Smart Web Push — Koch-Start-Benachrichtigung

### Ziel

Wenn ein Rezept mit `scheduledTime` geplant ist, erhält der Nutzer eine Push-Benachrichtigung zur idealen Koch-Startzeit: `scheduledTime − (prepTime + cookTime) − 10min Puffer`.

### Voraussetzungen

- Rezept hat `prepTime` und/oder `cookTime` (in Minuten)
- `MealPlanRecipe.scheduledTime` ist gesetzt
- Nutzer hat Push-Benachrichtigungen aktiviert (`PushSubscription` vorhanden)
- `notificationPreferences` auf User-Profil erlaubt Meal-Reminders

### Architektur

```
Cron (täglich 06:00)
  └─ Scannt alle MealPlanRecipe für heute mit scheduledTime
  └─ Berechnet cookStartAt = scheduledTime - prepTime - cookTime - 10min
  └─ Falls cookStartAt > jetzt: erstellt JobRun { type: "MEAL_PUSH", scheduledAt: cookStartAt }

Worker (polling)
  └─ Holt fällige JobRuns (scheduledAt <= now)
  └─ Lädt PushSubscription des Nutzers
  └─ Sendet Web Push: "Zeit anzufangen: [Rezeptname] · fertig um [scheduledTime]"
  └─ Markiert JobRun als COMPLETED
```

### Push-Inhalt

```
Titel: "Zeit anzufangen! 🍳"
Body:  "[Rezeptname] · fertig um 19:00"
Icon:  /icons/push-chef.png
URL:   /meal-plan/[year]/[week]
```

### Edge Cases

- `prepTime + cookTime = 0` → kein Push (keine Zeitinfo vorhanden)
- `cookStartAt` liegt in der Vergangenheit (zu spät geplant) → JobRun wird nicht erstellt, kein Push
- Mehrere Mahlzeiten am gleichen Tag → je ein JobRun pro Mahlzeit
- Nutzer löscht Mahlzeit nach Push-Erstellung → Worker prüft vor dem Senden ob `MealPlanRecipe` noch existiert und `status !== CANCELLED`

---

## 8. Sichtbarkeit & Teilen

### Share-Dialog

Öffnet sich über `👥 Mitbearbeiter einladen` Button in der Topbar (zunächst nur Share-Funktionalität, Kollaboratoren-Editing folgt mit Circles-Feature):

```
Plan teilen

[○] Privat        Nur du siehst diesen Plan
[○] Per Link      Wer den Link hat, kann mitlesen
[●] Öffentlich    Im Profil sichtbar + per Link erreichbar

Link: https://kuechentakt.de/meal-plan/share/abc123...  [Kopieren]
```

- `PRIVATE` → kein Link angezeigt
- `SHARED` → Token-URL angezeigt (`/meal-plan/share/[shareToken]`)
- `PUBLIC` → Slug-URL angezeigt, Plan erscheint in `GET /user/[slug]` Profil-Seite

### Share-View (`/meal-plan/share/[token]`)

Read-only Ansicht des Plans. Keine Authentifizierung nötig. Kein "Zum Plan" Button, keine Bearbeitungsmöglichkeit. Topbar zeigt "Plan von [Nutzername]" statt Edit-Controls.

---

## 9. KI-Inspirations-Strip

Der gelbe Strip unterhalb der Topbar zeigt 3–5 Rezept-Chips als Wocheninspiration.

**Generierungslogik (serverseitig, einmal pro Woche gecached):**

1. Hole Nutzer-Favoriten (letzte 30 Tage)
2. Hole Rezepte nach aktuellem Monat (saisonal)
3. Exclude: Rezepte die bereits in dieser Woche geplant sind
4. Wähle 5 Rezepte aus (Mix aus Favoriten-ähnlich + saisonal)
5. Cache in Redis/DB für die aktuelle KW des Nutzers

"Mehr →" öffnet die Rezeptsuche vorausgefüllt mit den KI-Vorschlägen.

---

## 10. Einkaufsliste (Folge-Ticket)

Die Datenmodelle `ShoppingList` und `ShoppingItem` existieren bereits. Die UI für die Einkaufsliste (Vollansicht unter `/meal-plan/[year]/[week]/shopping`, automatische Aggregation aus geplanten Rezepten, manuelle Items) wird als **separates Feature-Ticket** spezifiziert und implementiert.

In dieser Phase: Nur ein minimales Widget in der rechten Spalte der Wochenansicht (read-only Preview der ersten N Items, Link zu "Vollansicht →").

---

## 11. Future: Circles / Gruppen-Planung

Nicht in diesem Ticket. Kurz-Notiz für späteres Ticket:

- Gruppen ("Circles") mit mehreren Mitgliedern teilen einen gemeinsamen Wochenplan
- `MealPlanCollaborator` Tabelle ist bereits in diesem Spec als Schema-Erweiterung vorgesehen (forward-compatible)
- Mitglieder können gemeinsam Rezepte planen und Einkaufsliste teilen
- Benachrichtigungen bei Änderungen durch andere Mitglieder

---

## 12. Technische Entscheidungen

| Entscheidung        | Wahl                            | Begründung                                           |
| ------------------- | ------------------------------- | ---------------------------------------------------- |
| Modal-System        | Radix Dialog                    | Bereits im Projekt für alle anderen Modals verwendet |
| Settings-Persistenz | `User.mealPlanSettings` JSON    | Nutzer-spezifisch, nicht Wochen-spezifisch           |
| Wochennavigation    | URL-Parameter `[year]/[week]`   | Direkt verlinkbar, Browser-Back funktioniert         |
| Push-Scheduling     | Worker + JobRun                 | Bestehende Infrastruktur, keine neue Abhängigkeit    |
| Share-Token         | kryptographischer UUID          | Unguessable, serverseitig validiert                  |
| Kalorie-Berechnung  | `nutrition.calories * servings` | Approximation, Rezept-Daten bereits vorhanden        |
| AI Strip Cache      | Redis (bestehend)               | Teuer in Generierung, selten geändert                |
