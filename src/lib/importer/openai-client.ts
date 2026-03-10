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
export function createOpenAIClient(): OpenAI {
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
Deine Aufgabe ist es, Rezepte aus dem bereitgestellten Markdown zu analysieren und in eine strukturierte JSON-Form zu konvertieren.

SPRACHE: Alle Ausgaben müssen auf DEUTSCH sein — das gilt für Titel, Beschreibungen, Labels, Tags UND insbesondere alle Zutaten-Namen. Übersetze auch englische oder fremdsprachige Rezepte vollständig ins Deutsche. Zutaten-Namen niemals in Englisch oder einer anderen Sprache lassen.

ANFORDERUNGEN:

1. **UUID**: Generiere eine gültige UUID v4 für das Rezept (Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
2. **Titel**: Extrahiere den vollständigen Rezepttitel (auf Deutsch)
3. **Beschreibung**: Erstelle eine prägnante Beschreibung (1-3 Sätze, auf Deutsch)
4. **Kategorie**: Wähle die passendste aus: "Hauptgericht", "Beilage", "Backen", "Dessert", "Frühstück", "Getränk", "Vorspeise", "Salat"
5. **Tags**: Generiere 3-10 relevante Tags auf Deutsch (z.B. "Italienisch", "Vegetarisch", "Schnell")
6. **Zeitangaben**:
   - prepTime: Vorbereitungszeit in Minuten (Schneiden, Wiegen, etc.)
   - cookTime: Aktive Kochzeit in Minuten
   - servings: Anzahl der Portionen
7. **Schwierigkeitsgrad**: "Einfach", "Mittel" oder "Schwer" basierend auf Schritten und Techniken

8. **Zutaten**: Liste alle Zutaten mit:
   - name: REINER Zutatename ohne Zubereitungsangaben (RICHTIG: "Tomaten", "Zwiebel", "Knoblauchzehe" — FALSCH: "frisch gehackte Tomaten", "fein gewürfelte Zwiebel", "gepresste Knoblauchzehe"). Der Name soll die Zutat selbst beschreiben, nicht wie sie zubereitet wird. Auf Deutsch.
   - amount: Numerischer Wert (konvertiere Brüche wie "1/2" zu 0.5). Wenn nicht klar, setze null
   - unit: Einheit auf Deutsch (g, ml, EL, TL, Stück, Prise, etc.). Wenn nicht klar, setze null
   - notes: Zubereitungshinweis als kurze Phrase (z.B. "frisch gehackt", "fein gewürfelt", "zimmerwarm", "in Scheiben", "geviertelt"). Nur angeben wenn die Zubereitung relevant ist — sonst null. Auf Deutsch.
   - Zutaten-IDs als einfache Indizes: "ingredient-0", "ingredient-1", etc. (Reihenfolge entspricht der Zutaten-Liste)

9. **Flow-Knoten (flowNodes)**: Konvertiere die Zubereitungsschritte in Flow-Knoten.
   Der ERSTE Knoten muss IMMER id="start" und type="start" sein.
   Der LETZTE Knoten muss IMMER id="servieren" und type="servieren" sein.

   Verfügbare Schritttypen (type):
   - "start"        → Pflichtknoten. Erster Knoten. Startet den Flow. label: "Los geht's!" oder ähnlich
   - "schneiden"    → Schneiden, Hacken, Würfeln, Reiben, Schälen, Zerkleinern
   - "kochen"       → Kochen, Sieden, Blanchieren, Dämpfen, Frittieren, Aufkochen
   - "braten"       → Anbraten, Sautieren, Pfannenrühren, Grillen
   - "backen"       → Backen, Rösten, Gratinieren, Ofengaren
   - "mixen"        → Mixen, Rühren, Schlagen, Kneten, Pürieren, Vermengen, Verrühren
   - "warten"       → Ruhen lassen, Marinieren, Abkühlen, Quellen lassen, Einweichen
   - "wuerzen"      → Würzen, Abschmecken, Verfeinern, Salzen, Pfeffern
   - "anrichten"    → Anrichten, Zusammenfügen, Aufteilen, Portionieren, Servieren vorbereiten
   - "servieren"    → Pflichtknoten. Letzter Knoten. Terminiert den Flow.

   Felder pro Knoten:
   - id: Eindeutige ID ("start", "step-1", "step-2", ..., "servieren")
   - type: Einer der obigen Typen
   - label: Kurzer Titel auf Deutsch (max. 50 Zeichen)
   - description: Detaillierte Beschreibung der Aktion auf Deutsch
   - duration: Dauer in Minuten als Integer (falls angegeben oder schätzbar, sonst null)
   - laneId: ID der parallelen Spur für parallele Prozesse (z.B. "vorbereitung", "hauptgang", "beilage")
   - ingredientIds: Array von Zutaten-IDs die in diesem Schritt verwendet werden (z.B. ["ingredient-0", "ingredient-2"])

10. **Flow-Kanten (flowEdges)**: Verbinde die Schritte logisch:
    - id: Eindeutige ID (z.B. "edge-1", "edge-2")
    - source: ID des Quellknotens
    - target: ID des Zielknotens
    - label: Optionale Beschriftung (z.B. "Zwiebeln", "Sauce") — null wenn keine sinnvolle Beschriftung

WICHTIGE REGELN:
- Erster Knoten: id="start", type="start", keine eingehenden Kanten
- Letzter Knoten: id="servieren", type="servieren", keine ausgehenden Kanten
- Alle Knoten außer "start" müssen mindestens eine eingehende Kante haben
- Alle Knoten außer "servieren" müssen mindestens eine ausgehende Kante haben
- Identifiziere parallele Prozesse (z.B. Sauce + Nudeln gleichzeitig) → unterschiedliche laneIds
- Bei parallelen Prozessen müssen beide Pfade irgendwann zum "servieren"-Knoten zusammenführen
- Keine Zyklen (kreisförmige Abhängigkeiten)
- Konvertiere alle Mengenangaben in numerische Werte

Antworte AUSSCHLIESSLICH mit dem geforderten JSON-Format ohne Markdown-Codeblocks oder Erklärungen.

ZUSAMMENFASSUNG DER PFLICHTREGELN:
1. Alle Texte und Zutaten-Namen → DEUTSCH
2. Erster Knoten: id="start", type="start"
3. Letzter Knoten: id="servieren", type="servieren"
4. Jeder Knoten (außer start) hat mind. 1 eingehende Kante
5. Jeder Knoten (außer servieren) hat mind. 1 ausgehende Kante
6. Keine Zyklen, keine isolierten Knoten
7. Zutaten-name = reiner Name ohne Zubereitungsangaben, auf Deutsch
8. Zutaten-notes = Zubereitungshinweis oder null
9. ingredientIds pro Knoten = welche Zutaten in diesem Schritt
10. Parallele Prozesse → unterschiedliche laneIds, beide münden in "servieren"`;

/**
 * Builds an optional context message with known DB tags and ingredients.
 * Sent as a separate user message so the static system prompt stays cacheable.
 * Returns null when there is no context to inject.
 */
function buildContextMessage(context?: ImportRecipeOptions['context']): string | null {
    const parts: string[] = [];

    if (context?.availableTags?.length) {
        parts.push(
            `VORHANDENE TAGS IN DER DATENBANK (bevorzuge diese, neue Tags sind aber erlaubt):\n${context.availableTags.join(', ')}`,
        );
    }

    if (context?.topIngredients?.length) {
        parts.push(
            `HÄUFIG VERWENDETE ZUTATEN (verwende exakt diese Schreibweise wenn zutreffend, damit bestehende Zutaten wiederverwendet werden):\n${context.topIngredients.join(', ')}`,
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

// Pricing (USD per 1M tokens) — gpt-5.4
const PRICE_INPUT = 2.5 / 1_000_000;
const PRICE_CACHED = 0.25 / 1_000_000;
const PRICE_OUTPUT = 15.0 / 1_000_000;

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
    /** OpenAI Model (Default: gpt-5.4) */
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
    const { model = 'gpt-5.4', temperature = 0.1, context } = options;

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
    const { model = 'gpt-5.4', temperature = 0.1, context } = options;

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
