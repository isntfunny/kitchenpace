// src/lib/importer/openai-client.ts
// OpenAI Client Integration für den Rezept-Importer

import OpenAI from 'openai';

import {
    ImportedRecipeSchema,
    getOpenAIResponseFormat,
    type ImportedRecipe,
} from './openai-recipe-schema';
import type { ImportRunMetadata, RecipeParseResult } from './types';

// ============================================================================
// OpenAI Client Initialisierung
// ============================================================================

/**
 * Erstellt einen OpenAI Client mit den Umgebungsvariablen
 */
function createOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY ist nicht konfiguriert');
    }

    return new OpenAI({
        apiKey,
        // Optional: Organization ID für Enterprise Accounts
        organization: process.env.OPENAI_ORG_ID,
    });
}

// Singleton-Instance für wiederverwendeten Client
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = createOpenAIClient();
    }
    return openaiClient;
}

// ============================================================================
// Prompt Engineering
// ============================================================================

/**
 * System-Prompt für den Rezept-Importer
 * Definiert die Aufgabe und das erwartete Output-Format
 */
const RECIPE_IMPORT_SYSTEM_PROMPT = `Du bist ein Experte für das Extrahieren von Rezeptdaten aus Webseiten.
Deine Aufgabe ist es, Rezepte aus Markdown zu analysieren und als strukturiertes JSON zurückzugeben.

SPRACHE: Alle Ausgaben DEUTSCH — Titel, Beschreibungen, Labels, Tags, Zutaten-Namen. Fremdsprachige Rezepte vollständig ins Deutsche übersetzen.

═══════════════════════════════════════════════════════════
METADATEN
═══════════════════════════════════════════════════════════

- id: UUID v4 generieren
- title: Vollständiger Rezepttitel
- description: Prägnante Beschreibung (1-3 Sätze)
- imageUrl: Hauptbild-URL aus dem Markdown (og:image, große <img>, Markdown-Bilder). Keine Logos/Icons/Werbung. Null wenn keins gefunden.
- categories: 1–3 aus: "Hauptgericht", "Beilage", "Backen", "Dessert", "Frühstück", "Getränk", "Vorspeise", "Salat"
- tags: 8-20 relevante Tags auf Deutsch. Sei SEHR großzügig — erfinde frei neue Tags!
  Tags helfen beim Filtern, Entdecken und saisonalen Einsortieren. Du DARFST und SOLLST neue Tags erfinden die zum Rezept passen. Decke ALLE zutreffenden Dimensionen ab:

  ★★★ HÖCHSTE PRIORITÄT — bei JEDEM Rezept mindestens 2-3 davon vergeben: ★★★
  • Jahreszeit: "Frühling", "Sommer", "Herbst", "Winter" — wähle nach typischer Passung. Suppen/Eintöpfe→Herbst/Winter, Salate/Grill→Sommer, leichte Gerichte→Frühling, etc. MEHRERE Jahreszeiten wenn passend!
  • Saisonale Events & Feiertage: "Weihnachten", "Ostern", "Silvester", "Valentinstag", "Muttertag", "Vatertag", "Erntedank", "Fasching/Karneval", "Nikolaus", "Advent", "Grillsaison", "Oktoberfest", "Sommerfest", "Gartenparty", "Osterbrunch", ... — vergib wenn das Rezept typisch dafür wäre oder gut dazu passt
  • Stimmung & Gefühl: "gemütlich", "sommerlich leicht", "wärmend", "erfrischend", "festlich", "rustikal", "elegant", "schnell & unkompliziert", "zum Verwöhnen", "Seelenwärmer", "Sonntagsglück", ...
  • Tageszeit: "Mittagessen", "Abendessen", "Frühstück", "Brunch", "Snack", "Nachtisch", "Nachmittagskaffee"
  • Anlass: "Party", "Familienessen", "Kindergeburtstag", "Feierabendküche", "Sonntagsessen", "Für Gäste", "Picknick", "Meal Prep", "Büro-Lunch", "Date Night", "Brunch mit Freunden", "Grillabend", "Wochenend-Kochen", ...

  Weitere Tags:
  • Küchenart: "Italienisch", "Asiatisch", "Deutsch", "Mexikanisch", "Mediterran", "Orientalisch", ...
  • Ernährung: "Vegetarisch", "Vegan", "Low Carb", "Glutenfrei", "Proteinreich", "Kalorienarm", ...
  • Zubereitungsart: "Ofengericht", "Eintopf", "Auflauf", "Suppe", "Salat", "Fingerfood", "Pfannengericht", "One Pot", ...
  • Charakter: "Klassiker", "Comfort Food", "Schnell", "Einfach", "Aufwendig", "Für Einsteiger", ...

  ✘ VERBOTEN — NIEMALS als Tag verwenden:
  • Einzelne Zutaten: "Tomate", "Kartoffeln", "Lachs", "Schokolade", etc. — dafür gibt es den Zutatenfilter
  • "mit [Zutat]": "mit Hackfleisch", "mit Hühnchen", "mit Fisch", etc. — wird über Zutatenkategorien berechnet
- prepTime / cookTime: in Minuten
- servings: Portionen
- difficulty: "Einfach", "Mittel" oder "Schwer"

═══════════════════════════════════════════════════════════
ZUTATEN
═══════════════════════════════════════════════════════════

Jede Zutat hat:
- name: REINER Name ohne Zubereitungsangaben, auf Deutsch. RICHTIG: "Tomaten", "Zwiebel" — FALSCH: "frisch gehackte Tomaten", "fein gewürfelte Zwiebel"
- amount: Zahl (Brüche konvertieren: "1/2" → 0.5). Null wenn unklar.
- unit: Einheit auf Deutsch (g, ml, EL, TL, Stück, Prise). Null wenn unklar.
- notes: Zubereitungshinweis ("frisch gehackt", "fein gewürfelt"). Null wenn nicht nötig.

Referenz-IDs: "ingredient-0", "ingredient-1", ... (Index in der Zutatenliste).

═══════════════════════════════════════════════════════════
FLOW-GRAPH — DAS WICHTIGSTE
═══════════════════════════════════════════════════════════

Du erstellst einen gerichteten azyklischen Graphen (DAG) der Zubereitungsschritte.
Der Graph wird als Flussdiagramm visualisiert — die Qualität des Flows ist entscheidend.

SCHRITTTYPEN (type):
- "start"     → PFLICHT. Erster Knoten. id="start". Label: "Los geht's!" o.ä.
- "schneiden" → Schneiden, Hacken, Würfeln, Reiben, Schälen
- "kochen"    → Kochen, Sieden, Blanchieren, Dämpfen
- "braten"    → Anbraten, Sautieren, Grillen
- "backen"    → Backen, Rösten, Gratinieren, Ofengaren
- "mixen"     → Mixen, Rühren, Schlagen, Kneten, Pürieren, Vermengen
- "warten"    → Ruhen, Marinieren, Abkühlen, Quellen, Ziehen lassen
- "wuerzen"   → Würzen, Abschmecken, Salzen, Pfeffern
- "anrichten" → Anrichten, Zusammenfügen, Portionieren
- "servieren" → PFLICHT. Letzter Knoten. id="servieren".

FELDER PRO KNOTEN:
- id: "start", "step-1", "step-2", ..., "servieren"
- type: Einer der obigen Typen
- label: Kurzer Titel (max 50 Zeichen)
- description: Detaillierte Beschreibung der Aktion auf Deutsch. Keine @-Mentions — benutze einfach die Zutatennamen im Fließtext.
- duration: Minuten als Integer, oder null
- laneId: ID der parallelen Spur (z.B. "klopse", "bruehe", "sauce")
- ingredientIds: Array der Zutaten-IDs die in diesem Schritt verwendet werden

═══════════════════════════════════════════════════════════
PARALLELE BRANCHES — KRITISCH WICHTIG
═══════════════════════════════════════════════════════════

Viele Rezepte haben PARALLELE ARBEITSSCHRITTE die gleichzeitig ablaufen.
Du MUSST diese als separate Branches im Graph modellieren!

ERKENNE PARALLELE ABSCHNITTE an:
1. Explizite Überschriften: "Für die Sauce:", "Für den Teig:", "Für die Füllung:"
2. Separate Zutatenlisten mit eigenen Überschriften
3. Unabhängige Prozesse: Nudeln kochen WÄHREND Sauce zubereitet wird
4. Ofengaren (passiv) WÄHREND andere Schritte aktiv ausgeführt werden

SO MODELLIERST DU BRANCHES:
- Der "start"-Knoten hat MEHRERE ausgehende Kanten — eine pro Branch
- Jeder Branch hat seine eigenen Schritte mit eigener laneId
- Branches kommen am Ende zusammen (z.B. beim "anrichten" oder "servieren")

BEISPIEL Königsberger Klopse (3 Branches):
  start → [Klopse formen] → [Klopse garen] ─────────────────────→ anrichten → servieren
  start → [Brühe aufsetzen] → [Klopse in Brühe geben] ──────────→ anrichten
  start → [Mehlschwitze] → [Sauce mit Brühe ablöschen] → [Abschmecken] → anrichten

BEISPIEL Pasta mit Sauce (2 Branches):
  start → [Nudeln kochen] → [Nudeln abgießen] ────→ anrichten → servieren
  start → [Zwiebeln anbraten] → [Sauce kochen] ───→ anrichten

ANTI-PATTERN — MACHE DAS NIEMALS:
- Alles in eine lineare Kette packen wenn das Rezept mehrere Komponenten hat
- "Brühe aufsetzen" → "Klopse formen" → "Sauce machen" als Kette (das sind parallele Arbeiten!)

═══════════════════════════════════════════════════════════
KANTEN (flowEdges)
═══════════════════════════════════════════════════════════

- id: "edge-1", "edge-2", ...
- source: ID des Quellknotens
- target: ID des Zielknotens
- label: Null setzen (wird nicht angezeigt)

GRAPH-REGELN:
- "start": keine eingehenden Kanten, mindestens eine ausgehende
- "servieren": keine ausgehenden Kanten, mindestens eine eingehende
- Alle anderen Knoten: mind. 1 eingehend + mind. 1 ausgehend
- Alle Knoten müssen von "start" erreichbar sein
- Alle Knoten müssen zu "servieren" führen
- Keine Zyklen`;

/**
 * Builds an optional context message with known DB tags and ingredients.
 * Sent as a separate user message so the static system prompt stays cacheable.
 *
 * Lists are ordered by createdAt (from the DB query) so new entries append
 * at the end — this maximises OpenAI prompt-caching hits since the prefix
 * stays identical across requests.
 * Each entry sits on its own line for clearer tokenisation.
 *
 * Returns null when there is no context to inject.
 */
function buildContextMessage(context?: ImportRecipeOptions['context']): string | null {
    const parts: string[] = [];

    if (context?.availableTags?.length) {
        parts.push(
            `VORHANDENE TAGS IN DER DATENBANK (bevorzuge diese, neue Tags sind aber erlaubt):\n${context.availableTags.join('\n')}`,
        );
    }

    if (context?.topIngredients?.length) {
        parts.push(
            `BEKANNTE ZUTATEN (verwende exakt diese Schreibweise wenn zutreffend):\n${context.topIngredients.join('\n')}`,
        );
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * Builds the recipe extraction user message.
 */
function buildRecipeMessage(markdown: string, sourceUrl: string): string {
    return `Extrahiere das Rezept aus folgendem Markdown:

QUELLE: ${sourceUrl}

--- MARKDOWN START ---
${markdown}
--- MARKDOWN END ---

Bitte analysiere den Inhalt und gib die strukturierten Rezeptdaten zurück.`;
}

// Pricing (USD per 1M tokens) — gpt-5.4-mini
const PRICE_INPUT = 0.75 / 1_000_000;
const PRICE_CACHED = 0.075 / 1_000_000;
const PRICE_OUTPUT = 4.5 / 1_000_000;

function computeCost(
    inputTokens: number | null,
    cachedInputTokens: number | null,
    outputTokens: number | null,
): number | null {
    if (inputTokens == null || outputTokens == null) return null;
    const cached = cachedInputTokens ?? 0;
    const uncached = inputTokens - cached;
    return uncached * PRICE_INPUT + cached * PRICE_CACHED + outputTokens * PRICE_OUTPUT;
}

// ============================================================================
// Haupt-Import-Funktion
// ============================================================================

export interface ImportRecipeOptions {
    /** OpenAI Model (Default: gpt-5.4-mini) */
    model?: string;
    /** Temperatur für die Generierung (0-1, Default: 0.1) */
    temperature?: number;
    /**
     * Optional context injected into the user prompt so the AI prefers
     * existing database records over inventing new ones.
     */
    context?: {
        /** Existing tag names — AI should prefer these but may add new ones */
        availableTags?: string[];
        /** Most-used ingredient names — AI should use exact names for deduplication */
        topIngredients?: string[];
    };
}

/**
 * Importiert ein Rezept von einer Markdown-Quelle mittels OpenAI
 * @param markdown - Der extrahierte Markdown-Inhalt
 * @param sourceUrl - Die Quell-URL für Referenz
 * @param options - Optionale Konfiguration
 * @returns Promise<RecipeParseResult>
 */
export async function importRecipeFromMarkdown(
    markdown: string,
    sourceUrl: string,
    options: ImportRecipeOptions = {},
): Promise<RecipeParseResult> {
    const { model = 'gpt-5.4-mini', temperature = 0.1, context } = options;

    try {
        const openai = getOpenAIClient();

        // Build messages:
        // 1. System prompt — static, eligible for OpenAI prompt caching
        // 2. Context message — dynamic DB tags/ingredients (separate so system stays cacheable)
        // 3. Recipe message — the actual scraped markdown
        const contextMessage = buildContextMessage(context);
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: RECIPE_IMPORT_SYSTEM_PROMPT },
            ...(contextMessage ? [{ role: 'user' as const, content: contextMessage }] : []),
            { role: 'user', content: buildRecipeMessage(markdown, sourceUrl) },
        ];

        const completion = await openai.chat.completions.create({
            model,
            messages,
            temperature,
            response_format: getOpenAIResponseFormat(),
        });

        // Response extrahieren
        const content = completion.choices[0]?.message?.content;

        if (!content) {
            return {
                success: false,
                error: {
                    type: 'EMPTY_RESPONSE',
                    message: 'OpenAI hat keine Antwort zurückgegeben',
                },
            };
        }

        // JSON parsen und validieren
        let parsedData: unknown;
        try {
            parsedData = JSON.parse(content);
        } catch (parseError) {
            return {
                success: false,
                error: {
                    type: 'JSON_PARSE_ERROR',
                    message: 'OpenAI-Antwort ist kein gültiges JSON',
                    details: parseError instanceof Error ? parseError.message : undefined,
                },
            };
        }

        // Zod-Validierung
        const validationResult = ImportedRecipeSchema.safeParse(parsedData);

        if (!validationResult.success) {
            const errors = validationResult.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            }));

            return {
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'Validierung der Rezeptdaten fehlgeschlagen',
                    details: errors,
                },
            };
        }

        // Validierung des Flow-Graphen
        const flowValidation = validateFlowGraph(validationResult.data);
        if (!flowValidation.valid) {
            return {
                success: false,
                error: {
                    type: 'FLOW_VALIDATION_ERROR',
                    message: flowValidation.message,
                    details: flowValidation.issues,
                },
            };
        }

        // Extract token usage for cost tracking and ImportRun logging
        const inputTokens = completion.usage?.prompt_tokens ?? null;
        const cachedInputTokens = completion.usage?.prompt_tokens_details?.cached_tokens ?? null;
        const outputTokens = completion.usage?.completion_tokens ?? null;

        const metadata: ImportRunMetadata = {
            model,
            sourceUrl,
            inputTokens,
            cachedInputTokens,
            outputTokens,
            estimatedCostUsd: computeCost(inputTokens, cachedInputTokens, outputTokens),
            rawApiResponse: completion,
        };

        return {
            success: true,
            data: validationResult.data,
            metadata,
        };
    } catch (error) {
        // OpenAI-spezifische Fehler behandeln
        // OpenAI APIError hat folgende Properties: status, code, type, message
        const apiError = error as {
            status?: number;
            code?: string;
            type?: string;
            message?: string;
        };
        if (apiError.status || apiError.code) {
            return {
                success: false,
                error: {
                    type: 'OPENAI_API_ERROR',
                    message: `OpenAI API Fehler: ${apiError.message ?? 'Unbekannter API Fehler'}`,
                    details: {
                        status: apiError.status,
                        code: apiError.code,
                        type: apiError.type,
                    },
                },
            };
        }

        // Allgemeine Fehler
        return {
            success: false,
            error: {
                type: 'UNKNOWN_ERROR',
                message: error instanceof Error ? error.message : 'Unbekannter Fehler',
            },
        };
    }
}

/**
 * Same as importRecipeFromMarkdown but streams the OpenAI response token by token.
 * onDelta is called with each raw text fragment as it arrives from the API.
 * Returns the same RecipeParseResult after collecting and validating the full JSON.
 */
export async function streamRecipeFromMarkdown(
    markdown: string,
    sourceUrl: string,
    options: ImportRecipeOptions = {},
    onDelta: (text: string) => void,
): Promise<RecipeParseResult> {
    const { model = 'gpt-5.4-mini', temperature = 0.1, context } = options;

    try {
        const openai = getOpenAIClient();

        const contextMessage = buildContextMessage(context);
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: RECIPE_IMPORT_SYSTEM_PROMPT },
            ...(contextMessage ? [{ role: 'user' as const, content: contextMessage }] : []),
            { role: 'user', content: buildRecipeMessage(markdown, sourceUrl) },
        ];

        const stream = await openai.chat.completions.create({
            model,
            messages,
            temperature,
            response_format: getOpenAIResponseFormat(),
            stream: true,
            stream_options: { include_usage: true },
        });

        let fullContent = '';
        let usage: OpenAI.CompletionUsage | undefined;

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                fullContent += delta;
                onDelta(delta);
            }
            if (chunk.usage) {
                usage = chunk.usage;
            }
        }

        if (!fullContent) {
            return {
                success: false,
                error: {
                    type: 'EMPTY_RESPONSE',
                    message: 'OpenAI hat keine Antwort zurückgegeben',
                },
            };
        }

        let parsedData: unknown;
        try {
            parsedData = JSON.parse(fullContent);
        } catch (parseError) {
            return {
                success: false,
                error: {
                    type: 'JSON_PARSE_ERROR',
                    message: 'OpenAI-Antwort ist kein gültiges JSON',
                    details: parseError instanceof Error ? parseError.message : undefined,
                },
            };
        }

        const validationResult = ImportedRecipeSchema.safeParse(parsedData);
        if (!validationResult.success) {
            return {
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'Validierung der Rezeptdaten fehlgeschlagen',
                    details: validationResult.error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                    })),
                },
            };
        }

        const flowValidation = validateFlowGraph(validationResult.data);
        if (!flowValidation.valid) {
            return {
                success: false,
                error: {
                    type: 'FLOW_VALIDATION_ERROR',
                    message: flowValidation.message,
                    details: flowValidation.issues,
                },
            };
        }

        const inputTokens = usage?.prompt_tokens ?? null;
        const cachedInputTokens = usage?.prompt_tokens_details?.cached_tokens ?? null;
        const outputTokens = usage?.completion_tokens ?? null;

        const metadata: ImportRunMetadata = {
            model,
            sourceUrl,
            inputTokens,
            cachedInputTokens,
            outputTokens,
            estimatedCostUsd: computeCost(inputTokens, cachedInputTokens, outputTokens),
            rawApiResponse: { usage },
        };

        return { success: true, data: validationResult.data, metadata };
    } catch (error) {
        const apiError = error as {
            status?: number;
            code?: string;
            type?: string;
            message?: string;
        };
        if (apiError.status || apiError.code) {
            return {
                success: false,
                error: {
                    type: 'OPENAI_API_ERROR',
                    message: `OpenAI API Fehler: ${apiError.message ?? 'Unbekannter API Fehler'}`,
                    details: { status: apiError.status, code: apiError.code, type: apiError.type },
                },
            };
        }
        return {
            success: false,
            error: {
                type: 'UNKNOWN_ERROR',
                message: error instanceof Error ? error.message : 'Unbekannter Fehler',
            },
        };
    }
}

// ============================================================================
// Flow-Graph Validierung
// ============================================================================

interface FlowValidationResult {
    valid: boolean;
    message: string;
    issues?: string[];
}

/**
 * Validiert die Flow-Struktur:
 * - Jeder Knoten (außer dem ersten) muss mindestens einen incoming Edge haben
 * - Jeder Knoten (außer "servieren") muss mindestens einen outgoing Edge haben
 * - "servieren" ist der finale Node - alle Pfade müssen dorthin führen
 * - Keine Zyklen erlaubt
 */
function validateFlowGraph(recipe: ImportedRecipe): FlowValidationResult {
    const issues: string[] = [];
    const { flowNodes, flowEdges } = recipe;

    // 1. Prüfe auf Start- und Servieren-Knoten (beide Pflicht)
    const startNodes = flowNodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) {
        issues.push('Kein Start-Knoten gefunden (type: "start")');
    }
    if (startNodes.length > 1) {
        issues.push('Mehrere Start-Knoten gefunden');
    }

    const serveNodes = flowNodes.filter((n) => n.type === 'servieren');
    if (serveNodes.length === 0) {
        issues.push('Kein Servieren-Knoten gefunden (type: "servieren")');
    }
    if (serveNodes.length > 1) {
        issues.push('Mehrere Servieren-Knoten gefunden');
    }

    // 2. Validiere Kanten-Referenzen
    const nodeIds = new Set(flowNodes.map((n) => n.id));

    for (const edge of flowEdges) {
        if (!nodeIds.has(edge.source)) {
            issues.push(`Kante ${edge.id}: Quellknoten "${edge.source}" existiert nicht`);
        }
        if (!nodeIds.has(edge.target)) {
            issues.push(`Kante ${edge.id}: Zielknoten "${edge.target}" existiert nicht`);
        }
    }

    // 3. Baue Adjazenzlisten auf
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    for (const edge of flowEdges) {
        // Outgoing
        if (!outgoingEdges.has(edge.source)) {
            outgoingEdges.set(edge.source, []);
        }
        outgoingEdges.get(edge.source)!.push(edge.target);

        // Incoming
        if (!incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, []);
        }
        incomingEdges.get(edge.target)!.push(edge.source);
    }

    // 4. Prüfe incoming/outgoing Edge Regeln
    for (const node of flowNodes) {
        const incoming = incomingEdges.get(node.id) ?? [];
        const outgoing = outgoingEdges.get(node.id) ?? [];

        // Alle Knoten außer "start" müssen mindestens einen incoming Edge haben
        if (node.type !== 'start' && incoming.length === 0) {
            issues.push(`Knoten "${node.label}" (${node.id}) hat keinen incoming Edge`);
        }

        // Alle Knoten außer "servieren" müssen mindestens einen outgoing Edge haben
        if (node.type !== 'servieren' && outgoing.length === 0) {
            issues.push(
                `Knoten "${node.label}" (${node.id}, type: "${node.type}") hat keinen outgoing Edge`,
            );
        }
    }

    // 5. Prüfe auf erreichbare Knoten (BFS vom Start-Knoten, type="start")
    const rootNodes = flowNodes.filter((n) => n.type === 'start');

    if (rootNodes.length > 0) {
        const startNodeId = rootNodes[0].id;
        const reachable = new Set<string>();
        const queue = [startNodeId];

        // BFS
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (reachable.has(current)) continue;
            reachable.add(current);

            const neighbors = outgoingEdges.get(current) ?? [];
            for (const neighbor of neighbors) {
                if (!reachable.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        // Prüfe auf nicht erreichbare Knoten
        for (const node of flowNodes) {
            if (!reachable.has(node.id)) {
                issues.push(`Knoten "${node.label}" (${node.id}) ist nicht vom Start erreichbar`);
            }
        }

        // 6. Prüfe ob alle Pfade zum Servieren führen (Reverse BFS)
        if (serveNodes.length > 0) {
            const serveNodeId = serveNodes[0].id;
            const canReachServe = new Set<string>();
            const reverseQueue = [serveNodeId];
            const reverseAdjacency = new Map<string, string[]>();

            // Reverse Adjazenzliste
            for (const edge of flowEdges) {
                if (!reverseAdjacency.has(edge.target)) {
                    reverseAdjacency.set(edge.target, []);
                }
                reverseAdjacency.get(edge.target)!.push(edge.source);
            }

            // Reverse BFS
            while (reverseQueue.length > 0) {
                const current = reverseQueue.shift()!;
                if (canReachServe.has(current)) continue;
                canReachServe.add(current);

                const predecessors = reverseAdjacency.get(current) ?? [];
                for (const pred of predecessors) {
                    if (!canReachServe.has(pred)) {
                        reverseQueue.push(pred);
                    }
                }
            }

            // Prüfe ob alle Knoten zum Servieren führen
            for (const node of flowNodes) {
                if (!canReachServe.has(node.id)) {
                    issues.push(
                        `Von Knoten "${node.label}" (${node.id}) führt kein Pfad zum Servieren`,
                    );
                }
            }
        }
    }

    // 7. Prüfe auf Zyklen (DFS)
    const hasCycle = detectCycle(flowNodes, flowEdges);
    if (hasCycle) {
        issues.push('Flow enthält einen Zyklus (kreisförmige Abhängigkeit)');
    }

    if (issues.length > 0) {
        return {
            valid: false,
            message: `Flow-Validierung fehlgeschlagen: ${issues.length} Problem(e) gefunden`,
            issues,
        };
    }

    return { valid: true, message: 'Flow-Struktur ist gültig' };
}

/**
 * Einfache Zyklen-Erkennung mittels DFS
 */
function detectCycle(
    nodes: ImportedRecipe['flowNodes'],
    edges: ImportedRecipe['flowEdges'],
): boolean {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
        if (!adjacency.has(edge.source)) {
            adjacency.set(edge.source, []);
        }
        adjacency.get(edge.source)!.push(edge.target);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(nodeId: string): boolean {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors = adjacency.get(nodeId) ?? [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor)) return true;
            } else if (recursionStack.has(neighbor)) {
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    for (const node of nodes) {
        if (!visited.has(node.id)) {
            if (dfs(node.id)) return true;
        }
    }

    return false;
}
