# Mobile Header, Search, Menu & Notifications — Design Spec

**Status:** Bereit zur Implementierung
**Prioritaet:** Hoch — betrifft alle Mobile-Nutzer auf jeder Seite
**Scope:** Header-Suche, Hamburger-Menu, User-Menu, Notifications, Filter-Sheet Polishing

## Kontext

Die Header-Elemente funktionieren auf Mobile (390px Viewport) schlecht:

- **Suche**: Input zu schmal (Text wird links abgeschnitten bei laengeren Queries),
  Dropdown nicht full-width, kein Schliessen-Button
- **Hamburger-Menu**: Radix DropdownMenu schwebt als kleines Overlay,
  Content der Seite scheint durch
- **User-Menu**: Gleiches Problem wie Hamburger-Menu
- **Notifications**: Kleines Dropdown, kein Fullscreen-Modus
- **Filter-Sheet**: Funktional okay, aber optisch nicht polished

## Design-Entscheidungen

### 1. Header Search → Fullscreen Overlay

**Ausloeser:** Tap auf das Suchfeld oder Such-Icon im Mobile-Header

**Verhalten:**

- Fullscreen-Panel fadet ein (opacity 0→1 + leichter scale, ~200ms ease-out)
- `backdrop-filter: blur(20px)` + hohe Opacity auf den Hintergrund
- Auto-Focus auf das Input-Feld beim Oeffnen
- Volle Bildschirmbreite fuer Input und Ergebnisse
- Ergebnisse scrollen vertikal mit voller Breite

**Schliessen:**

- X-Button oben rechts
- Hardware-Back / Swipe-Back Geste
- ESC-Taste

**Technisch:**

- Neuer `MobileSearchOverlay`-Wrapper um bestehende `HeaderSearch`-Logik
- Bestehende Search-API/Debounce-Logik bleibt unveraendert
- Nur auf Mobile (`md` Breakpoint) — Desktop bleibt wie bisher
- Panda CSS Tokens fuer Farben, Spacing, Radii
- Dark Mode: `_dark` Condition fuer alle Farben

### 2. Hamburger Menu → Fullscreen Drawer (von links)

**Ausloeser:** Tap auf Hamburger-Button im Mobile-Header

**Verhalten:**

- Drawer gleitet von links ein, volle Hoehe, ~85% Breite (oder volle Breite)
- Backdrop: `backdrop-filter: blur(8px)` + Semi-transparentes Overlay
- Spring-Animation (Framer Motion oder CSS transition)

**Inhalt (abhaengig von Auth-Status):**

- Nicht eingeloggt:
    - Rezepte entdecken
    - Saisonal & frisch
    - In 30 Minuten fertig
    - Vegetarische Highlights
    - Top bewertet
    - Darstellung (Dark Mode Toggle)
- Eingeloggt (zusaetzlich):
    - Rezept erstellen
    - Verwaltung-Sektion: Administration, Moderation (rollenabhaengig)

**Schliessen:**

- X-Button oben rechts im Drawer
- Tap auf Backdrop
- Swipe nach links
- ESC-Taste

**Technisch:**

- Ersetzt aktuelles Radix `DropdownMenu` auf Mobile
- Desktop-Dropdown bleibt unveraendert (nur `md` Breakpoint Unterscheidung)
- Panda CSS: `_dark` Condition, semantische Tokens
- Touch-Targets: min. 48px Hoehe pro Menu-Item
- `body` scroll-lock wenn Drawer offen

### 3. User Menu → Fullscreen Drawer (von rechts)

**Ausloeser:** Tap auf Avatar/Profile-Button im Mobile-Header

**Visuell:** Identisches Pattern wie Hamburger-Drawer, aber:

- Gleitet von **rechts** ein
- Gleiche Breite, gleiche Animation, gleiche Close-Mechanik

**Inhalt:**

- Fuer Dich (Sektion):
    - Profiluebersicht
    - Favoriten
    - Meine Rezepte
    - Profil & Einstellungen
- Abmelden (am Ende, visuell abgesetzt)

**Technisch:**

- Geteilte Drawer-Komponente mit `direction: 'left' | 'right'` Prop
- Nur sichtbar wenn eingeloggt (nicht-eingeloggte sehen Login-Button)

### 4. Notifications → Fullscreen Overlay

**Ausloeser:** Tap auf Notification-Badge am Avatar

**Verhalten:**

- Fullscreen Overlay (gleiches Pattern wie Search)
- `backdrop-filter: blur(20px)` + hohe Opacity
- Notification-Liste mit Scroll
- "Alle anzeigen" Button/Link am Ende
- Badge-Count wird beim Oeffnen zurueckgesetzt

**Schliessen:**

- X-Button
- Hardware-Back
- ESC-Taste

**Technisch:**

- Wrapper um bestehende Notification-Logik
- Nur auf Mobile — Desktop bleibt Dropdown

### 5. Filter-Sheet → Visuelles Polishing

**Kein funktionaler Umbau.** Nur Styling-Verbesserungen:

- Echter Bottom-Drawer Look:
    - Handle-Bar oben (36px breit, 4px hoch, zentriert)
    - Abgerundete Ecken oben (20px border-radius)
    - Header der Seite nicht mehr sichtbar hinter dem Sheet
- Mehr horizontaler Platz:
    - Weniger Padding links/rechts (16px statt aktuell ~20px)
    - Tags kompakter gesetzt
- Dark Mode Support:
    - `_dark` Condition fuer alle Farben
    - Aktuell hardcoded Farben auf Panda CSS Tokens umstellen
- Backdrop-Overlay verbessern:
    - `backdrop-filter: blur(8px)` hinzufuegen

## Geteilte Komponenten

### `MobileDrawer` (neu)

Wiederverwendbare Drawer-Komponente fuer Hamburger + User Menu:

```
Props:
- open: boolean
- onClose: () => void
- direction: 'left' | 'right'
- children: ReactNode
```

Features:

- Backdrop mit Blur
- Slide-Animation (CSS oder Framer Motion)
- Swipe-to-close in Gegenrichtung
- Body scroll-lock
- Focus-Trap
- ESC-Taste Listener

### `MobileOverlay` (neu)

Wiederverwendbare Overlay-Komponente fuer Search + Notifications:

```
Props:
- open: boolean
- onClose: () => void
- children: ReactNode
```

Features:

- Fullscreen mit Blur-Backdrop
- Fade/Slide-Animation
- Body scroll-lock
- Focus-Trap
- ESC-Taste Listener

## Breakpoint-Strategie

Alle Aenderungen nur auf Mobile (`base` in Panda CSS, unter `md` Breakpoint = 768px).
Desktop-Verhalten bleibt komplett unveraendert:

- `md`+: Radix DropdownMenu, Inline-Search-Dropdown, Notification-Dropdown
- `base`: MobileDrawer, MobileOverlay, verbesserter Filter-Sheet

## Styling-Konventionen

- Alle Farben via Panda CSS Tokens (keine hardcoded `rgba()` Werte)
- Dark Mode via `_dark` Condition
- Spacing via semantische Tokens (`page.x`, `card`, etc.)
- Border-Radius via `surface` / `control` Tokens
- Animationen: CSS `transition` bevorzugt, Framer Motion nur wenn noetig

## Nicht im Scope

- Aenderungen an der Search-Ranking-Logik (Backend)
- Desktop-Layout Aenderungen
- MobileView Kochansicht (eigener Spec: `2026-03-26-mobileview-rework-design.md`)
- Neue Menu-Eintraege oder Navigation-Struktur
