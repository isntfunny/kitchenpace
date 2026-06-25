# SEO-Analyse KochTakt — Stand 2026-06-20

Vollständige Bestandsaufnahme der technischen SEO, priorisierte Verbesserungen
und Empfehlung von Indexing-Tools. Domain: `kochtakt.de` (prod), `beta.kochtakt.de`.

---

## 0. Executive Summary

**Gesamtbild: technisch überdurchschnittlich gut.** Die SEO-Grundlagen sind
für ein Hobby-/Indie-Projekt ungewöhnlich sauber umgesetzt: vollständiges
Recipe-JSON-LD inkl. HowToStep/AggregateRating/Nutrition, Canonicals auf allen
Seitentypen, dynamische Sitemap mit Tag-/Zutaten-Landingpages, Breadcrumbs,
WebSite+Organization-Graph mit Sitelinks-Searchbox. Das ist die Basis, auf der
die meisten Rezept-Sites _erst_ aufbauen müssen.

**Die drei größten Hebel** sind weniger Markup, sondern Auslieferung & Indexierung:

1. **Proaktive Indexierung fehlt komplett** — keine Search-Console-Verifizierung,
   kein IndexNow, kein Ping bei Publish. Neue Rezepte warten passiv auf den Crawler.
2. **Core Web Vitals (Mobile LCP ~14,8 s, Perf 53)** — direkter Ranking-Faktor,
   bereits in `project_pagespeed_baseline` dokumentiert, aber SEO-kritisch.
3. **Kein Image-Sitemap** — Google empfiehlt ihn ausdrücklich; Rezeptbilder sind
   der wichtigste Rich-Result- und Bildersuche-Asset.

Score (subjektiv): **On-Page/Markup 8.5/10 · Technik/Indexierung 5/10 · Performance 4/10**

---

## 1. Bestandsaufnahme — was bereits gut ist ✅

| Bereich                                    | Status                                                                                                                                                                                      | Fundstelle                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Title-Template + Default                   | ✅ `%s \| KochTakt`                                                                                                                                                                         | `src/app/layout.tsx`                         |
| Meta-Description / Keywords / Authors      | ✅                                                                                                                                                                                          | `layout.tsx`                                 |
| `metadataBase` + OpenGraph + Twitter Cards | ✅ vollständig                                                                                                                                                                              | `layout.tsx`                                 |
| WebSite + Organization JSON-LD             | ✅ inkl. `SearchAction` (Sitelinks-Searchbox)                                                                                                                                               | `layout.tsx:25`                              |
| Recipe JSON-LD                             | ✅ **sehr vollständig**: name, image (3 Seitenverhältnisse), author, prep/cook/totalTime, yield, ingredients, `HowToStep`-Instructions, `AggregateRating`, `NutritionInformation`, keywords | `RecipeJsonLd.tsx`                           |
| BreadcrumbList                             | ✅ Recipe + Landingpages                                                                                                                                                                    | `RecipeJsonLd.tsx`, `tag/zutat/category`     |
| Canonical-URLs                             | ✅ auf allen relevanten Typen (recipe, category, tag, zutat, collection, user, recipes)                                                                                                     | diverse `generateMetadata`                   |
| Dynamische Sitemap                         | ✅ recipes, categories, users, collections, tags, ingredients                                                                                                                               | `src/app/sitemap.ts`                         |
| robots.txt                                 | ✅ sinnvolle Disallows, `/api/thumbnail` + `/api/og/` bewusst erlaubt                                                                                                                       | `src/app/robots.ts`                          |
| Keyword-Landingpages                       | ✅ `/tag/[slug]` + `/zutat/[slug]` mit `CollectionPage` + `ItemList` + Breadcrumb — **starke programmatische SEO**                                                                          | `keyword-landing.ts`                         |
| Slug-URLs                                  | ✅ überall (Rezepte, User, Tags, Zutaten)                                                                                                                                                   | projektweit                                  |
| Draft-/Privatschutz                        | ✅ Drafts `noindex`, leere Landingpages `noindex,follow`                                                                                                                                    | `recipe/[id]/page.tsx:63`, `tag/page.tsx:23` |
| Mobile-Duplicate                           | ✅ `/recipe/[id]/mobile` canonicalisiert auf Hauptseite                                                                                                                                     | `mobile/page.tsx:35`                         |
| Dynamische OG-Bilder                       | ✅ `opengraph-image.tsx` + `/api/og/category/[slug]`                                                                                                                                        | —                                            |
| Crawlbare Links                            | ✅ Rezeptkarten = `next/link` mit echten `href`                                                                                                                                             | `features/RecipeCard.tsx:326`                |
| H1 vorhanden                               | ✅ Startseite (`HeroSpotlight`), Rezeptdetail                                                                                                                                               | `HeroSpotlight.tsx:94`                       |
| Runtime-Domain                             | ✅ `APP_URL` aus `SERVICE_URL` zur Laufzeit → korrekt für beta/prod                                                                                                                         | `src/lib/url.ts`                             |
| Fonts                                      | ✅ `next/font` (kein CLS durch Schriften)                                                                                                                                                   | `layout.tsx`                                 |
| Sitemap-Warming                            | ✅ Cache-Warming/Smoke-Test-Skript                                                                                                                                                          | `scripts/warm-sitemap.sh`                    |

**Live-Sitemap aktuell:** 2.291 URLs — 964 Rezepte · 983 Zutaten · 323 Tags · 8 Kategorien · 6 User · 7 statisch.
→ Weit unter dem 50.000-URL-Limit, Sitemap-Splitting noch **nicht** nötig.

---

## 2. Befunde & Verbesserungen (priorisiert)

### 🔴 HOCH — größter Hebel, klare Wirkung

#### H1 — Proaktive Indexierung & Webmaster-Tools fehlen vollständig

- **Keine** Google-Search-Console-Verifizierung, **keine** Bing-Webmaster-Verifizierung
  (kein `verification`-Feld in `metadata`, kein DNS-/HTML-Tag).
- **Kein IndexNow**, **kein** Ping bei Recipe-Publish/Update → neue & geänderte
  Rezepte werden nur passiv beim nächsten Crawl entdeckt (kann Tage dauern).
- **Wirkung:** Time-to-index sinkt von Tagen auf Minuten (Bing/ChatGPT sofort);
  GSC liefert erst die Daten, um alles andere zu messen.
- **→ siehe Abschnitt 3 (Tools) für konkrete Umsetzung.**

#### H2 — Core Web Vitals / Mobile-Performance

- Mobile Perf **53**, LCP **~14,8 s** (Cookie-Banner nach Hydration), siehe
  `project_pagespeed_baseline` + `project_bundle_findings`.
- CWV ist **bestätigter Ranking-Faktor**; Google betont 2026 explizit, dass
  _Bildschärfe/-qualität_ die Klickrate im Text-Snippet beeinflusst.
- **Schon im Backlog**, hier nur als SEO-Priorität markiert: LCP < 2,5 s anstreben,
  TBT senken (framer-motion/Sentry-Bundle), Cookie-Banner nicht render-blockierend.

#### H3 — Kein Image-Sitemap

- Google empfiehlt für Bildersuche & Recipe-Rich-Results einen dedizierten
  Image-Sitemap. Rezeptbilder existieren aktuell nur im JSON-LD, nicht im Sitemap.
- **Umsetzung:** pro Rezept-`<url>` ein `<image:image>`-Eintrag mit der
  `16:9`-Thumbnail-URL. Next.js' `MetadataRoute.Sitemap` unterstützt das Feld
  `images` nativ (`{ url, lastModified, images: [imgUrl] }`).

### 🟡 MITTEL — solide Verbesserungen

#### M1 — Sitemap: `force-dynamic` + fehlende `lastModified`

- `export const dynamic = 'force-dynamic'` → Sitemap wird bei **jedem** Crawler-Hit
  neu generiert (Filesystem-Glob + 6 DB-Queries über 2.291 Zeilen). Kein Caching.
    - **Fix:** auf `export const revalidate = 3600` umstellen. ISR generiert beim
      ersten Request **zur Laufzeit** (nicht zur Build-Zeit → DB-Problem bleibt gelöst),
      cached danach 1 h. Entlastet DB & macht das Warming-Skript fast überflüssig.
- `tag`- und `zutat`-Routen haben **kein** `lastModified` → Google kann Frische
  nicht einschätzen. `recipe.updatedAt` der jüngsten passenden Rezepte mitgeben.

#### M2 — GEO / FAQ-Schema fehlt (AI-Search 2026)

- Kein `FAQPage`-Schema. Laut Princeton-GEO-Research ist FAQ-JSON-LD der
  **wirkungsvollste** Markup-Typ für Zitierbarkeit in AI Overviews / ChatGPT /
  Perplexity (jedes Q&A = Zitat-Kandidat).
- **Idee:** Auf Rezeptseiten 2–4 generische/automatische FAQs ("Wie lange dauert
  X?", "Kann ich X vorbereiten?", "Wie viele Portionen?") aus vorhandenen Daten
  als `FAQPage` rendern.

#### M3 — Faceted Search `/recipes` Crawl-Budget

- `/recipes` ist `index:true`, Canonical zeigt korrekt auf `/recipes` (gut gegen
  Duplicate Content). Filter laufen offenbar client-seitig (keine `<a href>` mit
  `?q=`/Filter gefunden) → **vermutlich unkritisch**.
- **Verifizieren:** sicherstellen, dass Filter-/Sortier-Links nicht als crawlbare
  `?param=`-URLs ausgegeben werden. Falls doch: `rel="nofollow"` oder Disallow
  der Parameter-Muster in `robots.ts`.

#### M4 — PWA-Manifest dünn

- `manifest.json`: nur **ein** Icon (512px) als `"any maskable"` (Anti-Pattern —
  maskable braucht Safe-Zone-Padding). Empfehlung: getrennte `any`- und
  `maskable`-Icons, zusätzlich 192px, plus `screenshots` für reichere Install-UI.

#### M5 — Title-/Description-Optimierung Rezepte

- Recipe-`<title>` = nur `recipe.title` (z. B. "Lasagne"). Für Long-Tail besser
  templatisieren, z. B. `"{title} Rezept"` oder `"{title} – einfach & Schritt für
Schritt"`, solange < 60 Zeichen. Kategorie macht das bereits gut ("X Rezepte").

### 🟢 NIEDRIG / Zukunft

- **N1 — `llms.txt`** (emerging, optional): Root-Datei, die AI-Crawlern Prioritäts-
  Seiten signalisiert. Google sagt: _nicht nötig_, aber günstig mitzunehmen.
- **N2 — Video-Schema**, falls künftig Rezeptvideos: `VideoObject` im Recipe-JSON-LD.
- **N3 — hreflang**: aktuell nur `de-DE` → erst bei Internationalisierung relevant.
- **N4 — E-E-A-T / Autoren**: `Person`-Schema vorhanden, aber ohne `sameAs`/Bio.
  Für Trust-Signale Autorenprofile mit Bio + Social-Links anreichern.
- **N5 — Sitemap-Index via `generateSitemaps`**: erst nötig ab ~50k URLs/Typ.

---

## 3. Indexing-Tools — Empfehlung

| Tool                                        | Kosten | Wofür                                                                                        | Priorität   |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- | ----------- |
| **Google Search Console**                   | gratis | Sitemap einreichen, Coverage/Index-Status, CWV, Rich-Results-Report, manuelle URL-Inspektion | **Pflicht** |
| **Bing Webmaster Tools**                    | gratis | Index für Bing — **speist ChatGPT-Search & Copilot**                                         | **Pflicht** |
| **IndexNow**                                | gratis | Instant-Push an Bing/Yandex/Naver/Seznam bei Publish/Update                                  | **Hoch**    |
| Google Rich Results Test / Schema Validator | gratis | Markup verifizieren (vor jedem Release)                                                      | Hoch        |
| GSC URL-Inspection-API                      | gratis | On-Demand-Reindex einzelner Google-URLs (Quota-limitiert)                                    | Optional    |
| Google Indexing API                         | gratis | **Offiziell nur** JobPosting/BroadcastEvent — für Rezepte Grauzone, **nicht empfohlen**      | Nein        |
| Ahrefs / Semrush                            | $$     | Rank-Tracking, Backlinks, Keyword-Recherche                                                  | Später      |
| LLMrefs / Profound                          | $$     | GEO-/AI-Citation-Tracking                                                                    | Später      |

### Warum IndexNow (und nicht Google Indexing API)

- **Google unterstützt IndexNow nicht** (Stand 2026) und beschränkt die Indexing
  API offiziell auf Stellenanzeigen/Live-Events. Für Google bleibt: **guter
  Sitemap + interne Verlinkung + GSC**.
- **IndexNow** ist ein simpler, kostenloser Push: ein API-Call benachrichtigt
  Bing, Yandex, Naver, Seznam gleichzeitig. Für KochTakt relevant, weil Bing
  ChatGPT-Search & Copilot füttert. Kein Rate-Limit-Stress, kein Multi-Endpoint.

### Konkrete IndexNow-Umsetzung (Next.js)

1. **Key-Datei**: 32-stelligen Hex-Key generieren, als `public/<key>.txt`
   ablegen (Inhalt = der Key selbst). Erreichbar unter `kochtakt.de/<key>.txt`.
2. **Helper** `src/lib/seo/indexnow.ts`:
    ```ts
    export async function pingIndexNow(urls: string[]) {
        if (process.env.NODE_ENV !== 'production') return;
        await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: 'kochtakt.de',
                key: process.env.INDEXNOW_KEY,
                keyLocation: `https://kochtakt.de/${process.env.INDEXNOW_KEY}.txt`,
                urlList: urls,
            }),
        }).catch(() => {}); // best-effort, nie den Request blockieren
    }
    ```
3. **Trigger**: in `createActions.ts` nach erfolgreichem Publish/Update
   `pingIndexNow([\`${APP_URL}/recipe/${slug}\`])` aufrufen (fire-and-forget).
   Key via Infisical/Flipt-konformes Env (kein Feature-Flag, nur Secret).

> **Google-Pendant**: Statt riskanter Indexing API lieber bei Publish die
> GSC-URL-Inspection-API mit `INDEX_REQUEST` aufrufen (OAuth-Service-Account,
> Quota ~ wenige hundert/Tag) — optional, nur bei Bedarf.

---

## 4. GEO / AI-Search (2026-Kontext)

- Google-Position (Mai 2026): _"Optimizing for generative AI is still SEO."_
  `llms.txt`, AI-spezifisches Markup oder Content-Rewriting sind **nicht nötig** —
  dieselben Grundlagen zählen (nützlicher Content, crawlbar, klare Struktur).
- **Wirkung-Hebel für Zitierbarkeit** (Princeton-GEO-Studie, +30–40 % Sichtbarkeit):
  Statistiken/Zahlen, Zitate, klare Strukturierung — und **FAQ-Schema** (siehe M2).
- KochTakt ist durch sauberes JSON-LD + crawlbare Struktur bereits gut für AI-Search
  aufgestellt; FAQ-Schema + Bing/IndexNow wären die nächsten konkreten Schritte.

---

## 5. Maßnahmenplan (empfohlene Reihenfolge)

**Quick Wins (Stunden, hohe Wirkung)**

1. GSC + Bing Webmaster Tools anlegen, Property verifizieren (`metadata.verification`
   oder DNS-TXT), Sitemap einreichen.
2. Sitemap `force-dynamic` → `revalidate = 3600`; `lastModified` für Tag/Zutat ergänzen.
3. IndexNow-Key + Helper + Ping bei Recipe-Publish/Update.

**Mittelfristig (Tage)** 4. Image-Sitemap (`images`-Feld pro Rezept-URL). 5. CWV-Quick-Fixes: LCP-Killer (Cookie-Banner), TBT/Bundle (framer-motion, Sentry). 6. FAQ-Schema auf Rezeptseiten (GEO). 7. Recipe-Title templatisieren ("{title} Rezept").

**Langfristig / optional** 8. PWA-Manifest aufwerten (Icons, Screenshots). 9. E-E-A-T: Autorenprofile mit Bio + `sameAs`. 10. `llms.txt`, Video-Schema, Sitemap-Index — bei Bedarf/Wachstum.

---

## 6. Quellen (Web-Recherche 2026-06-20)

- [Google: Recipe Structured Data Ranking-Kriterium (Search Engine Journal)](https://www.searchenginejournal.com/googles-update-to-recipe-structured-data-confirms-a-ranking-criteria/548559/)
- [Structured Data SEO 2026 — Rich Results Guide (Digital Applied)](https://www.digitalapplied.com/blog/structured-data-seo-2026-rich-results-guide)
- [SEO for Recipes (recipecard.io)](https://recipecard.io/blog/seo-for-recipes/)
- [IndexNow vs Google Indexing API vs Sitemaps (CrawlWP)](https://crawlwp.com/indexnow-vs-google-indexing-api-vs-sitemaps/)
- [Google Indexing API vs IndexNow — 2026 Data-Driven (Şimşek)](https://abdurrahmansimsek.com/google-indexing-api-vs-indexnow-2026/)
- [Next.js generateSitemaps (offizielle Docs)](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps)
- [GEO 2026 Guide (Frase.io)](https://www.frase.io/blog/what-is-generative-engine-optimization-geo)
- [GEO — Get cited by ChatGPT & AI Overviews (TechTimes)](https://www.techtimes.com/articles/318359/20260614/generative-engine-optimization-geo-2026-how-get-your-content-cited-chatgpt-ai-overviews.htm)
