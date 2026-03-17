# Top Rezept-Websites in Deutschland -- Marktanalyse fuer Scraper-Priorisierung

Stand: Maerz 2026 | Datenquellen: Semrush (Feb 2026), SimilarWeb, BuiltWith, recipe-scrapers Library

---

## Zusammenfassung

Die deutsche Rezept-Landschaft wird von chefkoch.de dominiert (24M+ Visits/Monat). Dahinter
kaempfen Food-Blogs (emmikochteinfach, einfachbacken, gaumenfreundin) und Supermarkt-Portale
(rewe.de, edeka.de) um die Plaetze 2-8. Der Trend geht klar zu: WordPress-Blogs mit
WP Recipe Maker Plugin und schema.org JSON-LD Structured Data -- das ist gut fuer uns.

### Scraper-Priorisierung (Empfehlung)

| Prioritaet        | Seiten                                                                      | Grund                                                         |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| P0 (bereits)      | chefkoch.de, lecker.de, essen-und-trinken.de, edeka.de, dr-oetker.de        | Bereits implementiert                                         |
| P1 (naechste)     | emmikochteinfach.de, einfachbacken.de, rewe.de                              | Top-Traffic, schema.org JSON-LD, WordPress/einfach zu scrapen |
| P2 (danach)       | familienkost.de, gaumenfreundin.de, hellofresh.de, kitchenstories.com       | Solider Traffic, gute Datenqualitaet                          |
| P3 (nice-to-have) | kochbar.de, biancazapatka.com, backenmachtgluecklich.de, leckerschmecker.me | Kleiner Traffic, aber gute Nischen                            |
| Social            | YouTube, Instagram, TikTok                                                  | Eigene Strategie noetig (API/Embed, kein klassischer Scraper) |

---

## Top Rezept-Websites: Vollstaendige Analyse

### 1. chefkoch.de

| Merkmal                       | Details                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Monatliche Besucher**       | ~24-44M (schwankt saisonal; Feb 2026: 24M laut Semrush, Herbst 2025: 38-44M)                                                                                                                                                                     |
| **Betreiber**                 | Chefkoch GmbH (Gruner + Jahr / RTL Group)                                                                                                                                                                                                        |
| **Rezeptanzahl**              | 370.000+                                                                                                                                                                                                                                         |
| **Rezeptstruktur**            | Zutaten (Liste), Zubereitungsschritte (Freitext), Nutzer-Bilder, Bewertungen, Kommentare                                                                                                                                                         |
| **Schema.org**                | Ja, JSON-LD Recipe Markup                                                                                                                                                                                                                        |
| **App**                       | Ja, iOS + Android (10M+ Downloads Android)                                                                                                                                                                                                       |
| **Video-Content**             | Ja, YouTube-Kanal + eingebettete Videos auf der Seite                                                                                                                                                                                            |
| **Technische Besonderheiten** | **STARKER Anti-Bot-Schutz**: Custom CAPTCHA-System (Bild-Matching + Proof-of-Work), kein Cloudflare aber eigene Bot-Detection. Scraping mit normalem HTTP-Client schlaegt fehl -- braucht Headless Browser mit stealth. WebFetch wird blockiert. |
| **recipe-scrapers**           | Ja, unterstuetzt                                                                                                                                                                                                                                 |
| **Scraper-Schwierigkeit**     | HOCH -- Anti-Bot ist aggressiv                                                                                                                                                                                                                   |

---

### 2. emmikochteinfach.de

| Merkmal                       | Details                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~9.2M (Semrush Feb 2026)                                                                                                                                                                |
| **Betreiber**                 | Christiane Emma (Food-Bloggerin)                                                                                                                                                        |
| **Rezeptstruktur**            | Zutaten (strukturierte Liste), Schritte (nummeriert mit Bildern), Naehrwerte, Portionen, Druckansicht                                                                                   |
| **Schema.org**                | Ja, JSON-LD via WP Recipe Maker Plugin                                                                                                                                                  |
| **App**                       | Nein (nur Web, responsive)                                                                                                                                                              |
| **Video-Content**             | YouTube-Kanal, Instagram (525K Follower), Pinterest                                                                                                                                     |
| **Technische Besonderheiten** | **WordPress** + WP Recipe Maker (WPRM) Plugin + Bootstrap 5. CDN fuer Bilder. Kein nennenswerter Anti-Bot-Schutz. Cookie-basiertes Tracking. Sehr scraper-freundlich dank WPRM JSON-LD. |
| **recipe-scrapers**           | Ja, unterstuetzt                                                                                                                                                                        |
| **Scraper-Schwierigkeit**     | NIEDRIG -- Standard WordPress + JSON-LD                                                                                                                                                 |

---

### 3. einfachbacken.de

| Merkmal                       | Details                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Monatliche Besucher**       | ~8.6M (Semrush Feb 2026)                                                                                     |
| **Betreiber**                 | BurdaVerlag GmbH (Burda-Gruppe)                                                                              |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, Schwierigkeitsgrad, Zubereitungszeit                                              |
| **Schema.org**                | Ja, JSON-LD                                                                                                  |
| **App**                       | Ja, iOS + Android (seit 2025, 10K+ Downloads)                                                                |
| **Video-Content**             | YouTube, Instagram, TikTok                                                                                   |
| **Technische Besonderheiten** | Server-seitig gerendert, Burda-Medien-Infrastruktur. Consent-Management fuer DSGVO. Moderate Bot-Protection. |
| **recipe-scrapers**           | Nicht direkt in der Liste (aber Schema.org JSON-LD vorhanden = wild_mode sollte funktionieren)               |
| **Scraper-Schwierigkeit**     | MITTEL                                                                                                       |

---

### 4. rewe.de/rezepte

| Merkmal                       | Details                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~14.4M gesamt (Rezepte sind Teilbereich, aber grosser Traffic-Treiber)                                                                          |
| **Betreiber**                 | REWE Markt GmbH                                                                                                                                 |
| **Rezeptanzahl**              | 10.000+                                                                                                                                         |
| **Rezeptstruktur**            | Zutaten (mit Mengenangaben), Schritte (nummeriert), Naehrwerte, "Zum Warenkorb hinzufuegen"-Button                                              |
| **Schema.org**                | Ja, JSON-LD                                                                                                                                     |
| **App**                       | Ja (REWE-App, primaer fuer Einkauf, Rezepte integriert)                                                                                         |
| **Video-Content**             | YouTube-Kanal, Social Media                                                                                                                     |
| **Technische Besonderheiten** | Modernes Frontend (vermutlich React/Next.js), API-getrieben. Rezepte sind tief in die E-Commerce-Plattform integriert. Mittlere Bot-Protection. |
| **recipe-scrapers**           | Ja, unterstuetzt                                                                                                                                |
| **Scraper-Schwierigkeit**     | MITTEL                                                                                                                                          |

---

### 5. familienkost.de

| Merkmal                       | Details                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~5.4M (Semrush Feb 2026)                                                |
| **Betreiber**                 | Jenny Bohme (Food-Bloggerin, Familien-Fokus)                            |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, kinderfreundliche Kategorien                 |
| **Schema.org**                | Ja, JSON-LD (WordPress + Recipe Plugin)                                 |
| **App**                       | Nein                                                                    |
| **Video-Content**             | YouTube, Instagram, Pinterest                                           |
| **Technische Besonderheiten** | WordPress-Blog. Kein nennenswerter Anti-Bot-Schutz. Scraper-freundlich. |
| **recipe-scrapers**           | Nicht in der Liste (wild_mode moeglich)                                 |
| **Scraper-Schwierigkeit**     | NIEDRIG                                                                 |

---

### 6. edeka.de/rezepte

| Merkmal                       | Details                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~4.8M gesamt (Rezepte sind Teilbereich)                                               |
| **Betreiber**                 | EDEKA Zentrale Stiftung & Co. KG                                                      |
| **Rezeptanzahl**              | 6.000+                                                                                |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, Naehrwerte, Schwierigkeitsgrad                             |
| **Schema.org**                | Ja, JSON-LD                                                                           |
| **App**                       | Ja (EDEKA-App, primaer Angebote, Rezepte integriert)                                  |
| **Video-Content**             | YouTube ("Yumtamtam"), Instagram, TikTok                                              |
| **Technische Besonderheiten** | Java-basiertes Backend (.jsp URLs). Server-seitig gerendert. Moderate Bot-Protection. |
| **recipe-scrapers**           | Nicht in der Liste                                                                    |
| **Scraper-Schwierigkeit**     | MITTEL                                                                                |

---

### 7. lecker.de

| Merkmal                       | Details                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~4.1M (Semrush Feb 2026)                                                                                                                                                               |
| **Betreiber**                 | Bauer Xcel Media Deutschland KG (Hamburg, seit 1985)                                                                                                                                   |
| **Rezeptanzahl**              | 60.000+                                                                                                                                                                                |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, Schwierigkeitsgrad, Zubereitungszeit, Naehrwerte                                                                                                            |
| **Schema.org**                | Ja, umfangreiches JSON-LD (Organization, Website, SearchAction, Recipe)                                                                                                                |
| **App**                       | Ja, iOS + Android (500K+ Downloads)                                                                                                                                                    |
| **Video-Content**             | YouTube, Instagram, Reels                                                                                                                                                              |
| **Technische Besonderheiten** | Custom CMS (kein WordPress/React/Vue). Server-seitig gerendert. CDN via cdn.lecker.de. Nielsen-Tracking. Sourcepoint DSGVO-Consent. "bx-"-CSS-Klassen (proprietaer). Molten Ad-System. |
| **recipe-scrapers**           | Ja, unterstuetzt                                                                                                                                                                       |
| **Scraper-Schwierigkeit**     | MITTEL                                                                                                                                                                                 |

---

### 8. gaumenfreundin.de

| Merkmal                       | Details                                                |
| ----------------------------- | ------------------------------------------------------ |
| **Monatliche Besucher**       | ~4.7M (Semrush Feb 2026)                               |
| **Betreiber**                 | Steffi Sinzenich (Food-Bloggerin, Familien/Low-Carb)   |
| **Rezeptanzahl**              | 1.000+                                                 |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, Portionen, Zubereitungszeit |
| **Schema.org**                | Ja, JSON-LD (WordPress + Recipe Plugin)                |
| **App**                       | Nein                                                   |
| **Video-Content**             | YouTube, Instagram, Pinterest, TikTok                  |
| **Technische Besonderheiten** | WordPress-Blog. Sehr scraper-freundlich.               |
| **recipe-scrapers**           | Nicht in der Liste (wild_mode moeglich)                |
| **Scraper-Schwierigkeit**     | NIEDRIG                                                |

---

### 9. leckerschmecker.me

| Merkmal                       | Details                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Monatliche Besucher**       | ~3.9M (Semrush Feb 2026)                                                             |
| **Betreiber**                 | Media Partisans GmbH (Teil des heftig.co-Netzwerks)                                  |
| **Rezeptstruktur**            | Zutaten, Schritte (oft als Listicle/Story), sehr bildlastig                          |
| **Schema.org**                | Teilweise                                                                            |
| **App**                       | Nein                                                                                 |
| **Video-Content**             | Facebook-Videos, YouTube, Instagram (Viral-Content-Fokus)                            |
| **Technische Besonderheiten** | Viraler Content-Stil, viel Social-Traffic. WordPress-basiert. Starke Ad-Integration. |
| **recipe-scrapers**           | Ja, unterstuetzt                                                                     |
| **Scraper-Schwierigkeit**     | NIEDRIG-MITTEL                                                                       |

---

### 10. kochbar.de

| Merkmal                       | Details                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~3.0M (Semrush Feb 2026)                                               |
| **Betreiber**                 | RTL interactive GmbH                                                   |
| **Rezeptstruktur**            | Zutaten, Schritte mit Fotos (User-Generated wie Chefkoch), Bewertungen |
| **Schema.org**                | Ja, JSON-LD                                                            |
| **App**                       | Nicht mehr aktiv gepflegt                                              |
| **Video-Content**             | Eingebettete Videos, YouTube                                           |
| **Technische Besonderheiten** | Hohe Bounce-Rate (87.6%). RTL-Infrastruktur. Moderate Bot-Protection.  |
| **recipe-scrapers**           | Ja, unterstuetzt                                                       |
| **Scraper-Schwierigkeit**     | MITTEL                                                                 |

---

### 11. essen-und-trinken.de

| Merkmal                       | Details                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Monatliche Besucher**       | ~2.3M (Semrush Feb 2026)                                                 |
| **Betreiber**                 | Gruner + Jahr / RTL Group                                                |
| **Rezeptstruktur**            | Zutaten, Schritte, professionelle Bilder, Naehrwerte                     |
| **Schema.org**                | Ja, JSON-LD                                                              |
| **App**                       | Nein (nur Web)                                                           |
| **Video-Content**             | YouTube, eingebettete Videos                                             |
| **Technische Besonderheiten** | Gleiche Infrastruktur wie Chefkoch (RTL Group). Moderate Bot-Protection. |
| **recipe-scrapers**           | Nicht in der Liste                                                       |
| **Scraper-Schwierigkeit**     | MITTEL                                                                   |

---

### 12. dr-oetker.de (oetker.de)

| Merkmal                       | Details                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~1-2M (geschaetzt, nicht in Semrush Top 20)                                        |
| **Betreiber**                 | Dr. August Oetker Nahrungsmittel KG                                                |
| **Rezeptstruktur**            | Zutaten, Schritte, professionelle Bilder, Schwierigkeitsgrad, Naehrwerte           |
| **Schema.org**                | Ja, JSON-LD                                                                        |
| **App**                       | Ja, iOS + Android ("Dr. Oetker Rezeptideen")                                       |
| **Video-Content**             | YouTube, Instagram, TikTok                                                         |
| **Technische Besonderheiten** | Headless CMS (Hygraph/GraphCMS laut Case Study). Modernes Frontend. API-getrieben. |
| **recipe-scrapers**           | Nicht in der Liste                                                                 |
| **Scraper-Schwierigkeit**     | MITTEL (API-basiert, aber Schema.org vorhanden)                                    |

---

### 13. hellofresh.de

| Merkmal                       | Details                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Monatliche Besucher**       | ~1.7M (Semrush Feb 2026)                                                                                                                  |
| **Betreiber**                 | HelloFresh SE (Berlin)                                                                                                                    |
| **Rezeptstruktur**            | Sehr strukturiert: Zutaten mit exakten Mengen, nummerierte Schritte mit Bildern, Naehrwerte, Allergene                                    |
| **Schema.org**                | Ja, JSON-LD + API-Daten im HTML eingebettet                                                                                               |
| **App**                       | Ja, iOS + Android (primaer Abo-Service)                                                                                                   |
| **Video-Content**             | YouTube, Instagram, TikTok                                                                                                                |
| **Technische Besonderheiten** | React SPA. API-basiert (JSON im HTML). Auth-Header fuer API noetig. Rezepte teilweise hinter Login. Gute Datenqualitaet wenn zugaenglich. |
| **recipe-scrapers**           | Ja, unterstuetzt                                                                                                                          |
| **Scraper-Schwierigkeit**     | MITTEL-HOCH (Login-Wall fuer manche Rezepte)                                                                                              |

---

### 14. biancazapatka.com

| Merkmal                       | Details                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| **Monatliche Besucher**       | ~1.7M (Semrush Feb 2026)                                   |
| **Betreiber**                 | Bianca Zapatka (Vegane Food-Bloggerin)                     |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, Naehrwerte, vegan-Kennzeichnung |
| **Schema.org**                | Ja, JSON-LD (WordPress + WP Recipe Maker)                  |
| **App**                       | Nein                                                       |
| **Video-Content**             | YouTube, Instagram (1M+ Follower), TikTok (stark)          |
| **Technische Besonderheiten** | WordPress + WPRM. Kein Anti-Bot. Mehrsprachig (DE/EN).     |
| **recipe-scrapers**           | Ja, unterstuetzt                                           |
| **Scraper-Schwierigkeit**     | NIEDRIG                                                    |

---

### 15. backenmachtgluecklich.de

| Merkmal                       | Details                                       |
| ----------------------------- | --------------------------------------------- |
| **Monatliche Besucher**       | ~2.3M (Semrush Feb 2026)                      |
| **Betreiber**                 | Kathrin (Food-Bloggerin, Backfokus)           |
| **Rezeptstruktur**            | Zutaten, Schritte, Bilder, Tipps, Bewertungen |
| **Schema.org**                | Ja, JSON-LD (WordPress + Recipe Plugin)       |
| **App**                       | Nein                                          |
| **Video-Content**             | YouTube, Instagram, Pinterest                 |
| **Technische Besonderheiten** | WordPress-Blog. Einfach zu scrapen.           |
| **recipe-scrapers**           | Nicht in der Liste (wild_mode moeglich)       |
| **Scraper-Schwierigkeit**     | NIEDRIG                                       |

---

## Social-Media-Plattformen als Rezeptquellen

### YouTube (Rezepte deutsch)

| Merkmal             | Details                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Relevanz**        | SEHR HOCH -- Laengere Koch-Tutorials, Schritt-fuer-Schritt                                                                   |
| **Top-Kanaele DE**  | Sally's Welt (2M+ Subs), Esslust, CookingWithStefano, Kitchen Stories                                                        |
| **Rezeptstruktur**  | Video + Beschreibung (oft unstrukturiert), manche nutzen Chapters                                                            |
| **Scraping-Ansatz** | YouTube Data API v3 (kostenlos, Quota-Limits). Beschreibungstext parsen. Alternativ: yt-dlp fuer Metadaten. Kein Schema.org. |
| **Schwierigkeit**   | MITTEL -- API verfuegbar, aber Rezeptdaten unstrukturiert in Beschreibung                                                    |

### Instagram (Reels/Posts)

| Merkmal             | Details                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Relevanz**        | HOCH -- Groesste Food-Influencer-Plattform, Reels dominieren                                                                                                                                   |
| **Top-Accounts DE** | @foodwerk.de (1.1M), @emmikochteinfach (525K), @biancazapatka, @fruehlingszwiebel\_ (792K)                                                                                                     |
| **Rezeptstruktur**  | Bild/Video + Caption (Freitext mit Zutaten/Schritte). Kein Standard-Format.                                                                                                                    |
| **Scraping-Ansatz** | Instagram Basic Display API (eingeschraenkt), Meta Graph API (Business-Accounts). Scraping gegen ToS und technisch schwierig (Login-Wall). Kitchen Stories bietet Rezept-Import aus Instagram. |
| **Schwierigkeit**   | SEHR HOCH -- Anti-Scraping aggressiv, Login-Wall, API-Einschraenkungen                                                                                                                         |

### TikTok

| Merkmal             | Details                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Relevanz**        | HOCH -- Schnellwachsend, juengere Zielgruppe, virale Rezepte                                                                                           |
| **Top-Accounts DE** | @foodie.beats (2.9M), @melikes.kitchen (1.1M), @biancazapatka                                                                                          |
| **Rezeptstruktur**  | Kurzvideo (15-60s) + Caption. Rezept meist nur im Video (nicht als Text).                                                                              |
| **Scraping-Ansatz** | TikTok API for Developers (sehr eingeschraenkt). Scraping technisch moeglich aber gegen ToS. Rezeptdaten muessen aus Video extrahiert werden (OCR/AI). |
| **Schwierigkeit**   | EXTREM HOCH -- Rezeptdaten im Video, kein Text-Scraping moeglich                                                                                       |

---

## Technische Muster und Empfehlungen

### Schema.org JSON-LD ist der Goldstandard

Fast alle relevanten Rezept-Websites implementieren schema.org/Recipe als JSON-LD im HTML.
Das bedeutet: **Ein generischer JSON-LD-Parser deckt 80% der Seiten ab.**

Typische Felder im JSON-LD:

```json
{
    "@type": "Recipe",
    "name": "...",
    "image": ["..."],
    "author": { "@type": "Person", "name": "..." },
    "datePublished": "...",
    "description": "...",
    "prepTime": "PT20M",
    "cookTime": "PT30M",
    "totalTime": "PT50M",
    "recipeYield": "4 Portionen",
    "recipeCategory": "Hauptgericht",
    "recipeCuisine": "Deutsch",
    "recipeIngredient": ["200g Mehl", "3 Eier", "..."],
    "recipeInstructions": [{ "@type": "HowToStep", "text": "..." }],
    "nutrition": { "@type": "NutritionInformation", "calories": "450 kcal" }
}
```

### Website-Typen und Scraping-Strategien

| Typ                       | Beispiele                                                                            | Strategie                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **WordPress + WPRM**      | emmikochteinfach, biancazapatka, familienkost, gaumenfreundin, backenmachtgluecklich | JSON-LD aus HTML parsen. Sehr zuverlaessig und konsistent.                       |
| **Verlagsportale**        | lecker.de, essen-und-trinken.de, einfachbacken.de                                    | JSON-LD vorhanden, aber Custom CMS. Braucht evtl. seitenspezifische Anpassungen. |
| **Supermaerkte**          | rewe.de, edeka.de                                                                    | JSON-LD + Zutat-zu-Warenkorb-Funktion. Gut strukturierte Daten.                  |
| **Community-Plattformen** | chefkoch.de, kochbar.de                                                              | JSON-LD vorhanden, aber Anti-Bot-Schutz. Braucht Headless Browser.               |
| **Abo-Services**          | hellofresh.de                                                                        | API-basiert, teilweise Login-Wall. Sehr gute Datenqualitaet wenn zugaenglich.    |
| **Marken-Websites**       | dr-oetker.de                                                                         | Headless CMS, JSON-LD vorhanden.                                                 |

### Empfohlene Architektur fuer den Scraper

1. **Generischer JSON-LD-Parser** als Basis (schema.org/Recipe)
2. **Site-spezifische Selektoren** nur wo JSON-LD fehlt oder unvollstaendig ist
3. **Headless Browser** (Playwright/Puppeteer) nur fuer bot-geschuetzte Seiten (chefkoch.de)
4. **recipe-scrapers Python Library** als Referenz/Fallback -- unterstuetzt 18+ deutsche Seiten
5. **URL-Normalisierung** pro Domain (verschiedene URL-Patterns)

### Existierende Open-Source-Tools

| Tool                                                                   | Sprache | Deutsche Seiten                                  | Hinweis                                     |
| ---------------------------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------------------------- |
| [recipe-scrapers](https://github.com/hhursev/recipe-scrapers)          | Python  | 18+ (chefkoch, lecker, kochbar, emmi, rewe, ...) | 620+ Seiten total, aktiv gepflegt           |
| [hhursev/recipe-scrapers wild_mode](https://docs.recipe-scrapers.com/) | Python  | Generisch                                        | Fallback fuer unbekannte Seiten via JSON-LD |
| Apify Recipes Scraper                                                  | Cloud   | Generisch                                        | Kommerziell, hosted                         |

---

## Traffic-Ranking Zusammenfassung (Semrush, Feb 2026)

| Rang | Domain                   | Monatl. Visits     | Bounce Rate | Typ                                |
| ---- | ------------------------ | ------------------ | ----------- | ---------------------------------- |
| 1    | chefkoch.de              | 24.1M              | 64.3%       | Community-Portal                   |
| 2    | rewe.de\*                | 14.4M              | 55.6%       | Supermarkt (Rezepte = Teilbereich) |
| 3    | emmikochteinfach.de      | 9.2M               | 79.9%       | WordPress Food-Blog                |
| 4    | einfachbacken.de         | 8.6M               | 80.0%       | Verlagsportal (Burda)              |
| 5    | familienkost.de          | 5.4M               | 72.8%       | WordPress Food-Blog                |
| 6    | edeka.de\*               | 4.8M               | 63.6%       | Supermarkt (Rezepte = Teilbereich) |
| 7    | gaumenfreundin.de        | 4.7M               | 71.4%       | WordPress Food-Blog                |
| 8    | lecker.de                | 4.1M               | 78.5%       | Verlagsportal (Bauer)              |
| 9    | leckerschmecker.me       | 3.9M               | 77.7%       | Viral-Content                      |
| 10   | kochbar.de               | 3.0M               | 87.6%       | Community-Portal (RTL)             |
| 11   | backenmachtgluecklich.de | 2.3M               | 71.6%       | WordPress Food-Blog                |
| 12   | essen-und-trinken.de     | 2.3M               | 79.5%       | Verlagsportal (RTL)                |
| 13   | hellofresh.de            | 1.7M               | 73.5%       | Abo-Service                        |
| 14   | biancazapatka.com        | 1.7M               | 69.7%       | WordPress Food-Blog (vegan)        |
| 15   | dr-oetker.de             | ~1-2M (geschaetzt) | --          | Marken-Website                     |

\*rewe.de und edeka.de: Gesamttraffic, Rezepte sind ein Teilbereich

---

## Naechste Schritte

1. **Generischen JSON-LD-Parser bauen** -- deckt sofort alle WordPress-Blogs ab
2. **emmikochteinfach.de + einfachbacken.de** als naechste Ziele (hoher Traffic, einfach zu scrapen)
3. **rewe.de** einbinden (bereits in recipe-scrapers unterstuetzt)
4. **chefkoch.de Headless-Browser** verbessern (bestehende Implementierung haerten gegen Bot-Detection)
5. **Social-Media**: Kein klassischer Scraper moeglich. Stattdessen URL-Import durch Nutzer erwaegen (wie Kitchen Stories es macht).
