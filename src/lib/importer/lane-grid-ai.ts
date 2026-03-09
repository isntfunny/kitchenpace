// src/lib/importer/lane-grid-ai.ts
// Server-side function that calls OpenAI with the LaneGrid schema

import OpenAI from 'openai';

import {
    ImportedRecipeWithLaneGridSchema,
    getOpenAIResponseFormat as getLaneGridResponseFormat,
    type ImportedRecipeWithLaneGrid,
} from './lane-grid-ai-schema';
import { getOpenAIClient } from './openai-client';

// ============================================================================
// System prompt — explains the LaneGrid concept
// ============================================================================

const LANE_GRID_SYSTEM_PROMPT = `Du bist ein Experte für das Strukturieren von Rezeptabläufen.
Deine Aufgabe ist es, einen Rezepttext in eine LaneGrid-Struktur zu konvertieren — ein segmentbasiertes Raster das parallele Kochschritte visuell darstellt.

SPRACHE: Alle Ausgaben auf DEUTSCH. Übersetze fremdsprachige Rezepte vollständig.

KONZEPT LANEGRID:
Das Rezept wird als Sequenz von "Segmenten" dargestellt (von oben nach unten).
Jedes Segment hat eine oder mehrere "Lanes" (parallele Spalten).
- 1 Lane = sequenzieller Schritt (alles nacheinander)
- 2+ Lanes = parallele Prozesse (z.B. Sauce kochen WÄHREND Pasta kocht)

Jeder Split (1→N Lanes) oder Merge (N→1 Lane) erzeugt ein neues Segment.

BEISPIEL-ABLAUF:
[Segment 1: 1 Lane] Start → Zutaten vorbereiten
[Segment 2: 2 Lanes] Lane A: Sauce kochen | Lane B: Nudeln kochen
[Segment 3: 1 Lane] Zusammenführen → Servieren

REGELN:
1. Erstes Segment: IMMER 1 Lane, erster Schritt type="start", label="Los geht's!"
2. Letztes Segment: IMMER 1 Lane, letzter Schritt type="servieren", label="Servieren"
3. columnSpans: Breiten der Lanes als Integer-Array. [3]=volle Breite, [1,1,1]=drei gleich, [2,1]=2/3+1/3
4. lanes.length MUSS columnSpans.length entsprechen
5. Parallele Schritte = Segment mit mehreren Lanes
6. Nach parallelen Schritten: Merge-Segment mit 1 Lane (type="anrichten" oder "mixen")

STEP TYPES:
- "start" → Pflicht. Erster Schritt. "Los geht's!"
- "schneiden" → Schneiden, Hacken, Würfeln, Reiben, Schälen
- "kochen" → Kochen, Sieden, Blanchieren, Dämpfen
- "braten" → Anbraten, Sautieren, Grillen
- "backen" → Backen, Rösten, Gratinieren
- "mixen" → Mixen, Rühren, Schlagen, Kneten, Pürieren, Vermengen
- "warten" → Ruhen lassen, Marinieren, Abkühlen, Quellen
- "wuerzen" → Würzen, Abschmecken, Salzen, Pfeffern
- "anrichten" → Anrichten, Zusammenführen, Portionieren
- "servieren" → Pflicht. Letzter Schritt.

ZUTATEN:
- name: REINER Name ohne Zubereitungsangaben (RICHTIG: "Tomaten" — FALSCH: "gehackte Tomaten")
- notes: Zubereitungshinweis (z.B. "fein gehackt") oder null
- IDs: "ingredient-0", "ingredient-1", etc.

IDs:
- Segment: "seg-start", "seg-vorbereitung", "seg-parallel-1", "seg-zusammenfuehren", "seg-servieren"
- Schritte: "step-zwiebeln", "step-pasta-kochen", etc. Kurze sprechende Slugs, keine UUIDs.

TIPPS FÜR GUTE STRUKTUR:
- Identifiziere parallele Prozesse! Wenn Sauce und Beilage gleichzeitig zubereitet werden → parallele Lanes
- Vorbereitungsschritte (Schneiden, Wiegen) oft zusammen in 1 Segment VOR dem Kochen
- Nicht zu viele Schritte pro Lane — lieber ein neues Segment
- Duration in Minuten, null wenn nicht sinnvoll (z.B. Schneideschritte)

Antworte AUSSCHLIESSLICH mit dem geforderten JSON-Format.`;

// ============================================================================
// Main function
// ============================================================================

export interface LaneGridAIResult {
    success: true;
    data: ImportedRecipeWithLaneGrid;
    usage?: {
        inputTokens: number | null;
        outputTokens: number | null;
    };
}

export interface LaneGridAIError {
    success: false;
    error: string;
}

export type LaneGridAIResponse = LaneGridAIResult | LaneGridAIError;

export async function generateLaneGrid(text: string): Promise<LaneGridAIResponse> {
    try {
        const openai = getOpenAIClient();

        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: LANE_GRID_SYSTEM_PROMPT },
            {
                role: 'user',
                content: `Analysiere folgendes Rezept und konvertiere es in eine LaneGrid-Struktur:\n\n${text}`,
            },
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-5.4',
            messages,
            temperature: 0.1,
            response_format: getLaneGridResponseFormat(),
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            return { success: false, error: 'OpenAI hat keine Antwort zurückgegeben' };
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch {
            return { success: false, error: 'OpenAI-Antwort ist kein gültiges JSON' };
        }

        const validation = ImportedRecipeWithLaneGridSchema.safeParse(parsed);
        if (!validation.success) {
            const issues = validation.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ');
            return { success: false, error: `Validierung fehlgeschlagen: ${issues}` };
        }

        return {
            success: true,
            data: validation.data,
            usage: {
                inputTokens: completion.usage?.prompt_tokens ?? null,
                outputTokens: completion.usage?.completion_tokens ?? null,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        };
    }
}
