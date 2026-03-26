# MobileView Rework — Design Spec

**Status:** Geplant (Implementierung nach Header/Search/Menu Mobile Fixes)
**Scope:** `src/components/flow/viewer/` — nur die Kochansicht, kein Header/Search/Menu

## Kontext

Die MobileView funktioniert bei einfachen linearen Rezepten, bricht aber bei komplexen Rezepten mit
mehreren parallelen Branches zusammen (z.B. Taco al Pastor: 23 Nodes, 7 Branches).

### Identifizierte Probleme

1. **Minimap unlesbar**: SVG-Graph wird bei vielen Nodes+Edges zu einem Spaghetti-Netz
2. **Branch-Hints schweben**: `position: absolute` mit abrupt endendem Gradient, kein visueller Anker
3. **Navigation inkonsistent**: Minimap-Y (dagre-basiert) stimmt nicht mit Swipe-Reihenfolge (row-basiert) ueberein
4. **Hintergrund scheint durch**: Dark-Overlay zu transparent, Rezeptseite (Zutaten, Autor) bleibt lesbar
5. **"Schritt X / Y" irrefuehrend**: Bei Graphen mit Branches gibt es keinen linearen Pfad

## Design-Entscheidungen

### 1. Minimap: Balken-Grid (Equal Fill)

- **CSS Grid statt SVG**: Zeilen = Branches, Spalten = Schrittpositionen
- **Kuerzere Branches**: Steps werden zu Balken die ueber mehrere Spalten spannen
  (`grid-column: span X`), mindestens ein Kreis bleibt pro Step
- **Fork/Merge-Erkennung**: Algorithmus identifiziert parallele Branch-Gruppen,
  berechnet max Schrittanzahl pro Gruppe, verteilt kuerzere Branches
- **Zustaende**: Done (gruen), Current (orange + Glow), On-Path (dezentes Orange),
  Inactive (grau), Ghost (fast unsichtbar fuer andere Branches)
- **Keine Verbindungslinien** — das Grid selbst zeigt die Struktur
- **Tappbar**: Jede Zelle navigiert direkt zu dem Step

### 2. Branch-Hints: Pills statt schwebende Gradients

- Feste Position: `top: 8px` / `bottom: 8px` als Pill-Buttons
- `backdrop-filter: blur(8px)` + Border statt abrupt endender Gradient
- Inhalt: Chevron + Step-Name

### 3. Navigation-Konsistenz

- Swipe up/down navigiert durch Grid-Zeilen in Minimap-Reihenfolge
- Minimap-Klick und Swipe nutzen die gleiche Position-Logik
- **Spalten-Counter**: "Spalte 4 / 9" im BottomNav (ersetzt "Schritt X / Y")
    - Fallback: Counter weglassen, Minimap zeigt Fortschritt

### 4. Overlay-Fix

- Staerkerer Blur: `backdrop-filter: blur(20px+)`
- Hoehere Opacity: `background: rgba(26,23,21,0.92+)`
- Bleibt Overlay, keine separate Route

## Implementierungs-Komplexitaet

Der Balken-Grid-Algorithmus ist der komplexeste Teil:

1. Fork/Merge-Paare im Graphen erkennen (Nodes mit >1 outgoing edge = Fork,
    > 1 incoming edge = Merge)
2. Pro Branch-Gruppe die maximale Schrittanzahl berechnen
3. Kuerzere Branches mit `grid-column: span X` strecken
4. Mindestens einen Kreis pro Step erhalten (nicht alles Balken)
5. Reaktiv bei Navigation-Wechseln aktualisieren

## Nicht im Scope

- Header Search Fullscreen-Modus (eigener Spec)
- Header Menu Drawer (eigener Spec)
- `/mobile` Route (Text-Liste)
- Timer-gewichtete Balkenbreiten
- Labeled Bars (V2-Feature)

## Mockups

Visuelle Referenzen wurden als HTML-Mockups erstellt:

- Minimap-Konzeptvergleich: 3 Optionen (Fokussiert / Vereinfacht / Streifen)
- Balken-Varianten: 3 Optionen (Equal Fill / Timer-gewichtet / Labeled Bars)
- Entscheidung: Equal Fill mit mindestens einem Kreis pro Step
