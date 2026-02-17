# React Flow Recipe Editor - Prototyp

Dieser Prototyp demonstriert das Lane-basierte Rezept-Editor-Konzept für KUC mit allen gewünschten Features:

## 🎯 Features

### 1. Auto-Layout (Dagre)
- Automatische Anordnung der Schritte mit Dagre-Layout-Engine
- Einheitliche Y-Positionen pro Lane
- Horizontale Anordnung (Left-to-Right)
- Ein-Klick Layout-Optimierung

### 2. Lane-Wechsel per Drag & Drop
- Schritte können zwischen Lanes gezogen werden
- Automatische Lane-Erkennung basierend auf Y-Position
- Visuelle Lane-Hintergründe als Orientierungshilfe
- Snap-to-Lane Verhalten

### 3. Automatische Reconnection beim Löschen
- Wird ein Schritt gelöscht, werden eingehende und ausgehende Verbindungen automatisch verbunden
- Keine "hängenden" Pfade mehr
- Bridge-Edges werden automatisch erstellt

### 4. Validierung
- Prüfung, ob alle Pfade zu "Servieren" führen
- Fehleranzeige in der UI
- Verhinderung von Zyklen
- Servieren kann keine Quelle sein

### 5. Lane-spezifische UI
- (+)-Buttons pro Lane außerhalb des Canvas
- Farbige Lane-Hintergründe
- Lane-Labels im Canvas
- Lane-spezifische Node-Farben

## 🚀 Installation

```bash
# Dependencies installieren
npm install @xyflow/react dagre

# Oder mit yarn
yarn add @xyflow/react dagre

# Oder mit pnpm
pnpm add @xyflow/react dagre
```

## 📦 Verwendung

```tsx
import RecipeFlowEditor from './RecipeFlowEditor';

function App() {
  return (
    <ReactFlowProvider>
      <RecipeFlowEditor />
    </ReactFlowProvider>
  );
}
```

## 🎮 Bedienung

### Schritt hinzufügen
1. Auf den gewünschten (+)-Button in der linken Sidebar klicken
2. Neuer Schritt wird automatisch in der Lane angelegt

### Schritt verschieben
1. Schritt anklicken und ziehen
2. In eine andere Lane ziehen (Y-Position ändert Lane)
3. Oder innerhalb der Lane X-Position ändern

### Verbindungen erstellen
1. An einem Ausgangs-Handle (rechte Seite) ziehen
2. Zum Ziel-Handle (linke Seite) ziehen
3. Oder: Auto-Layout Button klicken für automatische Anordnung

### Schritt löschen
1. Schritt auswählen
2. Delete oder Backspace drücken
3. Automatische Reconnection erfolgt sofort

### Auto-Layout
1. "🔄 Auto-Layout" Button klicken
2. Alle Schritte werden optimal angeordnet
3. Viewport zoomt automatisch auf alle Elemente

## 🏗️ Architektur

### Datenmodell
```typescript
interface RecipeStep {
  id: string;
  type: 'recipeStep' | 'servieren';
  position: { x: number; y: number };
  data: {
    laneId: string;      // 'vorbereitung' | 'kochen' | etc.
    title: string;
    duration?: number;
  };
}
```

### Lane-System
- Feste Y-Positionen: `laneIndex * LANE_HEIGHT + LANE_PADDING`
- 6 definierte Lanes: Vorbereitung, Kochen, Backen, Warten, Würzen, Servieren
- Servieren ist der Endknoten (kann keine Quelle sein)

### Auto-Layout Algorithmus
```
1. Dagre Graph initialisieren
2. Alle Nodes hinzufügen
3. Alle Edges hinzufügen
4. Dagre.layout() ausführen
5. X-Positionen von Dagre übernehmen
6. Y-Positionen aus Lane-Konfiguration setzen
```

## ⚠️ Bekannte Limitationen

### Prototyp-Status
- Keine Persistenz (Daten gehen bei Reload verloren)
- Keine Undo/Redo Funktion
- Keine Bild-Upload Integration
- Keine Zutaten-Verknüpfung
- Keine echten BPMN-Swimlanes (visuelle Lanes nur als Hintergrund)

### React Flow Limits
- Keine eingebauten Swimlanes (müssen simuliert werden)
- Group-Nodes haben keine Handles (nur visuelle Gruppierung)
- Drag-between-Lanes erfordert Custom-Logik

## 🔧 Erweiterungsmöglichkeiten

### Kurzfristig
- [ ] Undo/Redo mit Zustandshistorie
- [ ] Speichern/Laden von Rezepten
- [ ] Zutaten-Dialog pro Schritt
- [ ] Bild-Upload Integration
- [ ] Dauer-Berechnung gesamt

### Mittelfristig
- [ ] Echte BPMN-Swimlanes (react-flow-bpmn)
- [ ] Parallele Pfade visualisieren (Join-Gateways)
- [ ] Kollaboratives Editieren (Yjs)
- [ ] Versionierung von Rezepten
- [ ] Export als Bild/PDF

### Langfristig
- [ ] AI-gestütztes Auto-Layout
- [ ] Template-System für häufige Abläufe
- [ ] Mobile-optimierte Touch-Steuerung
- [ ] Integration mit externen APIs (Zutaten-Datenbank)

## 🎨 Anpassung

### Neue Lane hinzufügen
```typescript
const LANES = [
  // ... bestehende Lanes
  { 
    id: 'meine-lane', 
    label: 'Meine Lane', 
    color: '#ffebee' 
  },
];
```

### Node-Größe ändern
```typescript
const NODE_WIDTH = 200;  // Standard: 180
const NODE_HEIGHT = 100; // Standard: 80
```

### Lane-Höhe ändern
```typescript
const LANE_HEIGHT = 150; // Standard: 120
```

## 📚 Abhängigkeiten

- `@xyflow/react` ^12.x - React Flow Bibliothek
- `dagre` ^0.8.x - Graph-Layout-Engine

## 📝 Lizenz

Prototyp für KUC-1 - Interne Verwendung
