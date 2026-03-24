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

// ── Response schema ─────────────────────────────────────────────────────

function getEnrichResponseFormat(
    units: Array<{ shortName: string; longName: string }>,
    categories: Array<{ slug: string; name: string }>,
) {
    const coreProperties: Record<string, object> = {};
    for (const field of CORE_FIELDS) {
        coreProperties[field] = {
            type: 'number',
            description: `${field} pro 100g essbarem Anteil`,
        };
    }

    const optionalProperties: Record<string, object> = {};
    for (const field of OPTIONAL_FIELDS) {
        optionalProperties[field] = {
            type: 'number',
            nullable: true,
            description: `${field} pro 100g — NUR setzen wenn du dir absolut sicher bist, sonst null`,
        };
    }

    return {
        type: 'json_schema' as const,
        name: 'ingredient_enrichment',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                ...coreProperties,
                ...optionalProperties,
                source: {
                    type: 'string',
                    description:
                        'Kurze Quellenangabe (z.B. "USDA FoodData Central", "Schweizer Nährwertdatenbank")',
                },
                relevantUnits: {
                    type: 'array',
                    description:
                        'Einheiten die für diese Zutat sinnvoll sind. g (Gramm) MUSS immer enthalten sein. Wähle bis zu 4 weitere Einheiten die ein Koch tatsächlich verwenden würde. Qualität vor Quantität.',
                    minItems: 1,
                    maxItems: 5,
                    items: {
                        type: 'object',
                        properties: {
                            shortName: {
                                type: 'string',
                                enum: units.map((u) => u.shortName),
                            },
                            grams: {
                                type: 'number',
                                nullable: true,
                                description:
                                    'Ungefähres Gewicht in Gramm für 1 dieser Einheit (z.B. 1 Stück Kartoffel ≈ 150g, 1 TL Salz ≈ 5g). null falls nicht anwendbar.',
                            },
                        },
                        required: ['shortName', 'grams'],
                        additionalProperties: false,
                    },
                },
                categories: {
                    type: 'array',
                    description:
                        'Kategorie-Slugs die auf diese Zutat zutreffen. Wähle ALLE passenden Kategorien aus der Liste. Die meisten Zutaten haben 1-3 Kategorien.',
                    items: {
                        type: 'string',
                        enum: categories.map((c) => c.slug),
                    },
                },
            },
            required: [...ALL_FIELDS, 'source', 'relevantUnits', 'categories'],
            additionalProperties: false,
        },
    };
}

// ── System prompt ───────────────────────────────────────────────────────

function buildSystemPrompt(
    units: Array<{ shortName: string; longName: string }>,
    categories: Array<{ slug: string; name: string }>,
): string {
    const unitList = units.map((u) => `  - ${u.shortName} (${u.longName})`).join('\n');
    const categoryList = categories.map((c) => `  - ${c.slug} → ${c.name}`).join('\n');

    return `Du bist ein Ernährungswissenschaftler und Lebensmittelexperte. Deine Aufgabe ist es, eine Zutat vollständig zu charakterisieren:
1. Nährwerte pro 100g essbarem Anteil
2. Relevante Einheiten mit ungefährem Gewicht pro Stück/Einheit
3. Passende Kategorien

NÄHRWERT-REGELN:
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
  - Fettsäuren (gesättigt, einfach/mehrfach ungesättigt, Linolsäure, Alpha-Linolensäure): g

EINHEITEN-REGELN:
- Wähle die BIS ZU 4 WICHTIGSTEN Einheiten aus der Liste, die ein Koch am häufigsten für diese Zutat verwenden würde.
- g (Gramm) zählt NICHT zum Limit — g ist immer dabei.
- WICHTIG: Große Einheiten (kg, L) NUR wenn sie zur Zutat passen! kg ist sinnvoll für Mehl, Kartoffeln, Fleisch — NICHT für Gewürze, Kräuter, Saucen. L ist sinnvoll für Milch, Wasser, Brühe — NICHT für Honig, Senf, Pasten. Frage dich: "Würde ein Koch diese Zutat in dieser Einheit kaufen/abmessen?"
- Stk (Stück) NUR wenn die Zutat natürlich in zählbaren Einheiten vorkommt (Eier, Zwiebeln, Äpfel, Knoblauchzehen etc.).
- EL (Esslöffel) und TL (Teelöffel) sind relevant für Gewürze, Öle, Saucen, Pasten, Pulver, Honig, Sirup etc.
- ml ist relevant für Flüssigkeiten, die in kleinen Mengen verwendet werden (Essig, Sojasauce, Extrakte).
- Für JEDE gewählte Einheit: gib das ungefähre Gewicht in Gramm an (z.B. 1 Stück mittelgroße Kartoffel ≈ 150g, 1 EL Olivenöl ≈ 13g, 1 TL Salz ≈ 5g, 1 ml Wasser ≈ 1g).
- Qualität vor Quantität — nur Einheiten die ein Koch für DIESE SPEZIFISCHE Zutat tatsächlich benutzen würde.
- BEISPIELE: Agavendicksaft → EL, TL (nicht kg, nicht L). Mehl → kg, EL (nicht ml). Milch → ml, L (nicht kg). Salz → TL, Prise (nicht kg, nicht L).

VERFÜGBARE EINHEITEN:
${unitList}

KATEGORIE-REGELN:
- Wähle ALLE passenden Kategorien aus der Liste. Die meisten Zutaten haben 1-3 Kategorien.
- Eine Zutat kann mehreren Kategorien angehören (z.B. "Tomate" → Gemüse; "Olivenöl" → Öle & Fette).

VERFÜGBARE KATEGORIEN:
${categoryList}`;
}

// ── OpenAI client ───────────────────────────────────────────────────────

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (_openai) return _openai;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey, organization: process.env.OPENAI_ORG_ID });
    return _openai;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractTextFromResponse(response: OpenAI.Responses.Response): string {
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

    return content.text;
}

// ── Main processor ──────────────────────────────────────────────────────

export async function processEnrichIngredientNutrition(
    job: Job<EnrichIngredientNutritionJob>,
): Promise<{
    success: boolean;
    ingredientId: string;
    name: string;
    fieldsUpdated: number;
    source?: string;
    units: Array<{ shortName: string; grams: number | null }>;
    autoApproved: boolean;
}> {
    const { ingredientId } = job.data;

    if (!ingredientId) {
        throw new Error('[EnrichWorker] ingredientId is empty — cannot enrich');
    }

    console.log(`[EnrichWorker] Enriching ingredient ${ingredientId}`);

    // Fetch ingredient with existing enrichment state
    const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        select: {
            id: true,
            name: true,
            energyKcal: true,
            ingredientUnits: { select: { unitId: true } },
            categories: { select: { id: true } },
        },
    });

    if (!ingredient) {
        console.log(`[EnrichWorker] Ingredient ${ingredientId} not found — skipping`);
        return {
            success: false,
            ingredientId,
            name: '',
            fieldsUpdated: 0,
            units: [],
            autoApproved: false,
        };
    }

    const hasNutrition = ingredient.energyKcal != null;
    const hasUnits = ingredient.ingredientUnits.length > 0;
    const hasCategories = ingredient.categories.length > 0;

    if (hasNutrition && hasUnits && hasCategories) {
        console.log(`[EnrichWorker] ${ingredient.name} already fully enriched — skipping`);
        return {
            success: true,
            ingredientId,
            name: ingredient.name,
            fieldsUpdated: 0,
            units: [],
            autoApproved: false,
        };
    }

    // Load available units and categories for the AI prompt
    const [allUnits, allCategories] = await Promise.all([
        prisma.unit.findMany({ select: { id: true, shortName: true, longName: true } }),
        prisma.ingredientCategory.findMany({
            select: { id: true, slug: true, name: true },
        }),
    ]);

    // Build lookup maps
    const unitByShortName = new Map(allUnits.map((u) => [u.shortName, u.id]));
    const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));

    const openai = getOpenAIClient();

    const systemPrompt = buildSystemPrompt(allUnits, allCategories);

    const response = await openai.responses.create({
        model: 'gpt-5.4',
        tools: [{ type: 'web_search_preview' }],
        instructions: systemPrompt,
        input: `Bestimme Nährwerte, relevante Einheiten und Kategorien für: "${ingredient.name}"`,
        text: {
            format: getEnrichResponseFormat(allUnits, allCategories),
        },
    });

    const parsed = JSON.parse(extractTextFromResponse(response)) as Record<string, unknown>;

    let fieldsUpdated = 0;
    const assignedUnits: Array<{ shortName: string; grams: number | null }> = [];
    let autoApproved = false;

    // ── 1. Nutrition ────────────────────────────────────────────────────
    if (!hasNutrition) {
        const nutritionData: Record<string, number> = {};
        for (const field of ALL_FIELDS) {
            const value = parsed[field];
            if (typeof value === 'number' && !Number.isNaN(value)) {
                nutritionData[field] = value;
            }
        }

        if (Object.keys(nutritionData).length > 0) {
            await prisma.ingredient.update({
                where: { id: ingredientId },
                data: nutritionData,
            });
            fieldsUpdated += Object.keys(nutritionData).length;
        }
    }

    // ── 2. Relevant units with gram weights ─────────────────────────────
    if (!hasUnits) {
        const relevantUnits = parsed.relevantUnits;
        if (Array.isArray(relevantUnits) && relevantUnits.length > 0) {
            const unitRecords: Array<{
                ingredientId: string;
                unitId: string;
                grams: number | null;
            }> = [];

            for (const entry of relevantUnits) {
                if (typeof entry !== 'object' || entry === null) continue;
                const { shortName, grams } = entry as { shortName: string; grams: number | null };
                const unitId = unitByShortName.get(shortName);
                if (!unitId) continue;

                const gramsValue = typeof grams === 'number' && !Number.isNaN(grams) ? grams : null;
                unitRecords.push({ ingredientId, unitId, grams: gramsValue });
                assignedUnits.push({ shortName, grams: gramsValue });
            }

            if (unitRecords.length > 0) {
                await prisma.ingredientUnit.createMany({
                    data: unitRecords,
                    skipDuplicates: true,
                });
                fieldsUpdated += unitRecords.length;
                console.log(
                    `[EnrichWorker] Linked ${unitRecords.length} units for "${ingredient.name}"`,
                );
            }
        }
    }

    // ── 3. Categories ───────────────────────────────────────────────────
    if (!hasCategories) {
        const categories = parsed.categories;
        if (Array.isArray(categories) && categories.length > 0) {
            const categoryIds = categories
                .filter((slug): slug is string => typeof slug === 'string')
                .map((slug) => categoryBySlug.get(slug))
                .filter((id): id is string => id != null);

            if (categoryIds.length > 0) {
                await prisma.ingredient.update({
                    where: { id: ingredientId },
                    data: {
                        categories: {
                            connect: categoryIds.map((id) => ({ id })),
                        },
                    },
                });
                fieldsUpdated += categoryIds.length;
                console.log(
                    `[EnrichWorker] Linked ${categoryIds.length} categories for "${ingredient.name}"`,
                );
            }
        }
    }

    const source = typeof parsed.source === 'string' ? parsed.source : undefined;
    console.log(
        `[EnrichWorker] Enriched "${ingredient.name}" — ${fieldsUpdated} fields/links updated (source: ${source ?? 'unknown'})`,
    );

    // ── Auto-approve if sanity checks pass ────────────────────────────
    const refreshed = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        select: {
            needsReview: true,
            energyKcal: true,
            protein: true,
            fat: true,
            carbs: true,
            ingredientUnits: { select: { unitId: true } },
            categories: { select: { id: true } },
            _count: { select: { recipes: true } },
        },
    });

    if (refreshed?.needsReview) {
        const kcal = refreshed.energyKcal;
        const unitCount = refreshed.ingredientUnits.length;
        const recipeCount = refreshed._count.recipes;
        const categoryCount = refreshed.categories.length;
        const macroSum = (refreshed.protein ?? 0) + (refreshed.fat ?? 0) + (refreshed.carbs ?? 0);

        const reasons: string[] = [];
        if (kcal == null) reasons.push('keine kcal');
        else if (kcal < 0 || kcal > 900) reasons.push(`kcal unplausibel (${kcal})`);
        if (unitCount < 1 || unitCount > 5) reasons.push(`units: ${unitCount}`);
        if (recipeCount < 1) reasons.push('kein Rezept');
        if (categoryCount < 1) reasons.push('keine Kategorie');
        if (macroSum > 105) reasons.push(`Makros zu hoch (${Math.round(macroSum)}g/100g)`);

        if (reasons.length === 0) {
            await prisma.ingredient.update({
                where: { id: ingredientId },
                data: { needsReview: false },
            });
            autoApproved = true;
            console.log(
                `[EnrichWorker] Auto-approved "${ingredient.name}" (${recipeCount} recipes, ${unitCount} units, ${categoryCount} categories)`,
            );
        } else {
            console.log(
                `[EnrichWorker] "${ingredient.name}" still needs review: ${reasons.join(', ')}`,
            );
        }
    }

    return {
        success: true,
        ingredientId,
        name: ingredient.name,
        fieldsUpdated,
        source,
        units: assignedUnits,
        autoApproved,
    };
}
