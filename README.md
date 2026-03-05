# KitchenPace - Vom Chaos zur Klarheit

Stell dir vor, du öffnest ein Rezept und siehst nicht mehr diese endlose, ermüdende Liste von Schritten, die dich durch einen linearen Prozess zwingen. Stattdessen erblickst du eine **lebendige, fließende Visualisierung** deines gesamten Kochprozesses - wie eine Choreographie, wie ein Tanz in der Küche.

## Die Vision

Jeder kennt es: Du stehst in der Küche, drei Töpfe brodeln, der Timer piept, du weißt nicht mehr, was als nächstes kommt, und plötzlich brennt die Sauce an, während das Gemüse noch roh ist. **Kochen fühlt sich oft wie kontrolliertes Chaos an**.

**KitchenPace** verwandelt dieses Chaos in **kristallklare Struktur**. Es nimmt die Komplexität des gleichzeitigen Kochens und macht sie _sichtbar_, _verständlich_, _beherrschbar_.

### Das Chaos beherrschen

Traditionelle Rezepte sind wie eine To-Do-Liste ohne Prioritäten. Sie geben dir nicht das große Bild. Du stolperst von Schritt zu Schritt und merkst zu spät: "Oh, das hätte ich vor 20 Minuten vorbereiten sollen!"

**KitchenPace zeigt dir von Anfang an die gesamte Landschaft**:

- **Überblick statt Überforderung**: Du siehst _sofort_, was parallel läuft, was aufeinander wartet, wo die Engpässe sind
- **Mentale Klarheit**: Dein Gehirn muss nicht mehr jonglieren und improvisieren - der Flow ist bereits durchdacht
- **Kontrolle zurückgewinnen**: Keine Panik mehr, kein "Oh nein, ich hab vergessen...!" - alles hat seinen Platz, seinen Moment

### Was macht es so besonders?

Jedes Rezept wird zu einer **visuellen Landkarte deines Kochabenteuers**:

- **Parallele Welten werden sichtbar**: Die Sauce reduziert sich? Perfekt - die Visualisierung zeigt dir _genau_, was du in dieser Zeit parallel erledigen kannst. Das Gemüse röstet im Ofen? Der Graph zeigt: "Jetzt hast du 15 Minuten für die Beilage."

- **Struktur in der Gleichzeitigkeit**: Was früher ein mentales Puzzle war - "Wann muss ich was starten, damit alles gleichzeitig fertig ist?" - wird zur klaren, visuellen Wahrheit. Du siehst die Synchronisation.

- **Der kritische Pfad wird erkennbar**: Wie bei einem Projektplan siehst du: _Das_ ist der zeitkritische Strang. _Das_ kann warten. _Hier_ muss ich aufmerksam sein, _dort_ kann ich entspannen.

- **Intuitive Nodes**: Jede Aktion hat ihr eigenes visuelles Symbol. "Würzen" sieht anders aus als "Köcheln lassen" oder "Scharf anbraten". Dein Gehirn erfasst den Flow sofort - keine kognitive Überlastung mehr.

- **Der große Moment**: Alle Verzweigungen münden am Ende in diesem einen, magischen Punkt - dem fertigen Gericht. Du siehst, wie alles zusammenkommt. Das Chaos ordnet sich.

## Warum ist das revolutionär?

**KitchenPace bringt die Logik von Projektmanagement in die Küche** - aber auf schöne, intuitive Weise. Es nimmt das implizite Wissen von Profiköchen ("Die machen ja immer mehrere Sachen gleichzeitig!") und macht es **explizit und zugänglich**.

Profis haben diese Struktur im Kopf. Sie _sehen_ den Flow. Sie haben gelernt, das Chaos zu strukturieren. **KitchenPace gibt jedem diese Superkraft**.

### Von Stress zu Flow

Statt gestresst zwischen Herd, Schneidebrett und Backofen hin- und herzurennen, befindest du dich plötzlich im **Flow**. Du weißt immer, wo du stehst. Du weißt, was als nächstes kommt. Du hast die Kontrolle.

Das ist nicht nur effizienter - **es macht Kochen wieder zu dem, was es sein sollte: Entspannend, kreativ, genussvoll**.

## Die Zukunft

Stell dir vor:

- **Adaptive Komplexität**: Das Rezept passt sich an deine Küche an - zwei Herdplatten? Der Flow reorganisiert sich automatisch
- **Echtzeit-Orientierung**: Du markierst Schritte als erledigt, und die Visualisierung zeigt dir sofort: "Du bist hier, das kommt als nächstes"
- **Zeitmanagement visuell**: Timer direkt in den Nodes - du siehst, wie viel Zeit jeder Strang noch braucht
- **Chaos-zu-Struktur für alle**: Auch komplexeste Menüs mit vier Gängen werden plötzlich machbar, weil du die Struktur _siehst_

**KitchenPace** ist dein **Kompass im Küchenchaos**. Es verwandelt Überforderung in Übersicht, Stress in Struktur, Panik in Plan.

---

Das ist nicht einfach eine weitere Rezept-App. Das ist **der Paradigmenwechsel**: Vom linearen Denken zum **strukturierten, visuellen Kochflow**.

**Endlich Ordnung im schönsten Chaos der Welt.** 🎯✨

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Fresh Development Builds

For standalone development builds that should ship with a clean database, run:

```bash
npm run build:dev-seed
```

This sets `DEBUG=1`, performs a production build, then reruns Prisma code generation, truncates and rebuilds the schema, and finally reseeds the database so you always work against a fresh dataset. It is intentionally separate from `npm run dev` and only skips database operations on that build command.

## OpenSearch index & ingestion

The repository includes an embedded OpenSearch cluster alongside PostgreSQL in `docker-compose.yml`. The `opensearch-sync` worker (in `worker/`) keeps the `recipes` index up to date with typed mappings for keywords, categories, numeric fields, and timestamps.

Start everything during development with:

```bash
docker compose up --build
```

OpenSearch will be reachable at `http://localhost:9200`.

## Git & Release Discipline

- The `live` branch receives only **squash merges** so its history stays linear and clean.
- Every merge commit targeting `live` must include a matching changelog entry describing the user-visible impact.
- The **first line** of the commit message must be a compact summary of the biggest change, prefixed with the predominant type (`feat`/`fix`/`chore`), e.g. `feat: Autosave cooking progress in background`.

## Email Templates (MJML)

Email templates are located in `lib/email-templates/mjml/` and use **MJML** format with **Liquid templating** for Notifuse integration.

### Liquid Variable Reference

#### Contact Variables

| Variable                   | Description          |
| -------------------------- | -------------------- |
| `{{ contact.first_name }}` | User's first name    |
| `{{ contact.last_name }}`  | User's last name     |
| `{{ contact.email }}`      | User's email address |

#### System URLs

| Variable                         | Description                         |
| -------------------------------- | ----------------------------------- |
| `{{ unsubscribe_url }}`          | Link to unsubscribe from newsletter |
| `{{ confirm_subscription_url }}` | Link to confirm subscription        |
| `{{ notification_center_url }}`  | Link to notification preferences    |

#### Template Variables

**generic.mjml** (main template)

| Variable           | Description                            |
| ------------------ | -------------------------------------- |
| `{{{ subject }}}`  | Email subject (triple braces for HTML) |
| `{{{ message }}}`  | Main content (triple braces for HTML)  |
| `{{ buttonText }}` | Button text (optional)                 |
| `{{ buttonLink }}` | Button URL (optional)                  |

### Import to Notifuse

1. Open Notifuse dashboard → Templates
2. Create New Template
3. Copy MJML content from `lib/email-templates/mjml/`
4. Notifuse compiles MJML to responsive HTML automatically
