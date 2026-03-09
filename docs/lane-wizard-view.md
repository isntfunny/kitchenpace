# LaneWizard — Grid-Based Recipe Editor & Viewer

## Kernidee

LaneWizard ersetzt **alles**: FlowEditor (xyflow), RecipeFlow, SimpleTextView, MobileView. Eine einzige Komponente für Erstellen UND Anzeigen von Rezeptabläufen.

Das Prinzip: Ein **vertikales Grid** (wie eine Tabelle), das von oben nach unten fließt. Spalten = parallele Lanes. Zeilen = sequentielle Schritte. Der Benutzer baut sein Rezept mit drei simplen Operationen:

- **(+)** — Schritt hinzufügen (innerhalb einer Lane)
- **(Split)** — Lane aufteilen (Parallelarbeit starten)
- **(Merge)** — Lanes zusammenführen (Parallelarbeit beenden)

Das Grid **ist** der DAG. Kein Graphen-Denken nötig, keine Edges, keine Handles. Strukturell korrekt by design — Zyklen und disconnected Nodes sind unmöglich.

---

## Visuelles Modell

### Grundstruktur

```
┌─────────────────────────────┐
│        🚀 Start             │  ← immer Zeile 0, immer volle Breite
├─────────────────────────────┤
│      (+)  (↔ Split)         │  ← Aktionsleiste zwischen Zeilen
├──────────────┬──────────────┤
│  🔪 Zwiebeln │  🔪 Karotten │  ← Split erzeugte 2 Lanes
│  würfeln     │  würfeln     │
├──────────────┤              │  ← (+) in linker Lane → neue Zeile nur links
│  🧂 Würzen   │              │     Rechte Lane dehnt sich (leere Zelle)
│              │              │
├──────────────┴──────────────┤
│      (+)  (↔ Split) (⊕ Merge)│ ← Merge-Option erscheint bei >1 Lane
├─────────────────────────────┤
│  🔥 Anbraten                │  ← nach Merge wieder 1 Lane
├─────────────────────────────┤
│      (+)  (↔ Split)         │
├──────────────┬──────────────┤
│  🍳 Soße     │  🍳 Pasta    │  ← erneuter Split
│  köcheln     │  kochen      │
│  ⏱ 25:00     │  ⏱ 11:00     │
├──────────────┤              │  ← Soße hat mehr Zeilen als Pasta
│  🧂 Ab-      │              │     Pasta-Lane dehnt sich automatisch
│  schmecken   │              │
├──────────────┴──────────────┤
│        🍽 Anrichten          │  ← Merge
├─────────────────────────────┤
│        ✅ Servieren          │  ← immer letzte Zeile, immer volle Breite
└─────────────────────────────┘
```

### 3+ Lanes (komplexes Beispiel)

```
┌─────────────────────────────────────────┐
│              🚀 Start                    │
├─────────────┬─────────────┬─────────────┤
│  🔪 Gemüse  │  🍳 Brühe   │  🫕 Ofen    │  ← 3 Lanes nach Split
│  schneiden  │  aufsetzen  │  vorheizen  │
├─────────────┤             │             │
│  🧂 Würzen  │             │             │  ← nur Lane 1 hat extra Zeile
│             │             │             │     Lane 2+3 dehnen sich
├─────────────┴─────────────┤             │
│  🔥 Gemüse in Brühe       │             │  ← Partial Merge: Lane 1+2
│  geben                    │             │     Lane 3 läuft weiter
├────────────────────────────┴─────────────┤
│              🍽 Anrichten                 │  ← finaler Merge aller Lanes
└──────────────────────────────────────────┘
```

---

## Die drei Operationen

### (+) Schritt hinzufügen

- Erscheint am **unteren Rand jeder einzelnen Lane**
- Jede Lane hat ihren eigenen (+) Button — unabhängig von Geschwister-Lanes
- Klick öffnet den **Step-Type-Picker** (gleiche Icons/Farben wie bisher: schneiden, kochen, braten, backen, mixen, warten, würzen, anrichten)
- Erzeugt eine neue Zeile **nur in dieser Lane**
- Geschwister-Lanes dehnen sich automatisch (leere Zelle, kein Inhalt)

### (↔ Split) Lane aufteilen

- Erscheint in der **Aktionsleiste zwischen Zeilen** (nur bei hover/tap)
- Erzeugt eine neue Zeile mit N+1 Spalten
- Jede neue Spalte zeigt eine **leere Zelle** mit Step-Type-Icons zum Anklicken
- Split ist nur möglich, wenn die aktuelle Zeile eine einzige Lane hat ODER am Ende aller aktuellen Lanes

### (⊕ Merge) Lanes zusammenführen

- Erscheint nur wenn **>1 Lane** aktiv ist
- Merge führt immer **mindestens 2 Lanes** zusammen, kann aber auch **alle** mergen
- **2 Lanes**: Klick merged sofort beide zu 1 Lane (kein Auswahl-Dialog nötig)
- **3+ Lanes**: Klick zeigt eine **Checkbox-Overlay** über den Lanes — Benutzer wählt mindestens 2 Lanes aus. Kann alle auswählen für vollständigen Merge. Nicht ausgewählte Lanes laufen unverändert weiter.
- **Lanes werden beim Merge automatisch umsortiert.** Wenn der Benutzer nicht-benachbarte Lanes auswählt (z.B. A+C bei `[A] [B] [C]`), ordnet das Grid die Lanes automatisch so um, dass die ausgewählten Lanes nebeneinander liegen, bevor der Merge ausgeführt wird. Kein manuelles Drag nötig — das System macht das Richtige.
- **Merge erzeugt immer einen neuen Schritt (Node).** Der Benutzer muss beschreiben, was beim Zusammenführen passiert — z.B. "Pasta mit Soße vermengen" oder "Alles in die Auflaufform geben". Der Step-Type-Picker öffnet sich direkt nach dem Merge. Typische Typen für Merge-Schritte: `anrichten`, `mixen`, `kochen`, aber jeder Typ ist erlaubt.
- Nach Merge: die gemergte Zeile enthält den neuen Schritt über die zusammengeführten Lanes hinweg

### Aktionsleiste

**Per Lane:** Jede Lane hat ihren eigenen (+) am unteren Rand.

**Zwischen Segmenten** (volle Breite, zwischen Zeilen):
```
Einzelne Lane:     ──── (↔ Split) ────
Mehrere Lanes:     ──── (↔ Split) ──── (⊕ Merge) ────
```

- Segment-Aktionen erscheinen **am Ende des aktuellen Segments** im Edit-Modus
- Im View-Modus (Kochen) sind alle Aktionsleisten unsichtbar
- (↔) splittet die aktuelle Lane-Struktur in mehr Lanes
- (⊕) merged ausgewählte Lanes zusammen

---

## Leere Zellen (Lane-Stretching)

Wenn eine Lane mehr Zeilen hat als ihre Geschwister, dehnen sich die kürzeren Lanes automatisch:

```
┌──────────────┬──────────────┐
│  🍳 Soße     │  🍳 Pasta    │  ← Zeile 1: beide gefüllt
│  köcheln     │  kochen      │
│  ⏱ 25:00     │  ⏱ 11:00     │
├──────────────┤              │
│  🧂 Ab-      │              │  ← Zeile 2: nur links gefüllt
│  schmecken   │   (leer)     │     rechts = leere Zelle, gleiche Höhe
├──────────────┤              │
│  🌿 Basilikum│              │  ← Zeile 3: nur links gefüllt
│  einrühren   │   (leer)     │
├──────────────┴──────────────┤
```

**Leere Zellen** im Edit-Modus:
- Zeigen Step-Type-Icons (blasse Silhouetten) zum Anklicken
- Oder bleiben leer mit gestricheltem Rand

**Leere Zellen** im View-Modus:
- Unsichtbar (kein Rand, kein Hintergrund)
- Lane-Breite wird an die gefüllten Zellen verteilt

---

## Zellen-Inhalt (identisch zu bisherigen Nodes)

Jede gefüllte Zelle hat die **gleichen Funktionen** wie die bisherigen xyflow-Nodes:

### Anzeige
- **Step-Type-Farbe** als Hintergrund (gleiche Farben wie stepConfig.ts)
- **Icon** + **Typ-Label** (z.B. 🔥 Braten)
- **Titel** (fett, z.B. "Zwiebeln anbraten")
- **Beschreibung** mit **@Zutaten-Mentions** als farbige Chips
- **Dauer-Badge** (z.B. "8 Min.")
- **Foto-Thumbnail** (optional, aus S3)
- **Zutaten-Chips** unterhalb der Beschreibung

### Timer (View-Modus)
- Timer-Fortschritt füllt die **Hintergrundfarbe der Zelle von links nach rechts**
- Start/Pause/Reset-Buttons innerhalb der Zelle
- Zeitanzeige: `MM:SS`
- Bei Timer-Ende: "Fertig!"-Button erscheint

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓ 🔥 Braten ▓▓▓▓▓│     │▓▓ 🔥 Braten ▓▓▓▓▓│     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▓▓▓▓▓ 3:24 ▓▓▓▓▓▓│     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▓▓▓ ✅ Fertig! ▓▓▓│
│                  │     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│  [▶ Start]       │     │                  │     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│                  │     │  [⏸] [↺]         │     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└──────────────────┘     └──────────────────┘     └──────────────────┘
     idle                    60% done                  100% done
```

### Erledigt-State (View-Modus)
- Zelle wird gedimmt (opacity 0.55)
- Titel durchgestrichen
- Check-Circle oben rechts

### Edit-Modus (Zelle bearbeiten)
- Klick auf Zelle → Inline-Edit-Panel expandiert (oder Modal)
- Felder: Typ-Wechsel, Titel, Dauer, Beschreibung (@mentions), Foto-Upload
- Gleiche Inputs wie bisheriges NodeEditPanel

---

## Datenmodell

### `LaneStep` (Runtime)

```typescript
interface LaneStep {
    id: string;
    type: StepType;          // 'start' | 'schneiden' | 'kochen' | ... | 'servieren'
    label: string;
    description: string;     // Plaintext oder @[Name](id) Mentions
    duration?: number;       // Minuten
    photoKey?: string;       // S3-Key
    photoUrl?: string;
    ingredientIds?: string[];
    continuation?: boolean;  // Runtime-only: visueller Filler nach Partial-Merge, nie gespeichert
}
```

### `LaneSegment`

```typescript
interface LaneSegment {
    id: string;
    lanes: LaneStep[][];     // lanes[laneIndex][stepIndex]
    columnSpans: number[];   // Breite jeder Lane in fr-Einheiten
                             // Summe = effektive Spaltenanzahl
                             // z.B. [3] = volle Breite, [2,1] = 2/3+1/3, [1,1,1] = drei gleich
                             // lanes.length === columnSpans.length immer
}
```

### `LaneGrid` (gesamtes Rezept)

```typescript
interface LaneGrid {
    segments: LaneSegment[];   // von oben nach unten; Split/Merge erzeugt neues Segment
}
```

### Spalten-Vererbung (`columnSpans`)

Jedes Segment erbt seinen Spalten-Kontext vom Vorgänger. Beispiel:

```
seg-start:    columnSpans: [3]      → 1 Lane, volle 3-Spalten-Breite
seg-parallel: columnSpans: [1,1,1]  → 3 gleiche Lanes
seg-merge:    columnSpans: [3]      → wieder volle Breite
seg-2lanes:   columnSpans: [2,1]    → 2/3 + 1/3 (erbt 3-Spalten-Kontext)
```

Beim Hinzufügen einer Lane zu einem Segment mit `columnSpans: [3]` entsteht `[2,1]` (nicht `[1,1]`), weil der 3-Spalten-Kontext berücksichtigt wird.

### DB-Speicherung

Prisma `Recipe` Modell — ein einziges JSON-Feld:
```prisma
model Recipe {
  // ... bestehende Felder ...
  laneGrid    Json?      // LaneGridStored als JSON — ersetzt flowNodes + flowEdges
}
```

`flowNodes` und `flowEdges` werden vollständig entfernt. Keine Datenmigration nötig.

### Gespeichertes Format (`LaneGridStored`)

Identisch zur Runtime-Struktur, aber `continuation`-Steps werden **nie gespeichert** — sie sind abgeleiteter Zustand.

```typescript
type LaneStepStored    = Omit<LaneStep, 'continuation'>;
type LaneSegmentStored = { id: string; lanes: LaneStepStored[][]; columnSpans: number[] };
type LaneGridStored    = { segments: LaneSegmentStored[] };
```

Vollständiges Zod-Schema + OpenAI Response Format: `src/lib/importer/lane-grid-ai-schema.ts`

---

## Horizontaler Overflow & Mobile-Navigation

Wenn Lanes breiter als der Bildschirm sind (typisch: >2 Lanes auf Mobile, >4 auf Desktop):

### Scroll-Verhalten
- Grid wird horizontal scrollbar mit **Scroll-Snapping** an Lane-Grenzen (`scroll-snap-type: x mandatory`)
- Touch: Swipe horizontal zum Scrollen zwischen Lanes
- Desktop: Scroll-Pfeile links/rechts

### Lane-Indicator (Minimap für parallele Schritte)

Über dem Segment erscheint eine **Lane-Leiste** — zeigt alle parallelen Lanes als benannte Tabs:

```
┌─────────────────────────────────────────────┐
│  [🍳 Soße köcheln]  [🍳 Pasta kochen]  ←→  │  ← Lane-Tabs mit Schritt-Name + Icon
├─────────────────────────────────────────────┤
│                                             │
│  Aktuell sichtbare Lane                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Zwei Modi: Edit & View

### Edit-Modus (Rezept erstellen/bearbeiten)

- Aktionsleisten zwischen Zeilen sichtbar: (+), (↔ Split), (⊕ Merge)
- Leere Zellen zeigen Step-Type-Icons zum Anklicken
- Zellen klickbar → öffnet Inline-Edit
- Start-Zelle (oben) und Servieren-Zelle (unten) immer vorhanden, nicht löschbar
- Delete-Button (×) auf jeder Zelle bei Hover
- Add-Lane-Buttons (+) erscheinen links/rechts bei Hover auf ein Segment

### View-Modus (Rezept kochen)

- Keine Aktionsleisten, keine Edit-Buttons
- Timer-Controls in Zellen mit Dauer
- Done-Checkboxes auf jeder Zelle
- Fortschrittsanzeige: erledigte Zellen zählen gegen Gesamtanzahl
- Leere Zellen unsichtbar
- Timer füllt Hintergrund von links nach rechts

---

## Komponenten-Architektur (aktuell implementiert)

```
src/components/lane-wizard/
├── index.ts                ← Barrel exports
├── types.ts                ← LaneStep, LaneSegment, LaneGrid, LaneAction, LaneGridStored, …
├── gridReducer.ts          ← Reducer + column helpers (distribute, scaleSpans, propagate,
│                              normalizeLaneGrid, serializeLaneGrid, deserializeLaneGrid)
├── useTimers.ts            ← Timer-Intervall-Management (start, pause, reset)
├── LaneWizard.tsx          ← Hauptkomponente: useReducer + Layout + Segment-Loop
├── StepCard.tsx            ← Zellen-Rendering (edit + view, Timer, DoneToggle, continuation)
├── SegmentDivider.tsx      ← Hover-Zone zwischen Segmenten (+ Split + Merge)
├── StepTypePicker.tsx      ← Step-Typ-Auswahl (inline + floating)
└── MergeOverlay.tsx        ← Checkbox-Dialog für Partial-Merge (3+ Lanes)
```

**Noch nicht implementiert:**
- `StepEditPanel` — Inline-Edit für Label, Beschreibung, Dauer, Foto-Upload
- `onChange` Callback (aktuell nur interner State)
- @mentions in Beschreibungen
- Mobile Lane-Tabs / Overflow-Scroll

---

## Props (Ziel-Interface)

```typescript
interface LaneWizardProps {
    initialGrid: LaneGrid;
    ingredients?: AddedIngredient[];    // für @mentions

    mode?: 'edit' | 'view';

    // Edit
    onChange?: (grid: LaneGrid) => void;

    // View-State (extern steuerbar, z.B. für Server-Side-Restore)
    completed?: Set<string>;
    timers?: Map<string, TimerState>;
    onToggleComplete?: (stepId: string) => void;
    onTimerAction?: (stepId: string, action: 'start' | 'pause' | 'reset') => void;
}
```

---

## Farbschema (Zellen-States)

```
Ausstehend:     bg: white              border: rgba(224,123,83,0.2)    text: normal
Aktiv/Timer:    bg: step-color fill →  border: #f39c12                 text: normal
Erledigt:       bg: rgba(0,184,148,0.06)  border: rgba(0,184,148,0.3) text: line-through, opacity 0.55
Leer (edit):    bg: rgba(0,0,0,0.02)   border: 1px dashed rgba(0,0,0,0.1)
Leer (view):    unsichtbar
Continuation:   bg: step-color (flach) flexGrow: 1 — visueller Filler, kein Inhalt
```

---

## Was verschwindet

| Komponente | Ersatz |
|---|---|
| `FlowEditor.tsx` (xyflow) | LaneWizard edit-Modus |
| `RecipeFlow.tsx` (custom viewer) | LaneWizard view-Modus |
| `SimpleTextView` | LaneWizard mit 1 Lane |
| `MobileView` | LaneWizard ist touch-first |
| `@xyflow/react` | Dependency entfällt |
| `dagre` | Kein Layout-Algorithmus nötig |
| `editor/RecipeNode.tsx` | `StepCard.tsx` |
| `editor/NodeEditPanel.tsx` | `StepEditPanel.tsx` (noch zu bauen) |
| `editor/NodePalette.tsx` | `StepTypePicker.tsx` |
| `editor/FlowEditorContext.ts` | Nicht mehr nötig |
| `editor/useFlowAutoLayout.ts` | Grid braucht kein Auto-Layout |
| `recipe.flowNodes` + `recipe.flowEdges` | `recipe.laneGrid` (ein JSON-Feld) |

---

## Implementierungs-Reihenfolge

### Phase 1: Mock ✅
- `/lane-wizard-mock/page.tsx` mit hardcodierten Daten
- LaneWizard Komponente mit Edit + View Modus
- Alle drei Operationen funktional: (+), Split, Merge
- Step-Type-Picker, Zellen-Styling, Timer
- Column-Inheritance-System (`columnSpans`, `propagate`, `scaleSpans`)
- Serialisierung: `serializeLaneGrid` / `deserializeLaneGrid`
- Zod-Schema + OpenAI Response Format: `lane-grid-ai-schema.ts`

### Phase 2: Echte Komponente
- `StepEditPanel` mit Titel, Beschreibung (@mentions), Dauer, Foto-Upload
- `onChange` Callback aus LaneWizard nach außen
- In `RecipeForm.tsx` einbinden (ersetzt FlowEditor)

### Phase 3: DB-Migration
- `laneGrid Json?` zu Prisma Schema hinzufügen, `flowNodes` + `flowEdges` entfernen
- `createActions.ts` / `updateActions.ts` anpassen (`serializeLaneGrid` / `deserializeLaneGrid`)
- Recipe Detail Page: LaneWizard im View-Modus

### Phase 4: Aufräumen
- xyflow + dagre Dependencies entfernen
- Alte Editor-Dateien löschen (FlowEditor, RecipeFlow, SimpleTextView, MobileView)
- `openai-recipe-schema.ts` → `lane-grid-ai-schema.ts` in AI-Importer einbinden
- GAMEPLAN.md aktualisieren

### Phase 5: Polish
- Mobile Lane-Tabs + horizontales Scroll-Snapping
- Drag & Drop zum Umordnen von Schritten
- Keyboard shortcuts (Delete, Escape)
- Animationen (Segment-Übergänge)

---

## Offene Design-Entscheidungen

1. **Leere Zellen im Edit-Modus**: Step-Type-Icons direkt anzeigen oder erst bei Klick/Hover? → aktuell: direkt anzeigen (inline StepTypePicker)
2. **Zellen-Edit**: Inline-Expand (Akkordeon unter der Zelle) oder Side-Panel? → offen
3. **Maximum Lanes**: Hard-Limit bei 5? Oder unbegrenzt mit Scroll?
4. **Auto-Advance im View-Modus**: Wenn alle Zellen einer Zeile erledigt → automatisch nächste Zeile highlighten?
5. **Merge-Step-Typ**: Aktuell immer `anrichten` vorausgewählt — sollte der Step-Type-Picker nach dem Merge öffnen?
