# LaneWizard — Multi-Column Recipe Step View

## Kernidee

Statt einem Schritt auf einmal (MobileView) oder einer flachen Liste (SimpleTextView) zeigt **LaneWizard** eine **"Phase"** auf einmal — also alle Schritte, die laut Rezeptgraph gleichzeitig passieren können (= dieselbe Dagre-Spalte / dasselbe Rank).

Ein Wisch nach rechts → nächste Phase. Das ist kognitiv das Natürlichste beim Kochen:
*"Was mache ich jetzt alles, bevor ich weiterkomme?"*

---

## Visuelle Struktur (eine Phase / ein Screen)

```
┌─────────────────────────────────────────────────────────┐
│  Phase 3 von 7                          ● ● ● ◉ ● ● ●  │  ← Phase-Progress-Dots (swipeable)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🔥 Anbraten      │  │ 🥣 Marinade       │  ← Lanes  │
│  │──────────────────│  │──────────────────│            │
│  │ Zwiebeln bei     │  │ Olivenöl, Knob-  │            │
│  │ mittl. Hitze...  │  │ lauch, Zitrone   │            │
│  │                  │  │ vermengen        │            │
│  │ ⏱ 5:00           │  │                  │            │
│  │ [▶ Start] [✓]    │  │         [✓]      │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🌡 Ofen vorheizen                                 │  ← Einzelne Lane (volle Breite)
│  │──────────────────────────────────────────────────│  │
│  │ Auf 180 °C Ober-/Unterhitze vorheizen            │  │
│  │                          [✓ Erledigt]            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ← Zurück                              Weiter →        │  ← Sticky Nav
└─────────────────────────────────────────────────────────┘
```

**Regeln:**
- 1 Lane in der Phase → volle Breite (wie SimpleTextView)
- 2 Lanes → 50/50 nebeneinander
- 3+ Lanes → 33/33/33, oder bei engen Screens: horizontal scrollbar innerhalb der Phase
- Abgeschlossene Schritte: Karte wird kleiner/gedimmt, aber bleibt sichtbar (kein Wegflipppen)

---

## Datenmodell — was wir schon haben

`buildTopology()` liefert exakt das, was wir brauchen:

```ts
columnGroups: FlowNodeSerialized[][]
// columnGroups[i] = alle Knoten in Phase i (sortiert nach dagreY = Lane-Position)
```

Der **dagreY-Wert** bestimmt, welche Lane ein Knoten in einer Phase gehört:
- Gleicher dagreY → gleiche Zeile (sind jedoch im echten Graphen eher selten exakt gleich)
- Wir können dagreY zur Sortierung nutzen; verschiedene Y-Werte in derselben Spalte = parallele Lanes

Ein `laneGroups`-Helper (innerhalb von LaneWizard) gruppiert die Knoten einer Phase nach ihrer Spur:

```ts
// Innerhalb einer Phase: Knoten per dagreY-Cluster zu Lanes gruppieren
function toLaneRows(
  nodes: FlowNodeSerialized[],
  dagreY: Map<string, number>
): FlowNodeSerialized[][] {
  // Knoten sind bereits nach dagreY sortiert (buildTopology macht das)
  // Einfach als einzelne Lanes behandeln (jeder Knoten eine eigene Lane),
  // da dagre Knoten auf diskrete Y-Positionen legt.
  return nodes.map(n => [n]);
}
```

Da dagre jeden Knoten auf eine eindeutige Y-Position legt, hat jeder Knoten in einer Phase seine eigene "Zeile" (Lane). Mehrere Knoten in derselben Phase = Parallelarbeit → werden nebeneinander dargestellt.

---

## Komponenten-Architektur

```
LaneWizardView.tsx          ← neue Hauptkomponente (Datei: src/components/flow/viewer/LaneWizardView.tsx)
├── LaneWizardPhaseHeader   ← Phase-Nummer + Progress-Dots
├── LaneCard                ← eine Karte für einen Schritt (wiederverwendet StepCard-Logik)
│   ├── Timer-Controls      ← aus MobileView extrahiert oder inline
│   └── Done-Button         ← dispatch({ type: 'toggle' })
└── LaneWizardNav           ← Zurück/Weiter + Swipe-Handler
```

**Kein neuer State-Manager nötig** — LaneWizardView bekommt dieselben Props wie SimpleTextView:
```ts
{
  columnGroups: FlowNodeSerialized[][];
  dagreY: Map<string, number>;
  completed: Set<string>;
  timers: Map<string, TimerState>;
  dispatch: Dispatch<ViewerAction>;
  ingredients?: RecipeStepsViewerProps['ingredients'];
}
```

---

## Swipe-Logik

Sehr simpel — nur horizontales Swipen zwischen Phasen, kein vertikales Navigieren mehr nötig (weil alle Lanes einer Phase gleichzeitig sichtbar sind):

```ts
const [phaseIndex, setPhaseIndex] = useState(0);

// Touch-Handler (wie in MobileView, vereinfacht):
const swipeThreshold = 50;
let touchStartX = 0;

onTouchStart: (e) => { touchStartX = e.touches[0].clientX; }
onTouchEnd: (e) => {
  const dx = touchStartX - e.changedTouches[0].clientX;
  if (dx > swipeThreshold && phaseIndex < columnGroups.length - 1) setPhaseIndex(p => p + 1);
  if (dx < -swipeThreshold && phaseIndex > 0) setPhaseIndex(p => p - 1);
}
```

---

## Phasen-Fortschritt (intelligente Progress-Dots)

Eine Phase gilt als **abgeschlossen**, wenn alle Schritte in `columnGroups[i]` in `completed` sind.

```ts
const phaseStatus = columnGroups.map(group =>
  group.every(n => n.type === 'start' || completed.has(n.id))
    ? 'done'
    : group.some(n => completed.has(n.id))
      ? 'partial'
      : 'pending'
);
```

Progress-Dots: ✅ grün / 🟧 halb (orange Ring) / ⬜ leer.

---

## Wo einbinden

`RecipeStepsViewer.tsx` hat bereits einen `viewMode`-Schalter (`'simple' | 'mobile'`). Wir fügen `'lane'` hinzu:

```tsx
// In RecipeStepsViewer.tsx
{viewMode === 'lane' && (
  <LaneWizardView
    columnGroups={columnGroups}
    dagreY={dagreY}
    completed={state.completed}
    timers={state.timers}
    dispatch={dispatch}
    ingredients={ingredients}
  />
)}
```

Ein Button-Toggle im Header der `RecipeStepsViewer`-Komponente (neben dem existierenden Graph/Liste-Schalter) schaltet zwischen den Modi um.

---

## Mock-Implementierung (Phase 1 — nur UI)

Die erste Version ist **nur ein Mock** — kein echter State, hardcodierte Daten:

```
src/components/flow/viewer/LaneWizardView.tsx   ← neue Datei
src/app/lane-wizard-mock/page.tsx               ← Testpage mit Mock-Daten
```

**Mock-Datensatz** (Beispielrezept "Pasta Bolognese"):
- Phase 1: [Wasser aufsetzen]
- Phase 2: [Zwiebeln schneiden], [Knoblauch pressen], [Karotten würfeln]
- Phase 3: [Anbraten]
- Phase 4: [Soße köcheln], [Pasta kochen]
- Phase 5: [Servieren]

---

## Visual Design-Prinzipien

| Prinzip | Umsetzung |
|---|---|
| Klare Phasen-Trennung | Große Phase-Nummer oben, schwache Trennlinie |
| Parallelarbeit sichtbar | Nebeneinander-Karten, gleiche Höhe innerhalb Phase |
| Fortschritt greifbar | Karte wird bei ✓ grün+durchgestrichen, schrumpft leicht |
| Timer sofort erkennbar | Großes Zeitdisplay oben in der Karte, Fortschrittsbalken |
| Kein scrollen nötig | Max 3-4 Schritte pro Phase typischerweise; bei mehr: Karten verkleinern |
| Light Mode | Heller Hintergrund (im Gegensatz zur dunklen MobileView) |
| Touch-First | Swipe between phases, tap targets ≥ 44px |

---

## Farbschema (Karten-States)

```
Ausstehend:     bg: white          border: rgba(224,123,83,0.2)   text: normal
Aktiv/Timer:    bg: rgba(243,156,18,0.06)  border: #f39c12       text: normal
Erledigt:       bg: rgba(0,184,148,0.06)   border: rgba(0,184,148,0.3)  text: line-through, opacity 0.7
```

---

## Abgrenzung zu bestehenden Views

| Feature | SimpleTextView | MobileView | LaneWizardView |
|---|---|---|---|
| Alle Schritte sichtbar | ✅ | ❌ (1 auf einmal) | ✅ (pro Phase) |
| Parallelität erkennbar | ❌ (flache Liste) | ✅ (Branching-Hints) | ✅ (Nebeneinander-Karten) |
| Swipe-Navigation | ❌ | ✅ | ✅ |
| Ohne xyflow | ✅ | ✅ | ✅ |
| Optimal für Cast/TV | ❌ | ✅ | ✅ |
| Optimal für Desktop | ✅ | ❌ | ✅ |

---

## Implementierungs-Reihenfolge

1. **`/lane-wizard-mock/page.tsx`** — statische Mock-Page mit hardcodierten Daten (kein echter State, kein Dispatch). Nur Optik + Swipe.
2. **`LaneWizardView.tsx`** — echte Komponente mit Props + `dispatch` (viewerReducer).
3. **In `RecipeStepsViewer.tsx` einhängen** — als dritten `viewMode`.
4. **(Optional)** Als Cast-Receiver-View verwenden — großer TV-Bildschirm profitiert vom Nebeneinander-Layout.

---

## Offene Fragen / Entscheidungen

- **Kartenbreite bei vielen Lanes**: Ab 4+ Lanes in einer Phase → horizontal scroll innerhalb der Phase? Oder Karten compacten?
- **Start/Servieren-Knoten**: Wie beim SimpleTextView und MobileView — als Sonderfall darstellen (zentriert, volle Breite, anderes Styling)?
- **Nächste Phase auto-vorwärts**: Wenn alle Karten einer Phase ✓ sind → automatisch zur nächsten Phase wechseln? (Opt-in)
