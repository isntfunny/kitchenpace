# Filterseite: FilterSets + User-Taste-Sortierung — Design-Spec

**Datum:** 2026-03-24
**Status:** Bereit zur Implementierung
**Priorität:** Muss VOR dem Wochenplan-Feature umgesetzt werden
**Nachfolge-Ticket:** Wochenplan (`2026-03-24-meal-plan-design.md`) — nutzt FilterSet-Chips und Taste-Sortierung

---

## 1. Ziel

Zwei Erweiterungen der Rezept-Filterseite (`/recipes`):

1. **FilterSet-Chips:** Vorkonfigurierte Such-Einstiege (saisonal, thematisch) als horizontale Chip-Leiste oberhalb der Ergebnisse
2. **"Passt zu dir"-Sortierung:** Neuer Sort-Mode der Rezepte per Cosine-Similarity zum Nutzer-Geschmacksprofil (`Profile.tasteEmbedding`) sortiert

Beide Features sind Voraussetzung für den KI-Inspirations-Strip im Wochenplan: Chip-Klick → Filterseite mit vorausgewähltem FilterSet.

---

## 2. FilterSet-Chips

### Datenquelle

`FilterSet` Modell mit zwei Typen:

- `TIME_SEASON`: Saisonale Sets (Felder: `season`, `timeSlot`) mit verknüpften `tags`, `categories`, `ingredients`
- `FOOD_PERIOD`: Thematische Sets (Felder: `slug`, `label`) — z.B. "Grillsaison", "Weihnachten"

### UI

Horizontale scrollbare Chip-Leiste zwischen Suchheader und Ergebnissen:

```
[🌿 Frühling]  [🐟 Fisch-Woche]  [⚡ Schnelle Küche]  [🥗 Vegetarisch]  →
```

- Chips werden serverseitig geladen (aktive FilterSets, sortiert nach `sortOrder`)
- Aktiver Chip: `primary`-Farbe, inaktive: `surface` mit `border`
- **Saisonale Chips:** Automatisch aktiv wenn aktuelle Jahreszeit passt (`season` matches)
- Klick auf Chip: setzt Tags/Kategorien/Zutaten des FilterSets als aktive Filter — bestehende Filter werden **ergänzt** (nicht ersetzt)
- Zweiter Klick auf aktiven Chip: Filter des Sets werden wieder entfernt

### Aktivierung aus Wochenplan

Der KI-Strip im Wochenplan öffnet die Filterseite mit `?filterSetId=[id]` — das entsprechende FilterSet wird automatisch aktiviert.

---

## 3. "Passt zu dir"-Sortierung

### Neue Sort-Option

```typescript
// src/lib/recipeFilters.ts
export type RecipeSortOption = 'rating' | 'newest' | 'fastest' | 'popular' | 'taste';
```

Im Sortier-Dropdown erscheint der neue Eintrag:

```
Bewertung        (rating — default)
Neueste          (newest)
Schnellste       (fastest)
Beliebteste      (popular)
Passt zu dir ✨  (taste — nur für eingeloggte Nutzer)
```

### Berechnung

Serverseitig in der Suchaktion (`src/app/recipes/actions.ts` oder OpenSearch-Query):

```
1. Lade Profile.tasteEmbedding des eingeloggten Nutzers
2. Falls kein tasteEmbedding vorhanden → Fallback auf 'popular'
3. Berechne Cosine-Similarity für alle gefilterten Rezepte via RecipeEmbedding
4. Sortiere Ergebnisse absteigend nach Similarity-Score
```

**Performance:** Cosine-Similarity wird auf gefilterten Ergebnissen berechnet (nach Anwendung aller anderen Filter), nicht auf allen Rezepten. Bei großen Ergebnismengen (>200): Top-200 nach Rating, dann Taste-Re-Ranking.

### Gast-Nutzer

Sort-Option `taste` wird nicht angezeigt für nicht eingeloggte Nutzer. Wird `?sort=taste` direkt aufgerufen ohne Login → Fallback auf `popular`, kein Fehler.

### Persistenz

Der gewählte Sort-Mode wird wie bisher in `localStorage` gespeichert (`STORAGE_KEYS.searchSort`). `taste` wird persistent gespeichert — Nutzer sehen beim nächsten Besuch direkt ihre personalisierte Sortierung.

---

## 4. Betroffene Dateien

| Datei                                            | Änderung                                                   |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `src/lib/recipeFilters.ts`                       | `RecipeSortOption` um `'taste'` ergänzen                   |
| `src/app/recipes/page.tsx`                       | FilterSets serverseitig laden, als Prop übergeben          |
| `src/app/recipes/components/SearchHeader.tsx`    | Taste-Option im Sortier-Dropdown (nur eingeloggt)          |
| `src/app/recipes/components/FilterSidebar.tsx`   | FilterSet-Chips Section hinzufügen                         |
| `src/app/recipes/actions.ts`                     | Taste-Sort implementieren (Cosine-Similarity + Re-Ranking) |
| `src/app/recipes/components/useSearchFilters.ts` | `filterSetId` als URL-Param verarbeiten                    |

---

## 5. Technische Entscheidungen

| Entscheidung          | Wahl                        | Begründung                                             |
| --------------------- | --------------------------- | ------------------------------------------------------ |
| FilterSet-Aktivierung | Ergänzt bestehende Filter   | Nutzer kann FilterSet + eigene Filter kombinieren      |
| Taste-Sort Fallback   | `popular`                   | Sinnvoller Default wenn kein Profil vorhanden          |
| Re-Ranking Grenze     | 200 Rezepte                 | Balance zwischen Qualität und Performance              |
| Chip-Datenquelle      | Serverseitig beim Page-Load | FilterSets ändern sich selten, kein Client-Fetch nötig |
