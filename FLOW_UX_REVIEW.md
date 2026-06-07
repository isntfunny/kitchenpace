# Recipe-Flow Review: xyflow verbessern vs. Lane-Wizard — Entscheidung & Fahrplan

_Lead-Engineer-Review fuer KochTakt / kitchenpace, Stand 2026-06-07. Grundlage: vollstaendige Architektur- und UX-Analyse der vier Bereiche (read-only Desktop-Viewer, Mobile-Cooking-Mode, Lane-Wizard, Datenmodell)._

---

## 1. Kernbefund / TL;DR

**Verbessere xyflow — aber uebernimm das mentale Modell des Lane-Wizards (Spuren + Zeit) fuer Konsum und Mobile, ohne auf dessen Datenformat zu migrieren.** Das ist die eine entscheidende Empfehlung: Das xyflow-Datenmodell (`Recipe.flowNodes` / `Recipe.flowEdges`, `prisma/schema.prisma:339-340`) ist die einzige produktive Quelle der Wahrheit, vollstaendig verdrahtet ueber Editor, Importer, Viewer, Admin und Bulk-Actions — der Lane-Wizard hat dagegen **keine DB-Spalte, keine Migration und keinen DAG↔Lane-Konverter** (`src/app/lane-wizard-mock/page.tsx` ist der einzige Mount-Punkt, einzige Persistenz ist ein JSON-Datei-Download). Der einzelne wichtigste Grund: Das Problem ist **nicht das Datenmodell, sondern die Praesentations-/Navigationsschicht**. `buildTopology()` (`src/components/flow/viewer/viewerUtils.tsx:27`) berechnet bereits per dagre ein sauberes Layout mit Lese-Reihenfolge — der Desktop-Viewer wirft es weg und nutzt die rohen Editor-Koordinaten, und der Mobile-Viewer reduziert den DAG via `tgts[0]` auf einen willkuerlichen Pfad und versteckt ganze Branches. Beide Kernprobleme lassen sich mit vorhandenen Bausteinen reparieren, ohne ein zweites Datenformat in Produktion zu schleppen. Der Lane-Wizard ist ein wertvoller **Ideen-Prototyp (ca. 45-55% fertig)** — sein Zeit-/Spuren-Modell ist nachweislich das bessere Mental Model fuers Kochen, aber als Migrationsziel ist er heute zu unreif und zu teuer; seine Konzepte werden uebernommen, sein Code (noch) nicht.

---

## 2. Diagnose: warum sich der xyflow-Viewer "nicht gut" anfuehlt

Das Gefuehl ist berechtigt und hat **strukturelle, nicht kosmetische** Ursachen. Geordnet nach Schwere.

### Critical

**C1 — Desktop ignoriert die berechnete Lese-Reihenfolge und rendert rohe Editor-Koordinaten.**
`DesktopView` baut die ReactFlow-Nodes aus `n.position ?? {x:0,y:0}` (`src/components/flow/viewer/DesktopView.tsx:301-308`, bestaetigt: `position: n.position ?? { x: 0, y: 0 }`). `buildTopology()` laeuft dagre und liefert `columnGroups` + `dagreY` (`viewerUtils.tsx:27`), aber `RecipeStepsViewer` reicht davon nur `outgoing` an Desktop weiter — das Layout wird verworfen. **Warum es weh tut:** Der Kochende muss die intendierte Reihenfolge aus Pfeilen und Position rueckwaerts erschliessen. Es gibt keine Schrittnummern (anders als `SimpleTextView.tsx:135`, das `idx+1` rendert). Ab mehr als 3 Knoten weiss das Auge nicht, wo es anfangen soll — ein Rezept zu lesen fuehlt sich an wie ein Diagramm zu loesen.

**C2 (mobil) — Weiter/Zurueck folgen still nur der ersten Kante; ganze Parallel-Branches verschwinden.**
`goRight = tgts[0]`, `goLeft = srcs[0]` (`src/components/flow/viewer/useMobileNavigation.ts:147-161`), ohne Hinweis, dass weitere Ziele existieren. **Warum es weh tut:** Ein Nutzer kann sich mit den grossen Weiter-Buttons komplett durchs Rezept klicken und dabei die Sauce uebersehen, die parallel haette laufen sollen. `allStepsDone` verlangt aber, dass _jeder_ Knoten erledigt ist (`RecipeStepsViewer.tsx:269-274`) — also "fertig durchgeklickt, trotzdem nicht fertig", ohne Zeiger auf den verpassten Schritt. Der einzige zuverlaessige Weg zu uebersprungenen Branches ist die Minimap.

### High

**H1 (desktop) — Scroll-Falle.** `zoomOnScroll={false}` + `preventScrolling={false}` auf einer `calc(100vh-200px)` hohen, pannbaren Canvas (`DesktopView.tsx:448, 466-468`). Das Mausrad zoomt nicht und scrollt die Seite nicht zuverlaessig — der klassische "es kaempft gegen mich"-Moment.

**H2 (desktop) — Falsche Klick-Semantik.** Single-Click ruft `fitView` und zoomt die Kamera auf den Knoten (`DesktopView.tsx:315-320`, bestaetigt `fitView({ nodes: [{ id: rfNode.id }], padding: 0.8, duration: 300 })`); das gut gebaute `NodeDetailModal` haengt hinter einem nicht entdeckbaren Double-Click (`:323-329`), wobei `onOpenDetail` ohnehin gestubbt ist (`:290-298`). Der natuerlichste Klick fuehlt sich wie ein Fehlgriff an, die beste Komponente bleibt versteckt.

**H3 (desktop) — Ueberladene 220px-Karten.** Typ-Badge, Parallel-Badge, Timer, Titel, 3-Zeilen-Beschreibung, Foto, Zutatenliste, Timer-Controls und Erledigt-Button in einer 220px-Kachel (`StepCard.tsx:89, 225, 113-461`). Bei Fit-Zoom (<1.0) ist der Text unlesbar, die 26px-Timer-Buttons und der 11px-Erledigt-Pill sind frickelige Ziele. Die Karte will Anleitungsblatt _und_ Graph-Knoten sein und ist beides nicht.

**H4 (mobil) — "Branch x/N" vermischt zwei Konzepte.** Mal sind es Same-Column-Lanes (`totalBranches = currentGroup.length`), mal Cross-Column-"Parallel-Branches" (`1 + parallelBranches.length`) (`MobileView.tsx:200-245`, `useMobileNavigation.ts:142-145`). Dieselbe Wisch-Geste bewegt mal innerhalb einer Spalte, mal teleportiert sie in eine andere Spalte (`useMobileNavigation.ts:197-217`). Kein stabiles mentales Modell moeglich.

**H5 (mobil) — Branch-Logik per fragiler Heuristik.** `findForkAncestor` bricht bei jedem Knoten mit !=1 Eltern ab (`useMobileNavigation.ts:64-66`), `parallelBranches` waehlt den Knoten mit minimalem `|col-currentCol|` (`:114-125`). Bei Diamonds, verschachtelten Forks und geteilten Merges landet up/down auf einem unerwarteten Schritt. Der Code kommentiert sich selbst als "simplified" — genau das ist das gefuehlte "Struggle".

### Medium

- **M1 (desktop) — Keine globale Fortschrittsanzeige.** `allStepsDone` wird berechnet, treibt aber nur das End-Banner (`RecipeStepsViewer.tsx:269-274, 544`); kein "Schritt X von Y", keine Leiste. Ein langer Graph fuehlt sich richtungslos an.
- **M2 (mobil) — "Schritt {col+1}/{totalColumns}" zaehlt dagre-Spalten, nicht Schritte** (`BottomNavigation.tsx:55-57`). 8 Knoten in 5 Spalten zeigen "Schritt 1/5"; parallele Schritte teilen sich eine Nummer; `start`/`servieren` werden mitgezaehlt.
- **M3 (mobil) — Doppel-Interaktion pro Schritt.** Erledigt-Toggle bewegt nicht vorwaerts; man muss erst markieren _und_ dann Weiter druecken (`useMobileNavigation.ts`, `MobileView.tsx:363-397`).
- **M4 (desktop) — Edge-Geometrie pro Render.** `CurvedEdge` ruft `computeAvoidingPath` gegen _alle_ Node-Rects bei jedem Render jeder Kante (`DesktopView.tsx:61-79`); Edges werden bei jedem Timer-Tick neu gebaut (`:258-288, 434-436`). Resultat: wellige, kreuzende Kanten plus unnoetiger Rechenaufwand.
- **M5 (mobil) — Spaltensortierung nach `duration desc`** (`viewerUtils.tsx:77-86`) weicht von der Autoren-Reihenfolge und von der Minimap (die nach `dagreY` positioniert) ab. Der angetippte Punkt und die gewischte Lane koennen sich widersprechen.
- **M6 (desktop) — Fullscreen verliert die Toolbar.** `requestFullscreen` laeuft auf `containerRef` (`DesktopView.tsx:333-353`), die Text/Mobil/Cast/Reset-Pills liegen aber auf dem aeusseren Wrapper ausserhalb davon (`RecipeStepsViewer.tsx:397-524`). Vollbild = genau der Moment fuers Kochen, aber die Steuerung verschwindet und die Kamera re-fittet nicht.
- **M7 (desktop) — Parallel & Start unterklaert.** Start ist eine fast-weisse Karte (`#f0f4ff`, `stepConfig.ts:45-46`), Parallel nur ein winziges "⚡ Parallel"-Badge (`StepCard.tsx:139-156`) ohne "gleichzeitig zubereiten"-Rahmung. Das Headline-Feature wird kaum kommuniziert.

### Low

- **L1 — Produktions-`console.log` bei Double-Click** (`DesktopView.tsx:325`, bestaetigt `console.log('[DV] double-click on', rfNode.id)`).
- **L2 — Hand-Gesten-Steuerung** (MediaPipe, `gestureNavigation`-Flag) kann nur swipeLeft/Right → next/prev (`MobileView.tsx:119-131`, `useHandLandmarkerTest.ts:89-95`), also nur die irrefuehrende lineare Achse — nutzlos bei genau den Branch-Rezepten, die schwierig sind, dazu Kamera/Privacy-Last im Kochflow.
- **L3 — PDF/Cast prominent, Kern-Affordances fehlen.** Keine `<Controls/>`, keine Zoom-Buttons; nach einem Pinch in die Ecke gibt es keinen Recovery-Pfad.

---

## 3. Der Kern-Konflikt: DAG vs. Mobile

Das Herz des Problems ist nicht UI-Politur, sondern eine **Modell-Inkompatibilitaet**:

Ein **freier DAG mit Parallel-Branches hat keine einzelne lineare prev/next-Ordnung.** Auf dem Desktop ist das in Ordnung — ein Graph _ist_ ein 2D-Medium und kann Parallelitaet raeumlich zeigen. Auf dem Handy aber gibt es nur eine Achse (vertikal/horizontal swipen), und der aktuelle Code presst den 2D-DAG gewaltsam auf diese eine Achse:

1. `buildTopology` flacht den DAG zu `columnGroups` ab: Aussenachse = Spalten (Weiter/Zurueck), Innenachse = Lanes (Up/Down) (`viewerUtils.tsx:27-89`).
2. Weiter/Zurueck folgen dann nur `tgts[0]`/`srcs[0]` (`useMobileNavigation.ts:147-161`) — die lineare Achse ist eine **Luege**, weil sie nur einen von mehreren Pfaden zeigt.
3. Die fehlenden Faelle werden mit einem verwirrenden "Branch x/N"-Up/Down-Mechanismus nachgereicht, dessen Bedeutung kontextabhaengig springt (H4/H5).

Das ist der strukturelle Grund, warum "die Mobile-Ansicht sich schwer tut, etwas Schoenes aus xyflow zu bauen". Es ist **kein Rendering-Bug, sondern eine Linearisierung eines fundamental nicht-linearen Modells.**

Genau hier hat der Lane-Wizard recht: Sein Modell (Segmente → parallele Lanes → geordnete Steps mit `columnSpans`, `lane-wizard/types.ts`) macht Parallelitaet und Reihenfolge _strukturell_ — invalide/getrennte Graphen sind per Konstruktion unmoeglich, und das Zeit-/Gantt-Bild (`TimeRuler.tsx`) zeigt "waehrend X koechelt, mach Y", was ein Knotengraph nicht kann. **Die Schluesselerkenntnis aus der Datenmodell-Analyse:** Die richtige Information (Topologie, Rang/Spalte, Dauer) liegt bereits vor — sie wird nur in der Navigationsschicht falsch verwendet. Man muss das Lane-/Zeit-Modell **nicht persistieren, um es zu nutzen**: Man kann es in-memory aus `flowNodes`/`flowEdges` ableiten. Das entkoppelt das ueberlegene Mental Model vom teuren Datenformat-Wechsel.

---

## 4. Option A — xyflow exzellent machen

Alle Verbesserungen ohne Aufgabe von xyflow, ohne DB-Migration. Effort: S=Stunden/Tag, M=Tage, L=Woche+. Impact relativ zum gefuehlten Problem.

### Quick Wins (Tage) — beseitigen die schlimmste Reibung

| #               | Massnahme                                                                                                                                 | Effort | Impact   | Dateien                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ---------------------------------------------------------- |
| QW1             | `console.log` bei Double-Click loeschen                                                                                                   | S      | low      | `DesktopView.tsx:325`                                      |
| QW2             | Single-Click oeffnet `NodeDetailModal` statt Kamera-Zoom; Stub `onOpenDetail` entfernen, Zoom-to-Node auf Power-Geste/Control verschieben | S      | **high** | `DesktopView.tsx:290-299, 315-329`, `StepCard.tsx`         |
| QW3             | xyflow `<Controls/>` (Zoom +/-/Fit) in `<ReactFlow>` einbauen — Recovery-Pfad nach Pinch                                                  | S      | **high** | `DesktopView.tsx:454-478`                                  |
| QW4             | Scroll-Falle beheben: `panOnScroll` (Wheel/2-Finger pannt, Zoom via +/- und Strg+Wheel) statt `zoomOnScroll=false`                        | S      | **high** | `DesktopView.tsx:466-468`                                  |
| QW5             | Fortschritts-Chip "Schritt X von Y" + duenne Leiste in die Toolbar (`completed.size` vs `nonTrivialNodes.length`)                         | S      | medium   | `RecipeStepsViewer.tsx:397-524, 269-274`                   |
| QW6             | Schrittnummern auf Desktop-Karten (gleiche Nummerierung wie `SimpleTextView`)                                                             | S      | **high** | `RecipeStepsViewer.tsx`, `DesktopView.tsx`, `StepCard.tsx` |
| **QW7 (mobil)** | Echter Schrittzaehler: `done/total` non-special statt dagre-Spalten                                                                       | S      | **high** | `BottomNavigation.tsx:55-57`                               |
| **QW8 (mobil)** | "Erledigt" + "Weiter" zu **einer** Vorwaerts-Aktion verschmelzen (halbiert Interaktion/Schritt)                                           | S      | **high** | `MobileView.tsx:363-397`                                   |
| **QW9 (mobil)** | Weiter fork-aware: bei >1 ausgehender Kante explizite "Als Naechstes:"-Auswahl statt stillem `tgts[0]`                                    | M      | **high** | `useMobileNavigation.ts:147-153`                           |

### Groessere Umbauten (Wochen) — adressieren die Wurzel

**Desktop:**

- **A-D1 — dagre-Layout statt Editor-Koordinaten (M, high).** Das wichtigste Stueck. `buildTopology` zusaetzlich ein `layout: Map<string,{x,y}>` zurueckgeben lassen (X+Y aus den bereits berechneten dagre-Positionen, skaliert auf echtes Karten-Pitch, z.B. `col*300`, `lane*240`), durch `RecipeStepsViewer` nach `DesktopView` reichen, dort `layout.get(n.id) ?? n.position` nutzen. Sauberer Links-rechts-Lesefluss unabhaengig vom Editor-Chaos; die vorhandenen Kurven-Kanten verhalten sich auf einem Raster deutlich besser. _Risiko:_ dagre nutzt 24x24-Dummy-Nodes (`viewerUtils.tsx:51`) — Abstaende muessen auf echte Kartenbreite skaliert werden, sonst ueberlappen Karten. Fallback auf `n.position` behalten. (`viewerUtils.tsx`, `RecipeStepsViewer.tsx`, `DesktopView.tsx`)
- **A-D2 — StepCard fuer Graph-Kontext entschlacken (M, high).** Variante `graph`/`compact` (Plumbing existiert teils, `StepCard.tsx:50/207`): nur Ordinalnummer + Typ-Badge + Titel + Timer-Chip + ein Erledigt-Button + optional Thumbnail. Beschreibung/Zutaten wandern ins Modal (jetzt per Single-Click erreichbar). Lesbar bei Fit-Zoom. (`StepCard.tsx`, `DesktopView.tsx`)
- **A-D3 — Robustes fitView (M, medium).** Die handgerollte Hoehen-only-Mathematik (`zoomY`, `DesktopView.tsx:368-406`) durch `fitView({padding:0.15, maxZoom:1.2})` ersetzen — bei erstem Dimensions-Event, bei `ResizeObserver` und bei `fullscreenchange`. Behebt horizontalen Overflow breiter Flows und schlechtes Fullscreen-Framing. (`DesktopView.tsx`)
- **A-D4 — Fullscreen mit Toolbar + Refit (M, medium).** Ein Wrapper inklusive Toolbar fullscreenen statt nur `containerRef`. (`DesktopView.tsx`, `RecipeStepsViewer.tsx`) _Risiko:_ Native Fullscreen kapselt nur ein Element — z-index/Portal-Annahmen (Overlays z-index 300, Modal 1000) gegenpruefen.
- **A-D5 — Parallel-Gruppen first-class + Start zaehmen (M, medium).** Spalte mit >1 Knoten als dezentes Band mit Caption "Gleichzeitig / Parallel zubereiten" rahmen (Ordinals als 3a/3b). Start entweder als klares "Los geht's"-Pill oder im Read-View weglassen (in `SimpleTextView.tsx:28` ist es ohnehin gefiltert). (`DesktopView.tsx`, `StepCard.tsx`, `stepConfig.ts`)
- **A-D6 — Edge-Geometrie memoisieren (M, medium).** Geometrie (haengt nur an Positionen, nach dagre stabil) einmal pro Layout berechnen, beim Timer-Tick nur Style (stroke/animated) aktualisieren. Optional `smoothstep`-Orthogonalkanten fuer Branch-Rezepte. (`DesktopView.tsx`, `edgeAvoidance.ts`)
- **A-D7 — "Folge-Modus" (L, high).** Optionaler Cooking-Modus auf dem Graphen: `currentStepId` tracken, aktiven Schritt hervorheben (`active`-Prop existiert, `DesktopView.tsx:242-246`), `fitView` auf ihn zentrieren, Zurueck/Weiter + Pfeiltasten gehen `columnGroups`-Lesereihenfolge, Erledigt advanct automatisch und startet den naechsten Timer. **Hinter Flipt-Flag** (`gestureNavigation` zeigt das Muster in `src/lib/flags/definitions.ts`) fuer A/B. (`DesktopView.tsx`, `RecipeStepsViewer.tsx`, `StepCard.tsx`, `src/lib/flags`)

**Mobile (der Haupt-Schmerz) — Neubau der Navigationsschicht, kein neues Datenformat:**

- **A-M1 — `buildCookSchedule(nodes, edges)` (M, high).** Eine reine Funktion neben `buildTopology`. Sie konsumiert die vorhandene Topologie und emittiert einen **CookSchedule**: topologisch geordnete Gruppen (Kahn-Sort + Rang = `columnGroups`-Index), jede Gruppe = die Schritte, die ein Koch gleichzeitig startet; lange Passiv-Schritte als `isBackground` markiert. **Das ist das Lane-/Zeit-Modell ueber dem DAG ausgedrueckt — ohne neue DB-Spalte, ohne fragile DAG→Lane-Inferenz.** Ersetzt die gesamte Branch-Heuristik (`useMobileNavigation.ts:46-135`). _Risiko:_ `isBackground` rein advisory/visuell halten, nie Completion gaten. (`viewerUtils.tsx`, `viewerTypes.ts`)
- **A-M2 — `CookModeView` (L, high).** Ersetzt das Column/Row+BranchHint-Modell. Aufbau: Header mit echtem Fortschritt; "Laeuft im Hintergrund"-Tray mit Live-Restzeit (das "waehrend X koechelt, mach Y"-Affordance); aktuelle Gruppe als 1..N grosse Karten ("Gleichzeitig"-Header bei >1); **eine** Primaeraktion pro Karte (Erledigt+Vor _oder_ Timer starten); Footer "Weiter zu Schritt N". Keine Branch-Achse mehr — **jeder Knoten ist in Schedule-Reihenfolge erreichbar, die "durchgeklickt aber nicht fertig"-Falle verschwindet.** `TimerDisplay` und `viewerReducer` bleiben unveraendert. (`CookModeView.tsx`, `MobileView.tsx`, `TimerDisplay.tsx`, `RecipeStepsViewer.tsx`)
- **A-M3 — Flipt-Flag `cookSchedule` + View-Auswahl (S, medium).** Spiegelt die `gestureNavigation`-Plumbing. Default false; `/mobile`-Route und Cast erben die neue View automatisch. (`src/lib/flags/definitions.ts, config.ts, server.ts`, `RecipeStepsViewer.tsx`)
- **A-M4 — Hand-Gesten aus dem Kochflow streichen (S, medium).** Nicht in `CookModeView` portieren; Flag/Dateien als Experiment behalten, aber off und lazy. Wenn hands-free ein echtes Ziel ist, ist Voice ("weiter"/"erledigt") das richtige Primitiv — Future Work, nicht jetzt. (`MobileView.tsx`, `HandGesturePanel.tsx`, `useHandLandmarkerTest.ts`)
- **A-M5 (optional) — "Meanwhile"-Interleave (M, medium).** Lange Passiv-Schritte pinnen und davor die kurzen aktiven Schritte als Vordergrund-Sequenz zeigen ("Waehrend die Sauce koechelt: 1) Pasta kochen 2) Tisch decken"). Genau das, was Gantt/Lane kann und ein DAG nicht. Nur fuer Schritte mit Dauer. (`viewerUtils.tsx`, `CookModeView.tsx`)

**Gesamtaufwand Option A:** Quick Wins ~2-4 Tage; Desktop-Umbauten ~1-1.5 Wochen; Mobile-Neubau (A-M1/A-M2) ~1.5-2 Wochen. **Risiko niedrig**, weil keine Datenmigration und alles hinter Flags A/B-testbar.

---

## 5. Option B — auf den Lane-Wizard umbauen

### Ehrliche Reifegrad-Einschaetzung: ca. 45-55% fertig

Der Lane-Wizard ist ein **hochpolierter, feature-reicher Prototyp**, kein versteckt-fertiges Produkt.

**Was schon funktioniert (und richtig gut ist):**

- Swimlane-Datenmodell (`LaneGrid` → Segmente → Lanes → Steps, `columnSpans`-Bruchbreiten mit Up/Down-Propagation, `gridReducer.ts`) — invalide Graphen per Konstruktion unmoeglich.
- Add/Edit/Delete, Split (1→N), Merge (N→1 + Teil-Merge mit "continuation"-Fillern), Add-Lane.
- Gantt-`TimeRuler` mit Kritischer-Pfad-Highlight ("Roter Faden"), Parallel-Zaehler-Badge, parallel-bewusste Gesamtzeit.
- Echter Edit/Cook-Dual-Mode mit Fortschrittsbalken, Per-Step-Countdown, Done-Toggles.
- Vollstaendige AI-Pipeline Text→LaneGrid mit striktem OpenAI-JSON-Schema + Zod (`lib/importer/lane-grid-ai.ts`, `lane-grid-ai-schema.ts`).
- Pragmatischer Reuse: `NodeEditPanel` wird per No-op-Context wiederverwendet (`LaneEditPanel.tsx`); `StepTypePicker` ist sogar schon im echten xyflow-Editor produktiv geteilt.

**Was fehlt (und ohne das ist es nicht shipbar):**

- **Keine Integration (critical):** nur `/lane-wizard-mock` mit hartkodiertem Bolognese-Grid (`lane-wizard-mock/page.tsx`), `LaneWizard` wird sonst nirgends importiert.
- **Keine Persistenz (critical):** keine `laneGrid`-Spalte in Prisma (bestaetigt: `schema.prisma` hat nur `flowNodes`/`flowEdges`), kein `createRecipe`/`updateRecipe`-Aufruf — Speichern = JSON-Download (`LaneWizard.tsx:54-63`). Der Kern-Produktloop fehlt komplett.
- **Kein Mobile/Touch, keine Responsive-Fallback (high):** alles hover-gated (`SegmentDivider.tsx:99`), 3-4 fr-Spalten werden auf dem Handy unlesbar schmal — auf dem primaeren Kochgeraet unbrauchbar.
- **Kein Keyboard/a11y (high):** kein `onKeyDown`, kein Focus-Management.
- **Timer nur lokal (medium):** `useTimers.ts` baut bei jedem Mount frisch, ignoriert die `startedAt`-Persistenz des `viewerReducer` — Timer ueberleben kein Reload/Lock.
- **AI verwirft Titel + Zutaten (medium):** `AiLaneDialog.tsx` importiert nur das Grid; die `@[name](id)`-Mentions zeigen auf nie registrierte IDs → verwaiste Zutaten.
- **Continuation-Filler werden beim Serialisieren zerstoert und nicht rekonstruiert (medium):** `gridReducer.ts:118-142` — gespeicherte Teil-Splits/Merges oeffnen mit leeren Lanes.
- **Step-Fotos toter Pfad (low):** `photosByStepId` wird nie befuellt.
- **Mock im Sitemap (low):** `sitemap.ts:20` — der Prototyp ist fuer SEO indexiert.

### Die Daten-Migrations-Story

Das ist der **harte Teil und der teuerste Risikotreiber**:

- **Step-Ebene ist bereits kompatibel:** `LaneStep` und `RecipeNodeData` teilen `label`, `description` (inkl. inline `@[name](id)`), `duration`, `stepType`, `ingredientIds`; `photoKey` ist in `RecipeStepImage` per Step-ID externalisiert (beide Modelle bewahren die ID). Ein einzelner Schritt ist byte-kompatibel.
- **Die Topologie-Schicht ist es nicht.** Es existiert **kein Konverter** (grep nach `gridToFlow`/`flowToGrid`/`laneToFlow` leer).
- **lane→DAG ist trivial** (jede Lane = ein Pfad, Segmentgrenzen = Fan-out/Fan-in-Kanten).
- **DAG→lane ist die verlustbehaftete, inferenz-schwere Richtung.** Das Lane-Modell kann nur **series-parallele** Strukturen darstellen. Ein bestehender DAG mit Cross-Rank-Merge, verschachteltem Fork oder Cross-Lane-Kante ist nicht garantiert round-trip-faehig. Bei einer Migration **gehen verloren:** Kanten-Identitaet, Node-Positionen und jede nicht-series-parallele Topologie.
- **Unbekannt und blockierend:** Wie viele Produktions-Rezepte haben non-null `flowNodes`/`flowEdges`, und sind ihre DAGs series-parallel? (Live-DB auf saturn, nicht abgefragt.) Das ist der **einzige groesste Migrationskosten-Treiber.**
- **Zwei AI-Schemata sind bereits geforkt:** `openai-recipe-schema` (produktiv) vs. `lane-grid-ai-schema` (Prototyp, Header sagt woertlich "laneGrid ersetzt flowNodes+flowEdges"). Eine Migration zwingt zur Konsolidierung.

**Cleverster Migrationsweg, falls B:** Die Analyse hat hier den entscheidenden Hebel: **nicht** eine `laneGrid`-Spalte hinzufuegen, sondern `LaneGrid` _in_ die bestehenden `flowNodes`/`flowEdges` serialisieren (synthetische Kanten aus Segment-Adjazenz + `columnSpans` ableiten). Damit bleiben Viewer, Importer, Validierung, Admin-`nodeCount` und Bulk-Actions unveraendert — keine destruktive Migration. Trotzdem bleibt die DAG→lane-Inferenz fuer Bestandsrezepte ungeloest.

### Aufwand bis Produktion

Realistisch **6-10 Wochen+**: Persistenz/Konverter (bidirektional, mit series-parallel-Erkennung) ~2-3 Wochen, Integration in `RecipeForm` + Detail-Seite ~1-2 Wochen, Mobile/Touch-Layout ~1-2 Wochen, Timer-Persistenz/a11y/AI-Fixes/Continuation-Roundtrip ~1-2 Wochen, plus Backfill-Migration + Verifikation aller Bestandsrezepte. **Hohes Risiko** durch die lossy DAG→lane-Richtung auf produktiven Daten.

---

## 6. Empfehlung & Fahrplan

### Verdikt

**Option A (verbessern) mit dem mentalen Modell von B — entschieden.** Begruendung in drei Punkten:

1. **Das Problem ist die Navigationsschicht, nicht das Datenmodell.** Die Wurzelursachen (C1 Desktop-Koordinaten, C2 `tgts[0]`-Mobile) lassen sich mit bereits berechneten Bausteinen (`buildTopology`) beheben. Eine Migration loest keines dieser UI-Probleme automatisch — man muesste die Views ohnehin neu bauen.
2. **B hat ein ungeloestes, riskantes Daten-Problem** (lossy DAG→lane auf unbekannt vielen Bestandsrezepten), das A komplett vermeidet. Mehrwochen-Aufwand und Migrationsrisiko fuer dasselbe UX-Ergebnis, das A inkrementell und flaggesteuert liefert.
3. **Das Beste aus B kommt trotzdem mit:** Das Zeit-/Spuren-Modell ist nachweislich das ueberlegene Mental Model fuers Kochen (Mobile-Konsum _und_ Lese-Verstaendnis). `buildCookSchedule` (A-M1) bringt genau dieses Modell — in-memory aus dem DAG abgeleitet, ohne Persistenz-Wechsel.

**Wichtige Anerkennung:** Ja, das Lane-/Zeit-Modell ist vermutlich auch fuers **Authoring** das bessere Modell (invalide Graphen unmoeglich, Parallelitaet explizit, Gantt-Vorschau). Aber das ist eine **strategische Wette fuers naechste Quartal**, kein Fix fuer "fuehlt sich nicht gut an". Wir halten die Tuer dafuer offen (Phase 3), beweisen das Modell erst im Konsum (billig, reversibel) und investieren in den Editor-Umbau nur, wenn die Produktionsdaten und A/B-Ergebnisse es stuetzen. Der Lane-Wizard wird **nicht weggeworfen** — er liefert Konzept, AI-Prompt und `StepTypePicker` und ist der Prototyp fuer Phase 3.

### Phasen-Fahrplan

**Phase 0 — Stop the bleeding (3-4 Tage, sofort, keine Flags).**
QW1-QW9. Besonders unabhaengig wertvoll: QW7 (echter Schrittzaehler) und QW8 (Erledigt+Weiter verschmelzen) mobil; QW2/QW3/QW4 desktop. Diese sind chirurgisch, reversibel und validieren die Richtung "eine lineare Sequenz, Forks explizit".

**Phase 1 — Desktop-Lesbarkeit reparieren (1-1.5 Wochen).**
A-D1 (dagre-Layout) → A-D2 (entschlackte Karte) → A-D3 (robustes fitView) → A-D5 (Parallel-Gruppen). Das ist der Kern von "Desktop fuehlt sich nicht gut an". A-D6 (Edge-Memo) und A-D4 (Fullscreen-Toolbar) hinterher.

**Phase 2 — Mobile-Neubau (1.5-2 Wochen, hinter Flipt `cookSchedule`).**
A-M1 (`buildCookSchedule`) → A-M2 (`CookModeView`) → A-M3 (Flag) → A-M4 (Gesten raus). A/B gegen die alte `MobileView`, sofortiges Rollback moeglich. Danach optional A-M5 ("Meanwhile") und A-D7 (Desktop-Folge-Modus). **Erst entfernen, wenn auf echten Branch-Rezepten validiert.**

**Phase 3 — Strategische Entscheidung: Lane-Authoring (separat, datengetrieben).**
**Voraussetzung:** Produktions-`flowNodes` sampeln (Offene Frage 1). Wenn die meisten DAGs series-parallel und das CookSchedule-A/B positiv ist, lohnt sich der Lane-Wizard als _Editor_. Dann: bidirektionalen Konverter prototypen, `LaneGrid` in bestehende `flowNodes`/`flowEdges` serialisieren (keine neue Spalte), hinter Flag in `RecipeForm` A/B-testen, AI-Schemata konsolidieren, fehlende Stuecke (Mobile/Touch, a11y, Timer-Persistenz via `viewerReducer`, AI-Titel/Zutaten-Import, Continuation-Roundtrip) schliessen. **Erst entscheiden, nachdem Phase 2 das Modell bewiesen hat.**

**Querschnitt:** Alle neuen Toggles via Flipt (`src/lib/flags`), nie Env-Vars (Projekt-Konvention). `/lane-wizard-mock` aus `sitemap.ts` entfernen und auf non-prod/Admin gaten.

---

## 7. Offene Fragen (Produkt-Entscheidung noetig)

1. **Wie sehen echte Rezept-Graphen in Produktion aus?** Knotenzahl, Branch-Faktor, und vor allem: Wie viele haben ueberhaupt Parallel-Branches vs. sind effektiv linear? Sind die DAGs series-parallel? **Das ist die wichtigste Frage** — sie bestimmt, ob A-M5/A-D7/Phase 3 sich lohnen und ob eine spaetere Lane-Migration ueberhaupt verlustfrei moeglich waere. (Live-DB-Sample auf saturn.)
2. **Ist der Desktop-Graph die primaere Koch-Oberflaeche oder eine Uebersicht?** Wenn Mobile/Cast das eigentliche Follow-Along ist, investieren wir in Desktop-Lesbarkeit (Phase 1) + Folge-Modus _als Option_, statt in einen schweren gefuehrten Desktop-Modus.
3. **Soll der Lane-Wizard die primaere Rezept-Erstellung werden (import-first)?** Die AI-Route liefert bereits volle Metadaten (Titel, Kategorie, Zeiten, Zutaten). Wenn ja: Wie integriert sich das mit Auto-Save und der Moderations-Pipeline von `RecipeForm`?
4. **Sind die >4-Lanes-Kappung und der Zwang zu zusammenhaengenden Merges (`LaneGrid.tsx:221`, `SegmentDivider.tsx:131`, `MergeOverlay`) dauerhafte Produkt-Constraints?** Und braucht ihr echte Cross-Lane-Abhaengigkeiten (Step in Lane A muss vor Step in Lane B mitten im Segment fertig sein), die das strikte Segment-Modell nicht ausdruecken kann?
5. **Duerfen bei einer eventuellen Lane-Migration Node-Positionen und Kanten-Identitaet verworfen werden?** Das Lane-Modell hat kein Positions-Konzept — akzeptabel oder Show-Stopper?

---

_Relevante Dateien fuer die Umsetzung:_
`src/components/flow/viewer/DesktopView.tsx`, `src/components/flow/viewer/viewerUtils.tsx`, `src/components/flow/RecipeStepsViewer.tsx`, `src/components/flow/viewer/StepCard.tsx`, `src/components/flow/viewer/useMobileNavigation.ts`, `src/components/flow/viewer/MobileView.tsx`, `src/components/flow/viewer/BottomNavigation.tsx`, `src/components/flow/editor/lane-wizard/`, `prisma/schema.prisma`, `src/lib/flags/definitions.ts`.
