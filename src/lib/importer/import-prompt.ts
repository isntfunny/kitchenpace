/**
 * Prompt core of the recipe import (KUC-115, spike variant G2M-1).
 *
 * One request builds metadata, ingredients and the cooking flow. The model
 * writes ingredient mentions itself (`@[Text](ingredient-N)`), so no name
 * search is needed afterwards. The flow part is shared with the flow-only
 * refresh of existing recipes (scripts/refresh-recipe-flows.ts): same rules,
 * fixed ingredient list.
 *
 * Request bodies are built here for both the direct call and the Batch API so
 * the two paths can never drift apart. No Next.js dependencies.
 */

import type OpenAI from 'openai';

import { AI_TEXT_MODEL } from '@shared/ai-models';

import { getFlowOnlyResponseFormat, getOpenAIResponseFormat } from './openai-recipe-schema';

export const IMPORT_CATEGORIES = [
    'Hauptgericht',
    'Beilage',
    'Backen',
    'Dessert',
    'Frühstück',
    'Getränk',
    'Vorspeise',
    'Salat',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt sections
// ─────────────────────────────────────────────────────────────────────────────

const META_SECTIONS = `# Wofür die Stammdaten da sind
- Titel und Beschreibung stehen auf der Rezeptkarte und in der Suche. Sie sollen das Gericht ehrlich und appetitlich beschreiben.
- Kategorien, Tags, Schwierigkeit und Zeiten sind Filter. Ein Filter ist nur nützlich, wenn er zuverlässig stimmt und viele Rezepte denselben Begriff tragen.
- Die Zutaten werden mit einem Zutatenkatalog verknüpft. Darüber laufen Einkaufsliste, Nährwerte, Haltbarkeit und die Zutatensuche.

Alles auf Deutsch; fremdsprachige Rezepte übersetzt du vollständig.

# Titel
Der Name des Gerichts, so wie die Quelle es nennt. Ohne Autor, Website oder Zusätze wie "von …", "Rezept", "einfach & lecker", weil die nichts über das Gericht sagen. Höchstens 80 Zeichen.

# Beschreibung
Ein bis drei Sätze: was für ein Gericht es ist, was es ausmacht (Geschmack, Konsistenz, Besonderheit der Zubereitung) und wozu es passt. Nur was aus der Quelle hervorgeht; keine Arbeitsschritte, keine Versprechen, die das Rezept nicht hält.

# Bild
imageUrl: die URL des Hauptbilds des Rezepts aus dem Markdown (og:image, großes Rezeptbild, Markdown-Bild). Keine Logos, Icons, Werbung oder Bilder anderer Rezepte. null, wenn es keins gibt.

# Kategorien (1–3)
Aus: ${IMPORT_CATEGORIES.join(', ')}. Die erste Kategorie ist die Rolle, die das Gericht in einer Mahlzeit hat (Frühstück, Vorspeise, Hauptgericht, Beilage, Salat, Dessert, Getränk); weitere nur, wenn es dort genauso gesucht würde. "Backen" beschreibt eine Technik, keine Rolle: Vergib es nur, wenn keine Rolle passt (Brot, Brötchen, Kuchen zum Kaffee, Kekse). Ein Gebäck, das man zum Frühstück oder als Dessert isst, bekommt diese Rolle. Grund: Jede zusätzliche Kategorie verwässert die Kategorieseiten.

# Tags (3–10)
Tags sind Filter und Entdeckungswege. Deshalb:
- Nimm Tags AUSSCHLIESSLICH aus der Tag-Liste (separate Nachricht), in genau deren Schreibweise. Erfinde keine neuen Tags; Tags, die nicht in der Liste stehen, werden verworfen.
- Decke die Dimensionen ab, die auf das Rezept wirklich zutreffen: Mahlzeit oder Tageszeit, Anlass, Jahreszeit oder Fest, Küche bzw. Herkunft, Ernährungsform, Charakter, Praktisches (z. B. für Gäste, Vorbereitung möglich).
- Vergib einen Tag nur, wenn jemand, der nach ihm filtert, dieses Rezept erwarten würde. Saison und Fest nur, wenn das Gericht typisch dafür ist; ganzjährige Alltagsgerichte bekommen keine Jahreszeit.
- Ernährungsformen prüfst du gegen jede einzelne Zutat, denn ein falscher Ernährungs-Tag schadet den Menschen, die sich darauf verlassen, und ein fehlender versteckt das Rezept vor ihnen. Es gilt die übliche Bedeutung: vegetarisch heißt ohne Fleisch, Fisch, Meeresfrüchte, Gelatine und daraus gemachte Brühen oder Fonds (Milchprodukte, Käse, Eier und Honig sind erlaubt); vegan heißt zusätzlich ohne Milchprodukte, Eier und Honig. Trifft eine Ernährungsform zu, vergib sie; weglassen nur, wenn eine Zutat wirklich offen lässt, was sie enthält.
- "-frei"-Tags (Glutenfrei, Laktosefrei, Eifrei, Nussfrei, Alkoholfrei) nur, wenn man es bei diesem Gericht nicht erwarten würde (Glutenfrei bei einem Kuchen ohne Mehl, Eifrei bei einer Mousse ohne Ei), nicht, weil die Zutat schlicht fehlt.
- Keine Tags für Schwierigkeit oder Zeit und keine Wiederholung der Kategorie, weil es dafür eigene Filter gibt. Keine Zutaten als Tag und keine Tags, die nur den Namen des Gerichts oder eine allgemeine Tätigkeit wiederholen: Danach filtert niemand.

# Schwierigkeit
Nach dem, was das Rezept von einer Hobbyköchin verlangt, nicht nach der Länge:
- Einfach: wenige Komponenten, Standardtechniken, wenig kann schiefgehen.
- Mittel: mehrere Komponenten, die zeitlich abgestimmt werden müssen, oder Techniken, die Übung brauchen, damit sie gelingen (Hefeteig, Wasserbad, Frittieren, Teig ausrollen oder formen). Etwas einfach einfüllen, schichten oder belegen zählt nicht dazu; zwei Töpfe oder Pfannen gleichzeitig zu führen und zusammenzuführen dagegen schon, weil dabei das Timing zählt.
- Schwer: präzise Temperaturen oder Zeitpunkte, viele Komponenten oder Techniken, die leicht misslingen.

# Zeiten und Portionen
- prepTime: aktive Arbeitszeit, cookTime: Zeit auf dem Herd oder im Ofen, jeweils in Minuten. Nennt die Quelle diese Werte, übernimm sie; sonst schätze sie aus den Arbeitsschritten.
- Ruhe-, Kühl-, Gefrier-, Gär- und Marinierzeiten zählen zu keinem der beiden Werte; sie stehen im Ablauf. Grund: Die App bildet aus beiden die Gesamtzeit und filtert damit nach "schnell".
- servings: Portionen laut Quelle; bei Stückangaben (12 Brötchen, 1 Flasche) die Zahl, die die Quelle nennt.

# Zutaten
- id: "ingredient-0", "ingredient-1", … in der Reihenfolge deiner Liste. Über diese ids verweist der Ablauf auf die Zutaten. Die Zutatenliste steht in der Antwort vorn, damit du beim Schreiben des Ablaufs ihre ids kennst.
- Eine Zeile pro Zeile der Zutatenliste der Quelle, in ihrer Reihenfolge. Nennt eine Zeile mehrere Zutaten, die man alle verwendet ("Salz und Pfeffer"), wird jede ein eigener Eintrag, weil der Katalog nur einzelne Zutaten kennt. Eine Alternative ("Öl oder Butter") bleibt ein Eintrag, die Alternative steht in notes. Kommt eine Zutat für mehrere Komponenten vor, bleibt jede Zeile einzeln, weil der Ablauf sie getrennt verwendet.
- Zutaten, die nur im Zubereitungstext vorkommen, aber verbraucht werden und eingekauft werden müssen (Fett für die Form, Öl zum Frittieren, Mehl zum Bestäuben), ergänzt du am Ende, weil sie sonst auf der Einkaufsliste fehlen. Wasser, das nur Hilfsmittel ist (Wasserbad, Kochwasser zum Abgießen, Eiswasser), ist keine Zutat; Wasser, das ins Gericht kommt, schon.
- name: der reine Name der Zutat ohne Menge und Zubereitung. Gibt es in der Liste der bekannten Zutaten einen Eintrag, der genau diese Zutat meint, verwende ihn in genau dieser Schreibweise, damit die Verknüpfung mit dem Katalog greift. Sonst ein schlichter, allgemein üblicher Name im Singular oder in der handelsüblichen Form ("Mehl", "Zwiebel", "Tomaten, passiert"). Marken oder Sorten nur, wenn sie für das Rezept wichtig sind.
- amount: Zahl (Brüche umrechnen: 1/2 → 0.5; bei Spannen der untere Wert, die Spanne steht in notes), null wenn die Quelle keine Menge nennt ("etwas", "nach Geschmack").
- unit: übliche Abkürzung (g, kg, ml, l, EL, TL, Prise, Stück, Bund, Dose, Pck., Zehe, Scheibe, Blatt …), null wenn keine.
- notes: Zubereitung, Qualität oder Hinweis aus der Quelle ("fein gehackt", "zimmerwarm", "optional", "oder Zitronensaft"), sonst null. Kleingeschrieben, außer bei Substantiven.`;

/** Flow rules (G2 with ingredient mentions). Shared by the import and the flow-only refresh. */
const FLOW_SECTIONS = `# Wofür der Ablauf da ist
Hobbyköche kochen mit dem Tablet in der Küche nach deinem Ablauf. Er wird als Flussdiagramm gezeigt: Jeder Knoten ist ein Arbeitsschritt, eine Kante heißt "dieser Schritt braucht das Ergebnis von jenem". Hat ein Schritt eine Dauer, bekommt er einen Timer. Läuft ein Warte-Schritt, schlägt die App vor, an einem anderen Strang weiterzuarbeiten. Der Ablauf soll den Stress aus dem Kochen nehmen: Man sieht jederzeit, was jetzt dran ist, was nebenbei geht und was wann fertig sein muss.

# Deine Aufgabe
Lies das Rezept mit seiner Zutatenliste so, als würdest du es gleich selbst kochen, und plane den Ablauf, den du dabei tatsächlich nehmen würdest. Die Reihenfolge im Rezepttext ist oft nur die Reihenfolge des Aufschreibens, nicht die beste Reihenfolge in der Küche. Kläre für dich:
- Welche Komponenten entstehen, und wo kommen sie zusammen?
- Was hängt wirklich voneinander ab, und was ist unabhängig?
- Wo hat man die Hände frei, weil etwas von allein gart, geht, ruht, zieht, abkühlt oder fest wird?
- Was hält seinen Zustand nur kurz (warm, flüssig, aufgeschlagen, knusprig, frisch angeschnitten) und muss deshalb genau dann fertig werden, wenn es gebraucht wird? Und was hält sich gut und kann deshalb in einer Wartezeit vorbereitet werden?

# Schritte
Ein Schritt ist ein Arbeitsgang, an dessen Ende ein greifbares Zwischenergebnis steht: ein Teig, eine Creme, eine Sauce, geschnittenes Gemüse, ein gebackener Boden. Handgriffe, die nur gemeinsam zu diesem Ergebnis führen, gehören in einen Schritt, auch wenn dafür ein zweites Gefäß nötig ist (etwas nebenbei schmelzen, trockene Zutaten vormischen, in die Form füllen). Ein neuer Schritt beginnt, wenn ein neues Zwischenergebnis entsteht, eine Wartezeit dazwischenliegt oder die Arbeit an einen anderen Ort wechselt (Herd, Ofen, Kühlschrank). Grund: Jeder Knoten ist eine Karte auf dem Tablet; zu viele kleine Karten zwingen zum ständigen Weitertippen, zu große verstecken Wartezeiten. Als Anhaltspunkt wird ein nummerierter Schritt der Quelle meist zu einem bis drei Knoten.

Schritttypen (type), passend zum Editor der App:
- start: genau einmal, erster Knoten, id "start", Label "Los geht's!"
- schneiden: schneiden, hacken, würfeln, reiben, schälen
- kochen: kochen, sieden, blanchieren, dämpfen, frittieren, schmelzen, karamellisieren
- braten: anbraten, sautieren, pfannenrühren, grillen
- backen: backen, rösten, gratinieren, im Ofen garen
- mixen: mixen, rühren, schlagen, kneten, pürieren, vermengen
- warten: ruhen, gehen lassen, marinieren, einweichen, quellen, ziehen lassen, abkühlen, kühlen, einfrieren, fest werden lassen
- wuerzen: würzen, abschmecken, verfeinern
- anrichten: zusammensetzen, füllen, formen, portionieren, auf dem Teller anrichten
- servieren: genau einmal, letzter Knoten, id "servieren"

Warte-Schritte: "warten" heißt in der App "Hände frei". Nutze den Typ deshalb nur für Phasen, in denen man weggehen oder anderes tun kann. Was man dafür nur kurz hinstellt, hineinlegt, abdeckt oder kaltstellt, gehört mit in den Warte-Schritt, weil es keine eigene Arbeit ist. Arbeit, für die man die Hände braucht (einfüllen, formen, bestreichen), bleibt ein eigener Schritt davor. Kurze Phasen, bei denen man dabeibleiben muss (unter Rühren aufkochen, kurz ziehen lassen und sofort abgießen), sind kein Warte-Schritt, sondern Teil des aktiven Schritts. Auch beim Backen, Schmoren oder Köcheln hat man oft die Hände frei; solche Schritte behalten ihren Typ und ihre Dauer, und andere Stränge dürfen währenddessen laufen.

# Stränge und Zeitpunkte
- Unabhängige Komponenten bekommen eigene Stränge. Ein Strang zweigt dort ab, wo die Komponente sinnvoll beginnt, und mündet dort, wo ihr Ergebnis gebraucht wird. Ein Strang heißt "unabhängig", nicht "gleichzeitig mit beiden Händen".
- Plane den Beginn eines Strangs nach dem Kochen, nicht nur nach der Abhängigkeit: Was seinen Zustand nur kurz hält, beginnt erst so spät, dass es beim Verwenden gerade richtig ist, statt lange vorher fertig zu werden. Was sich hält, legst du in eine lange Wartezeit, denn dafür ist die Wartezeit da.
- Dasselbe gilt innerhalb eines Strangs: Die Quelle nennt Arbeitsgänge oft in einer Reihenfolge, in der etwas Empfindliches fertig ist und dann warten muss, bis ein anderer Arbeitsgang (schmelzen, erhitzen, abkühlen) erledigt ist. Zieh in diesem Fall den anderen Arbeitsgang vor, sofern das Ergebnis nicht davon abhängt.
- Vorbereitungen, die Zeit brauchen, ohne Arbeit zu machen (den Ofen vorheizen, Wasser aufsetzen, etwas aus dem Kühlschrank nehmen), nennst du in der Beschreibung des Schritts, der so weit vorher liegt, dass sie rechtzeitig fertig sind. Ein eigener Schritt werden sie nur, wenn die Quelle sie als eigenen Arbeitsgang mit Dauer beschreibt.
- Eine Kante steht nur für eine echte Abhängigkeit: Der Schritt braucht das Ergebnis des anderen. Soll ein unabhängiger Strang erst spät beginnen, etwa gegen Ende einer langen Warte- oder Garzeit, hängst du ihn trotzdem nicht hinter diese Zeit. Er zweigt dort ab, wo er unabhängig wird, und seine Beschreibung nennt den Zeitpunkt ("gegen Ende der Köchelzeit beginnen"). Grund: Eine Kante verlängert die berechnete Gesamtzeit und verbirgt, dass die Arbeit in die Wartezeit passt.
- Hat das Rezept nur einen Strang, bleibt es eine Kette. Parallelisiere nichts künstlich.
- Der Ablauf ist ein gerichteter Graph ohne Zyklen. Wiederholungen schreibst du aus, wenn es wenige sind und jeweils eine Wartezeit dazwischenliegt. Bei vielen gleichen Wiederholungen ohne Wartezeit genügt ein Schritt, der die Anzahl nennt.

# Dauer (duration, in Minuten)
Die Dauer speist Timer und Gesamtzeit. Fehlt sie bei einer Wartezeit, sind beide falsch.
- Jeder "warten"-Schritt hat immer eine Dauer.
- Nennt das Rezept eine Zeit, übernimm sie. Bei einer Spanne nimm den oberen Wert und nenne die Spanne in der Beschreibung.
- "Über Nacht" sind 480 Minuten, "mindestens X" ist X. Stunden und Tage rechnest du in Minuten um. Empfiehlt die Quelle zusätzlich eine längere Zeit, nennst du sie in der Beschreibung.
- Ist das Warten an einen Zustand geknüpft (eine Temperatur, eine Konsistenz, vollständig abgekühlt), beschreibe den Zustand in der Beschreibung und schätze eine realistische Dauer.
- Aktive Schritte bekommen eine Dauer nur, wenn das Rezept sie für genau diesen Arbeitsgang nennt. Die Zeiten im Kopf der Rezeptseite (Arbeitszeit, Koch- oder Backzeit, Gesamtzeit) gelten für das ganze Rezept und werden nie zur Dauer eines einzelnen Schritts, weil der Timer sonst falsch läuft. Handarbeit wie Schneiden, Abwiegen oder Anrichten bekommt keine (null), weil sie vom eigenen Tempo abhängt.

# Zutaten und Erwähnungen
In der App wird jede Zutat, die ein Schritt verwendet, in seiner Beschreibung als Chip angezeigt: Er zeigt die Menge, rechnet sie mit der Portionszahl um und öffnet beim Antippen die Zutat. Du schreibst diese Chips direkt in den Text, als Erwähnung im Format @[Anzeigetext](id) mit der id aus der Zutatenliste.
- Der Anzeigetext ist das Wort, wie es im Satz natürlich steht: gebeugt, im Plural oder Singular, je nachdem, was der Satz braucht ("die @[Zwiebeln](ingredient-3) fein würfeln", "den @[Apfel](ingredient-5) schälen"). Er bezeichnet die Zutat selbst, keinen Oberbegriff ("das Gemüse") und kein Zwischenprodukt ("den Teig"), weil der Chip genau diese Zutat meint. Artikel und Adjektive stehen außerhalb der Klammern.
- Jede Zutat der Zutatenliste wird in mindestens einem Schritt erwähnt, und zwar dort, wo sie verwendet wird. Verwende nur ids aus der Liste. Zwischenprodukte, Geräte und Dinge, die nicht in der Liste stehen, sind normaler Text.
- Erwähne eine Zutat in einem Schritt genau einmal, an der Stelle, an der sie verarbeitet wird; spätere Bezüge im selben Schritt sind normaler Text. Schritte, die nur mit bereits verarbeiteten Massen weiterarbeiten, erwähnen die Zutat nicht erneut, weil sie dort nicht noch einmal abgewogen wird.
- Mengen: Der Chip zeigt von sich aus die Menge aus der Zutatenliste. Schreib deshalb keine Menge vor oder hinter die Erwähnung, sonst steht sie doppelt da.
- Geht nur ein Teil einer Zutat in diesen Schritt, schreibst du die Teilmenge hinter einen senkrechten Strich in die Erwähnung: @[Butter|30 g](ingredient-2). Die Teilmenge ist eine Zahl mit derselben Einheit wie in der Zutatenliste ("30 g", "2 EL", "½ TL"; bei Zutaten ohne Einheit nur die Zahl, "2"), denn nur diese Form kann die App mit der Portionszahl umrechnen. Die Teilmengen einer Zutat ergeben zusammen ihre Gesamtmenge. Nennt die Quelle für einen Teil keine Zahl ("den Rest", "das übrige Wasser"), rechne ihn aus der Gesamtmenge und den schon verwendeten Teilen aus; nur wenn das nicht geht ("etwas zum Bestreuen"), schreib die Worte der Quelle als Teilmenge ("etwas", "Rest").
- ingredientIds enthält genau die ids, die die Beschreibung erwähnt.
- Die Hinweise in Klammern hinter einer Zutat sind Information für dich, kein Text zum Abschreiben: Arbeite ein, was in diesem Schritt zählt ("die Orangen schälen und filetieren"), und lass weg, was hier nicht gebraucht wird. Die Beschreibung soll sich wie ein Kochbuchsatz lesen.

# Texte
- Alles auf Deutsch. Fremdsprachige Rezepte übersetzt du.
- label: kurze Handlung im Infinitiv, höchstens 50 Zeichen ("Teig kneten").
- description: im Infinitiv wie in einem Kochbuch ("Den Teig 10 Minuten kneten, bis er glatt ist."), auch bei "start" und "servieren". Sie enthält die Mengen, Temperaturen, Zeiten und Erkennungszeichen aus der Quelle, die man in diesem Moment braucht. Meist ein bis drei Sätze.
- Bleib bei der Quelle und erfinde keine Arbeitsschritte, Zutaten oder Mengen.
- Alternativen und Varianten ("statt …", "alternativ …", "wer es eilig hat …", "wer kein Gerät X hat …") sind kein eigener Strang, weil man sie nicht zusätzlich, sondern stattdessen macht. Plane den Hauptweg, also den ersten oder ausführlicher beschriebenen, und nenne die Alternative in der Beschreibung des betroffenen Schritts.
- Tipps, Serviervorschläge und Hinweise zur Aufbewahrung gehören in die Beschreibung des passenden Schritts, meist "servieren".

# Graphregeln
"start" hat keine eingehenden, "servieren" keine ausgehenden Kanten. Jeder andere Knoten hat mindestens eine eingehende und eine ausgehende Kante. Alles ist von "start" erreichbar und führt zu "servieren". Ein Schritt, der Ergebnisse mehrerer Stränge braucht, hat mehrere eingehende Kanten. Jede Kante verweist auf eine existierende Knoten-id.

# Probekochen
Geh den fertigen Ablauf vor dem Antworten einmal so durch, als würdest du danach kochen, und korrigiere ihn, bis alles zutrifft:
- Jemand ohne das Originalrezept kann das Gericht damit vollständig kochen. Kein Arbeitsschritt, keine Wartezeit und keine Zutat aus der Quelle fehlt.
- Nichts wird verwendet, bevor es fertig ist, und jede Komponente mündet dort, wo sie gebraucht wird.
- Was seinen Zustand nur kurz hält, ist genau dann bereit, wenn es gebraucht wird; nichts wartet unnötig lange auf seinen Einsatz.
- In den langen Wartezeiten passiert, was sinnvoll nebenbei geht.
- Jeder Warte-Schritt hat eine Dauer, und die Zeiten passen zur Quelle.
- Jede Erwähnung hat die Form @[Text](id) oder @[Text|Teilmenge](id) mit einer id aus der Liste, jede Zutat ist mindestens einmal erwähnt, und die Teilmengen einer Zutat ergeben zusammen ihre Gesamtmenge.
- Alle Kanten verweisen auf existierende ids, und die Graphregeln sind erfüllt.

Antworte ausschließlich im geforderten JSON-Format.`;

/** System prompt of the import: metadata, ingredients and flow in one request. */
export const IMPORT_SYSTEM_PROMPT = `Du bereitest Rezepte für die Koch-App KochTakt auf. Aus dem Markdown einer Rezeptseite erfasst du in einem Durchgang die Stammdaten des Rezepts (Titel, Beschreibung, Einordnung, Zutaten) und baust daraus den Kochablauf.

${META_SECTIONS}

${FLOW_SECTIONS}`;

/** System prompt of the flow-only refresh: the ingredient list is fixed and given. */
export const FLOW_ONLY_SYSTEM_PROMPT = `Du bereitest Rezepte für die Koch-App KochTakt auf. Aus dem Markdown einer Rezeptseite und der festen Zutatenliste des Rezepts baust du den Kochablauf. Die Zutatenliste ist vorgegeben: Du änderst sie nicht, ergänzt nichts und verweist mit ihren ids auf sie.

${FLOW_SECTIONS}`;

// ─────────────────────────────────────────────────────────────────────────────
// User messages
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportPromptContext {
    /** The fixed tag list (KUC-116), alphabetical */
    availableTags?: readonly string[];
    /** Known catalogue ingredient names, ordered by createdAt (stable prefix for caching) */
    topIngredients?: readonly string[];
}

/**
 * Context message: tag list and known ingredients. Separate from the recipe so
 * the system prompt plus this prefix stays identical across requests (prompt caching).
 */
export function buildContextMessage(context?: ImportPromptContext): string | null {
    const parts: string[] = [];
    if (context?.availableTags?.length) {
        parts.push(
            `<tag_liste>\nNur diese Tags verwenden, keine neuen erfinden.\n${context.availableTags.join('\n')}\n</tag_liste>`,
        );
    }
    if (context?.topIngredients?.length) {
        parts.push(`<bekannte_zutaten>\n${context.topIngredients.join('\n')}\n</bekannte_zutaten>`);
    }
    return parts.length > 0 ? parts.join('\n\n') : null;
}

export function buildRecipeMessage(markdown: string, sourceUrl: string): string {
    return `${sourceUrl ? `Quelle: ${sourceUrl}\n\n` : ''}<rezept>\n${markdown}\n</rezept>`;
}

/** One ingredient of the fixed list for the flow-only prompt. `id` is the temporary id. */
export interface PromptIngredient {
    id: string;
    name: string;
    amount: string | number | null;
    unit: string | null;
    notes?: string | null;
}

export function formatIngredientLine(ing: PromptIngredient): string {
    const amount = ing.amount == null ? '' : String(ing.amount).trim();
    const head = [amount, ing.unit?.trim(), ing.name.trim()].filter(Boolean).join(' ');
    return `${ing.id}: ${head}${ing.notes?.trim() ? ` (${ing.notes.trim()})` : ''}`;
}

export function buildFlowOnlyMessage(markdown: string, ingredients: PromptIngredient[]): string {
    return `<zutaten>\n${ingredients.map(formatIngredientLine).join('\n')}\n</zutaten>\n\n<rezept>\n${markdown}\n</rezept>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request bodies (direct call and Batch API use the same body)
// ─────────────────────────────────────────────────────────────────────────────

export type ChatRequestBody = OpenAI.ChatCompletionCreateParamsNonStreaming;

export function buildImportRequestBody(input: {
    markdown: string;
    sourceUrl: string;
    context?: ImportPromptContext;
    model?: string;
}): ChatRequestBody {
    const contextMessage = buildContextMessage(input.context);
    return {
        model: input.model ?? AI_TEXT_MODEL,
        messages: [
            { role: 'system', content: IMPORT_SYSTEM_PROMPT },
            ...(contextMessage ? [{ role: 'user' as const, content: contextMessage }] : []),
            { role: 'user', content: buildRecipeMessage(input.markdown, input.sourceUrl) },
        ],
        response_format: getOpenAIResponseFormat(),
    };
}

export function buildFlowOnlyRequestBody(input: {
    markdown: string;
    ingredients: PromptIngredient[];
    model?: string;
}): ChatRequestBody {
    return {
        model: input.model ?? AI_TEXT_MODEL,
        messages: [
            { role: 'system', content: FLOW_ONLY_SYSTEM_PROMPT },
            { role: 'user', content: buildFlowOnlyMessage(input.markdown, input.ingredients) },
        ],
        response_format: getFlowOnlyResponseFormat(),
    };
}

/**
 * Repair round: the first answer and its problems go back to the model,
 * which answers once more with the complete corrected JSON.
 */
export function buildRepairRequestBody(
    body: ChatRequestBody,
    previousContent: string,
    problems: string[],
): ChatRequestBody {
    return {
        ...body,
        messages: [
            ...body.messages,
            ...(previousContent ? [{ role: 'assistant' as const, content: previousContent }] : []),
            {
                role: 'user',
                content: `Deine Antwort ist so nicht verwendbar. Gefundene Fehler:\n${problems
                    .map((p) => `- ${p}`)
                    .join(
                        '\n',
                    )}\n\nKorrigiere genau diese Punkte, ändere sonst nichts, und gib die vollständige Antwort erneut im geforderten JSON-Format zurück.`,
            },
        ],
    };
}
