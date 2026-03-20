import { Job } from 'bullmq';
import OpenAI from 'openai';

import { prisma } from './prisma';
import type { EnrichIngredientNutritionJob } from './types';

const CORE_FIELDS = ['energyKcal', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'salt'] as const;

const OPTIONAL_FIELDS = [
    'energyKj',
    'saturatedFat',
    'monoUnsaturatedFat',
    'polyUnsaturatedFat',
    'cholesterol',
    'starch',
    'alcohol',
    'water',
    'sodium',
    'vitaminA_RE',
    'vitaminC',
    'vitaminD',
    'vitaminE',
    'vitaminB1',
    'vitaminB2',
    'vitaminB6',
    'vitaminB12',
    'niacin',
    'folate',
    'pantothenicAcid',
    'potassium',
    'calcium',
    'magnesium',
    'phosphorus',
    'iron',
    'iodine',
    'zinc',
    'selenium',
    'retinol',
    'betaCarotene',
    'linoleicAcid',
    'alphaLinolenicAcid',
    'chloride',
] as const;

const ALL_FIELDS = [...CORE_FIELDS, ...OPTIONAL_FIELDS] as const;

function getNutritionResponseFormat() {
    const coreProperties: Record<string, object> = {};
    for (const field of CORE_FIELDS) {
        coreProperties[field] = {
            type: 'number',
            description: `${field} per 100g of edible portion`,
        };
    }

    const optionalProperties: Record<string, object> = {};
    for (const field of OPTIONAL_FIELDS) {
        optionalProperties[field] = {
            type: 'number',
            nullable: true,
            description: `${field} per 100g — set ONLY if you are absolutely certain about this value, otherwise null`,
        };
    }

    return {
        type: 'json_schema' as const,
        name: 'ingredient_nutrition',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                ...coreProperties,
                ...optionalProperties,
                source: {
                    type: 'string',
                    description:
                        'Brief citation of the data source (e.g. "USDA FoodData Central", "Swiss Food Composition Database")',
                },
            },
            required: [...ALL_FIELDS, 'source'],
            additionalProperties: false,
        },
    };
}

const SYSTEM_PROMPT = `Du bist ein Ernährungswissenschaftler. Deine Aufgabe ist es, die Nährwerte pro 100g essbarem Anteil für eine gegebene Zutat zu bestimmen.

REGELN:
- Alle Werte beziehen sich auf 100g des essbaren Anteils (roh, unverarbeitet sofern nicht anders angegeben).
- Nutze die Web-Suche um aktuelle, verlässliche Nährwertdatenbanken zu konsultieren (USDA, BLS, Swiss Food Composition Database, etc.).
- Die Kernwerte (energyKcal, protein, fat, carbs, fiber, sugar, salt) MÜSSEN immer gesetzt werden.
- Alle optionalen Werte (Vitamine, Mineralien, etc.) dürfen NUR gesetzt werden, wenn du dir über den Wert ABSOLUT SICHER bist. Im Zweifel: null.
- Einheiten: energyKcal in kcal, energyKj in kJ, alle anderen in g, mg oder µg wie in Standard-Nährwerttabellen üblich.
  - Vitamine B1, B2, B6, E: mg
  - Vitamin B12, D, Selen, Jod: µg
  - Vitamin C, Niacin, Folat, Pantothensäure: mg
  - Vitamin A (RE, RAE), Retinol, Beta-Carotin: µg
  - Mineralien (Kalium, Calcium, Magnesium, Phosphor, Eisen, Zink, Chlorid, Natrium): mg
  - Cholesterin: mg
  - Alle Makronährstoffe (Fett, Protein, Kohlenhydrate, Ballaststoffe, Zucker, Salz, Stärke, Alkohol, Wasser): g
  - Fettsäuren (gesättigt, einfach/mehrfach ungesättigt, Linolsäure, Alpha-Linolensäure): g`;

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (_openai) return _openai;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey, organization: process.env.OPENAI_ORG_ID });
    return _openai;
}

export async function processEnrichIngredientNutrition(
    job: Job<EnrichIngredientNutritionJob>,
): Promise<{ success: boolean; ingredientId: string; fieldsUpdated: number; source?: string }> {
    const { ingredientId } = job.data;
    console.log(`[NutritionWorker] Enriching nutrition for ingredient ${ingredientId}`);

    const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        select: { id: true, name: true, energyKcal: true },
    });

    if (!ingredient) {
        console.log(`[NutritionWorker] Ingredient ${ingredientId} not found — skipping`);
        return { success: false, ingredientId, fieldsUpdated: 0 };
    }

    if (ingredient.energyKcal != null) {
        console.log(`[NutritionWorker] ${ingredient.name} already has nutrition data — skipping`);
        return { success: true, ingredientId, fieldsUpdated: 0 };
    }

    const openai = getOpenAIClient();

    const response = await openai.responses.create({
        model: 'gpt-5.4',
        tools: [{ type: 'web_search_preview' }],
        instructions: SYSTEM_PROMPT,
        input: `Bestimme die Nährwerte pro 100g für: "${ingredient.name}"`,
        text: {
            format: getNutritionResponseFormat(),
        },
    });

    const textOutput = response.output.find(
        (o): o is Extract<(typeof response.output)[number], { type: 'message' }> =>
            o.type === 'message',
    );
    if (!textOutput) {
        throw new Error('No message output from OpenAI Responses API');
    }

    const content = textOutput.content.find(
        (c): c is Extract<(typeof textOutput.content)[number], { type: 'output_text' }> =>
            c.type === 'output_text',
    );
    if (!content) {
        throw new Error('No output_text content in response');
    }

    const parsed = JSON.parse(content.text) as Record<string, unknown>;

    // Build update payload — only include non-null values
    const updateData: Record<string, number> = {};
    for (const field of ALL_FIELDS) {
        const value = parsed[field];
        if (typeof value === 'number' && !Number.isNaN(value)) {
            updateData[field] = value;
        }
    }

    const fieldsUpdated = Object.keys(updateData).length;
    if (fieldsUpdated === 0) {
        console.log(`[NutritionWorker] No nutrition data returned for "${ingredient.name}"`);
        return { success: false, ingredientId, fieldsUpdated: 0 };
    }

    await prisma.ingredient.update({
        where: { id: ingredientId },
        data: updateData,
    });

    const source = typeof parsed.source === 'string' ? parsed.source : undefined;
    console.log(
        `[NutritionWorker] Updated ${fieldsUpdated} fields for "${ingredient.name}" (source: ${source ?? 'unknown'})`,
    );

    return { success: true, ingredientId, fieldsUpdated, source };
}
