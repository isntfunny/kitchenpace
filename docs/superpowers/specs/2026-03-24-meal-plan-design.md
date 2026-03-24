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

- **`MealPlan`** — hat `userId`, `startDate`, `endDate` (DateTime). Fehlende Felder → Migration erforderlich (siehe unten).
- **`MealPlanRecipe`** — hat `mealPlanId`, `recipeId`, `mealType`, `servings`, `date`, `status`, `notes`. Kein `scheduledTime` → Migration erforderlich.
- **`ShoppingList`** / **`ShoppingItem`** — existieren, UI folgt als separates Ticket.
- **`MealType`** enum: `BREAKFAST / LUNCH / DINNER / SNACK`
- **`MealStatus`** enum: `PLANNED / IN_PROGRESS / COMPLETED / CANCELLED`

### Neue Felder / Migrationen

```prisma
// MealPlan: Sichtbarkeit + Share-Token
model MealPlan {
  // ... bestehende Felder ...
  visibility  String  @default("PRIVATE") // PRIVATE | SHARED | PUBLIC
  shareToken  String? @unique             // gesetzt bei SHARED, kryptographischer UUID
}

// MealPlanRecipe: Uhrzeit für Push-Benachrichtigung
model MealPlanRecipe {
  // ... bestehende Felder ...
  scheduledTime DateTime? // Lokale Uhrzeit in UTC gespeichert (Konvertierung im Client)
  customMealType String?  // für eigene Mahlzeit-Namen (z.B. "Brunch", "Nachts")
}

// User: Display-Einstellungen (JSON im User-Modell)
model User {
  // ... bestehende Felder ...
  mealPlanSettings Json? // { showTimes: bool, showPortions: bool, showKcal: bool }
}

// MealPlanCollaborator: forward-compatible für Circles-Feature
model MealPlanCollaborator {
  id         String   @id @default(cuid())
  mealPlanId String
  userId     String
  role       String   @default("viewer") // "viewer" | "editor"
  mealPlan   MealPlan @relation(fields: [mealPlanId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
}
```

### Hilfsfunktion: Jahr/KW aus `startDate`

Da `MealPlan` `startDate`/`endDate` statt `year`/`week` speichert, werden Jahr und KW-Nummer clientseitig und serverseitig aus `startDate` berechnet (ISO 8601 Kalenderwoche via `date-fns/getISOWeek`). Die URL `/meal-plan/2026/13` löst den passenden Plan über `startDate` auf.

### Sichtbarkeit (`visibility` auf `MealPlan`)

| Wert      | Verhalten                                                          |
| --------- | ------------------------------------------------------------------ |
| `PRIVATE` | Nur für den Eigentümer (default)                                   |
| `SHARED`  | Nur per direktem Link (`/meal-plan/share/[shareToken]`)            |
| `PUBLIC`  | Unter `/meal-plan/[year]/[week]` des Eigentümers + im Nutzerprofil |

`shareToken` wird beim Erstellen des Plans als kryptographischer UUID generiert (`crypto.randomUUID()`).

---

## 3. URL-Struktur

```
/meal-plan                        → Redirect zur aktuellen KW
/meal-plan/[year]/[week]          → Wochenansicht (z.B. /meal-plan/2026/13)
/meal-plan/[year]/[week]/shopping → Einkaufsliste (Folge-Ticket)
/meal-plan/share/[token]          → Shared-Link (read-only, kein Login nötig)
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

- **Topbar:** Week-Navigation + `⚙️ Mahlzeiten`-Button (öffnet Settings-Modal) + `👥 Mitbearbeiter einladen` (öffnet Share-Dialog, Kollaboratoren-Editing folgt mit Circles-Feature)
- **AI-Strip:** Horizontale Chip-Leiste mit Rezept-Inspirationen. "Mehr →" öffnet die Rezeptsuche.
- **Tageskarten:** Horizontal scrollbar, 7 Karten. Heutige Karte zuerst.

### Tageskarte

```
┌─────────────────┐
│ Heute           │  ← Heutiger Tag heißt "Heute" (statt Wochentag)
│ Montag, 24. März│  ← Datum als Untertitel
│ ~1 840 kcal     │  ← Tages-Summe (nur wenn showKcal: true)
├─────────────────┤
│ FRÜHSTÜCK       │
│ [Slot]          │
│ MITTAGESSEN     │
│ [leerer Slot]   │
│ ABENDESSEN      │
│ [Slot]          │
└─────────────────┘
```

- **Heutiger Tag:** `day-name` = "Heute", `day-date` = "Montag, 24. März" — kein Pill-Badge
- **Andere Tage:** `day-name` = Wochentag ("Dienstag"), `day-date` = Datum
- **Kalorien-Badge:** `Recipe.caloriesPerServing * servings` pro Mahlzeit summiert — nur wenn `showKcal: true`
- **Unvollständige Tage:** Weniger Mahlzeiten als aktive Mahlzeit-Typen des Nutzers → `opacity: 0.8`, Badge "unvollständig"
- **Heutige Karte:** `border: 2px solid var(--primary)` + stärkerer Schatten

### Mahlzeit-Slot

**Belegter Slot:**

```
┌────────────────────┐
│ 07:30              │  ← Mini-Zeit oben links (nur wenn showTimes: true)
│ Avocado Toast      │  ← Rezeptname, fett
│ 2 Portionen        │  ← (nur wenn showPortions: true)
└────────────────────┘
```

**Leerer Slot:**

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│    + hinzufügen     │  ← gestrichelte Border, click → Rezeptsuche
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Slot-Interaktionen:**

- **Klick auf belegten Slot** → Popover: Rezept öffnen / Portionen ändern / Uhrzeit ändern / Entfernen
- **Klick auf leeren Slot** → Rezeptsuche-Modal (Mahlzeit-Typ vorausgefüllt)
- **"+ Mahlzeit hinzufügen"** am Kartenende → Dropdown: Standard-Typen + "Eigene Mahlzeit..."

---

## 5. Settings-Modal (`⚙️ Mahlzeiten`)

Radix Dialog. Zwei Abschnitte:

### Abschnitt 1: Aktive Mahlzeiten (pro Woche, in `MealPlan` gespeichert)

```
[✓ Frühstück]   07:30
[  Mittagessen] 12:00  (ausgegraut wenn inaktiv)
[✓ Snack]       15:30
[✓ Abendessen]  19:00

Eigene Mahlzeit: [_______________] [+]
```

- Aktive Mahlzeiten + Uhrzeiten werden **pro Woche** im `MealPlan` als JSON gespeichert (z.B. `activeMeals: [{ type: "BREAKFAST", time: "07:30", enabled: true }, ...]`)
- Eigene Mahlzeiten: `customMealType` String auf `MealPlanRecipe`, angezeigt als eigener Slot-Typ
- Deaktivierte Mahlzeiten: aus Tageskarten ausgeblendet, Daten bleiben erhalten
- Uhrzeiten: als Default-Zeit beim Hinzufügen eines Rezepts vorgeschlagen

### Abschnitt 2: Anzeige (per User, persistent in `User.mealPlanSettings`)

```
Uhrzeiten anzeigen       [Toggle ✓]   showTimes    (default: true)
  Mini-Zeit oben links im Slot

Portionen anzeigen       [Toggle ✗]   showPortions (default: false)
  Anzahl Portionen pro Mahlzeit

Kalorien im Tages-Header [Toggle ✓]   showKcal     (default: true)
  Geschätzte Tages-kcal über den Slots
```

---

## 6. Rezept hinzufügen

### Weg A: Slot-Klick → Suchmodal

Klick auf leeren Slot öffnet ein Modal mit:

- Suchfeld (Freitext, debounced)
- Filter: Mahlzeit-Typ, Dauer, Kalorien-Range
- Rezept-Karten (Bild, Name, Dauer)
- Klick → Portionen-Input + optionale Uhrzeit (vorausgefüllt aus Mahlzeit-Default) → "Zum Plan hinzufügen"

### Weg B: "Zum Plan" auf Rezept-Seite

Button auf `/recipe/[id]` (kleine Änderung an bestehendem RecipeDetailClient). Öffnet Popover/Sheet:

```
Zum Plan hinzufügen

Woche:     [KW 13 ▾]
Tag:       [Montag  ▾]
Mahlzeit:  [Frühstück ▾]
Portionen: [2]
Uhrzeit:   [07:30]    ← vorausgefüllt aus aktiver Mahlzeit-Einstellung

[Hinzufügen]
```

Nach Bestätigung: Erfolgs-Toast + Link zur Wochenplan-Ansicht.

---

## 7. Smart Web Push — Koch-Start-Benachrichtigung

### Ziel

Wenn ein Rezept mit `scheduledTime` geplant ist, erhält der Nutzer einen Push zur idealen Koch-Startzeit:
`cookStartAt = scheduledTime − prepTime − cookTime − 10min Puffer`

### Voraussetzungen

- `MealPlanRecipe.scheduledTime` ist gesetzt
- Rezept hat `prepTime` und/oder `cookTime` (Minuten, bereits in Schema)
- Nutzer hat aktive `PushSubscription` → Opt-in-Prüfung: einfach ob `PushSubscription` für den User existiert (kein separates `notificationPreferences`-Feld nötig in dieser Phase)

### Zeitzone

`scheduledTime` wird in UTC in der DB gespeichert. Der Client sendet beim Speichern die lokale Uhrzeit als UTC (`new Date(...)` im Browser). Die Push-Benachrichtigung zeigt die lokal formatierte Zeit.

### Architektur

BullMQ Delayed Jobs (kein neues `scheduledAt` Feld auf `JobRun` nötig — BullMQ unterstützt `delay` nativ):

```
Cron (täglich 06:00 Serverzeit)
  └─ Scannt alle MealPlanRecipe für heute mit scheduledTime
  └─ Berechnet cookStartAt = scheduledTime - prepTime - cookTime - 10min
  └─ Falls cookStartAt > jetzt:
       queue.add("MEAL_PUSH", { mealPlanRecipeId }, { delay: cookStartAt - now })
  └─ Falls cookStartAt in Vergangenheit → kein Job (zu spät)

BullMQ Worker (MEAL_PUSH job)
  └─ Lädt MealPlanRecipe → prüft: existiert noch? status !== CANCELLED?
  └─ Lädt PushSubscription des Nutzers
  └─ Sendet Web Push
  └─ Markiert Job als erledigt
```

### Push-Inhalt

```
Titel: "Zeit anzufangen! 🍳"
Body:  "[Rezeptname] · fertig um 19:00"
Icon:  /icons/push-chef.png
URL:   /meal-plan/[year]/[week]
```

### Edge Cases

- `prepTime + cookTime = 0` → kein Push
- `cookStartAt` in Vergangenheit → kein Job
- Mehrere Mahlzeiten am Tag → je ein Job
- Mahlzeit gelöscht/cancelled nach Job-Erstellung → Worker prüft vor dem Senden

---

## 8. Sichtbarkeit & Teilen

### Share-Dialog (über `👥` Button)

```
Plan teilen

[○] Privat      Nur du siehst diesen Plan
[○] Per Link    Wer den Link hat, kann mitlesen
[●] Öffentlich  Im Profil sichtbar + per direktem Link erreichbar

Link: https://kuechentakt.de/meal-plan/share/abc123  [Kopieren]
```

- `PRIVATE` → kein Link
- `SHARED` → Token-URL (`/meal-plan/share/[shareToken]`)
- `PUBLIC` → Token-URL UND Plan erscheint im Nutzerprofil unter `GET /user/[slug]`

### Share-View (`/meal-plan/share/[token]`)

Read-only. Kein Login erforderlich. Topbar zeigt "Plan von [Nutzername]" ohne Edit-Controls.

---

## 9. KI-Inspirations-Strip

Gelber Strip unterhalb der Topbar. Serverseitig generiert, einmal pro Woche gecached (Redis).

**Logik:**

1. Nutzer-Favoriten der letzten 30 Tage
2. Saisonale Rezepte (aktueller Monat)
3. Exclude: bereits in dieser Woche geplante Rezepte
4. Mix: 3 aus Favoriten-ähnlich, 2 saisonal → max. 5 Chips
5. Fallback wenn keine Favoriten: nur saisonal/trending

---

## 10. Einkaufsliste (Folge-Ticket)

`ShoppingList` und `ShoppingItem` existieren bereits im Schema. UI (Vollansicht, Aggregation, manuelle Items) ist separates Ticket.

Diese Phase: Minimales read-only Widget in der rechten Spalte der Wochenansicht (erste 5 Items, "Vollansicht →" Link).

---

## 11. Future: Circles / Gruppen-Planung

Separates Ticket. Vorbereitung in diesem Ticket: `MealPlanCollaborator` Tabelle wird als Schema-Migration angelegt (forward-compatible, noch keine UI).

---

## 12. Technische Entscheidungen

| Entscheidung             | Wahl                                        | Begründung                                                    |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------- |
| Modal-System             | Radix Dialog                                | Bereits im Projekt für alle anderen Modals verwendet          |
| Display-Einstellungen    | `User.mealPlanSettings` JSON                | Nutzer-spezifisch (nicht pro Woche)                           |
| Aktive Mahlzeiten        | JSON in `MealPlan` (`activeMeals`)          | Wochenspezifisch — andere Woche kann andere Mahlzeiten haben  |
| Wochennavigation URL     | `[year]/[week]` → aus `startDate` berechnet | Direkt verlinkbar, kein neues DB-Feld                         |
| Push-Scheduling          | BullMQ Delayed Jobs                         | Nativ unterstützt, kein `scheduledAt` Feld auf `JobRun` nötig |
| Kalorie-Berechnung       | `Recipe.caloriesPerServing * servings`      | Vorhandenes Flat-Field, kein Nested-Object                    |
| Push Opt-in              | `PushSubscription` existiert = Opt-in       | Kein separates Preferences-Feld in Phase 1                    |
| Zeitzone `scheduledTime` | UTC in DB, Client sendet UTC                | Standard-Praxis, Formatierung im Client lokal                 |
| Share-Token              | `crypto.randomUUID()`                       | Kryptographisch sicher, unguessable                           |
| AI Strip Cache           | Redis (bestehend)                           | Selten geändert, teuer in Generierung                         |
