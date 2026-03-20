import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';

import {
    matchImportedIngredients,
    scrapeRecipe,
    type ScrapedContent,
    type AnalyzedRecipe,
    type FlowNodeInput,
    type FlowEdgeInput,
} from './actions';
import type { ProcessingStatus, StreamEvent } from './import-types';

interface CategoryLookup {
    id: string;
    slug: string;
}

interface ImportPipelineCallbacks {
    setCurrentStep: (step: 'scraping' | 'analyzing' | 'preview' | 'url') => void;
    setStatus: (fn: (prev: ProcessingStatus) => ProcessingStatus) => void;
    setStatusDirect: (status: ProcessingStatus) => void;
    setScrapedContent: (content: ScrapedContent | null) => void;
    setAnalyzedRecipe: (recipe: AnalyzedRecipe) => void;
    setStreamingBuffer: (fn: (prev: string) => string) => void;
    clearStreamingBuffer: () => void;
    addStreamEvent: (event: StreamEvent) => void;
    setError: (error: string | null) => void;

    // Form setters
    setTitle: (v: string) => void;
    setDescription: (v: string) => void;
    setImageUrl: (v: string) => void;
    setServings: (v: number) => void;
    setPrepTime: (v: number) => void;
    setCookTime: (v: number) => void;
    setDifficulty: (v: 'EASY' | 'MEDIUM' | 'HARD') => void;
    setCategoryIds: (v: string[]) => void;
    setIngredients: (v: AddedIngredient[]) => void;
    flowNodesRef: React.MutableRefObject<FlowNodeInput[]>;
    flowEdgesRef: React.MutableRefObject<FlowEdgeInput[]>;

    // External
    trackEvent: (name: string, data: Record<string, unknown>) => void;
    categories: CategoryLookup[];
}

export async function runImportPipeline(
    url: string,
    callbacks: ImportPipelineCallbacks,
): Promise<void> {
    const {
        setCurrentStep,
        setStatus,
        setStatusDirect,
        setScrapedContent,
        setAnalyzedRecipe,
        setStreamingBuffer,
        clearStreamingBuffer,
        addStreamEvent,
        setError,
        setTitle,
        setDescription,
        setImageUrl,
        setServings,
        setPrepTime,
        setCookTime,
        setDifficulty,
        setCategoryIds,
        setIngredients,
        flowNodesRef,
        flowEdgesRef,
        trackEvent,
        categories,
    } = callbacks;

    setCurrentStep('scraping');

    // Initial status
    setStatusDirect({
        step: 'scraping',
        message: 'Verbindung wird hergestellt...',
        progress: 5,
        liveData: { url: url.trim() },
    });

    addStreamEvent({ type: 'progress', message: 'Import gestartet', detail: url.trim() });
    trackEvent('recipe_import_started', { url: url.trim() });

    try {
        // ── PHASE 1: SCRAPING ──
        addStreamEvent({ type: 'progress', message: 'GET ' + url.trim() });
        addStreamEvent({
            type: 'progress',
            message: 'Warte auf Antwort des Scrapling-Dienstes...',
        });
        setStatus((prev) => ({ ...prev, message: 'Seite wird geladen...', progress: 20 }));

        const scraped = await scrapeRecipe(url);
        setScrapedContent(scraped);

        setStatus((prev) => ({
            ...prev,
            message: 'Inhalt extrahiert',
            progress: 50,
            liveData: { ...prev.liveData, markdownLength: scraped.markdown.length },
        }));
        addStreamEvent({ type: 'complete', message: 'HTTP 200 OK — Seite geladen' });
        addStreamEvent({
            type: 'data',
            message: 'markdown.length',
            detail: `${scraped.markdown.length} chars`,
        });
        if (scraped.title) {
            addStreamEvent({
                type: 'data',
                message: 'title',
                detail: `"${scraped.title}"`,
            });
        }
        if (scraped.imageUrl) {
            addStreamEvent({ type: 'data', message: 'image_url', detail: scraped.imageUrl });
        }
        // Show first 200 chars of markdown as a preview
        const preview = scraped.markdown.replace(/\s+/g, ' ').trim().slice(0, 180);
        addStreamEvent({ type: 'data', message: 'markdown preview', detail: preview + '…' });

        // ── PHASE 2: AI ANALYSIS (streaming) ──
        setCurrentStep('analyzing');
        setStatusDirect({
            step: 'analyzing',
            message: 'KI analysiert das Rezept...',
            progress: 60,
            liveData: { markdownLength: scraped.markdown.length },
        });
        addStreamEvent({
            type: 'progress',
            message: 'POST /api/ai/import-stream',
            detail: 'model=gpt-5.4  stream=true  response_format=json_schema',
        });

        const streamResponse = await fetch('/api/ai/import-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markdown: scraped.markdown, sourceUrl: url }),
        });

        if (!streamResponse.ok || !streamResponse.body) {
            throw new Error(`Stream request failed: ${streamResponse.status}`);
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let analyzed: AnalyzedRecipe | null = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            // Split on SSE message boundaries (\n\n)
            const parts = sseBuffer.split('\n\n');
            sseBuffer = parts.pop() ?? '';

            for (const part of parts) {
                const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
                if (!dataLine) continue;

                let event: { type: string; [key: string]: unknown };
                try {
                    event = JSON.parse(dataLine.slice(6));
                } catch {
                    continue;
                }

                if (event.type === 'start') {
                    addStreamEvent({
                        type: 'progress',
                        message: 'Stream geöffnet',
                        detail: `model=${event.model as string}`,
                    });
                } else if (event.type === 'delta') {
                    setStreamingBuffer((prev) => prev + (event.text as string));
                } else if (event.type === 'usage') {
                    const inp = event.inputTokens as number | null;
                    const cached = event.cachedInputTokens as number | null;
                    const out = event.outputTokens as number | null;
                    const cost = event.estimatedCostUsd as number | null;
                    addStreamEvent({
                        type: 'data',
                        message: 'tokens',
                        detail: `in=${inp ?? '?'} cached=${cached ?? 0} out=${out ?? '?'}`,
                    });
                    if (cost != null) {
                        addStreamEvent({
                            type: 'data',
                            message: 'estimated_cost',
                            detail: `$${cost.toFixed(6)}`,
                        });
                    }
                } else if (event.type === 'done') {
                    const raw = event.data as AnalyzedRecipe;
                    // categoryIds from the stream are slugs — resolve to real DB IDs now
                    const resolvedCategoryIds = (raw.categoryIds ?? [])
                        .map((slug) => categories.find((c) => c.slug === slug)?.id)
                        .filter((id): id is string => id != null);
                    analyzed = { ...raw, categoryIds: resolvedCategoryIds };
                    clearStreamingBuffer();
                } else if (event.type === 'error') {
                    throw new Error(event.message as string);
                }
            }
        }

        if (!analyzed) {
            throw new Error('Keine Daten vom KI-Stream erhalten');
        }

        // Merge scraped image URL into analyzed recipe (AI doesn't extract images)
        if (scraped.imageUrl && !analyzed.imageUrl) {
            analyzed = { ...analyzed, imageUrl: scraped.imageUrl };
        }

        setAnalyzedRecipe(analyzed);

        // Final updates
        setStatusDirect({
            step: 'preview',
            message: 'Fertig!',
            progress: 100,
            liveData: {
                markdownLength: scraped.markdown.length,
                nodesFound: analyzed.flowNodes.length,
                edgesFound: analyzed.flowEdges.length,
            },
        });

        addStreamEvent({ type: 'complete', message: 'OpenAI response received' });
        addStreamEvent({
            type: 'data',
            message: 'recipe.title',
            detail: `"${analyzed.title}"`,
        });
        addStreamEvent({
            type: 'data',
            message: 'recipe.difficulty',
            detail: analyzed.difficulty ?? 'MEDIUM',
        });
        addStreamEvent({
            type: 'data',
            message: 'ingredients.length',
            detail: String(analyzed.ingredients.length),
        });
        addStreamEvent({
            type: 'data',
            message: 'flowNodes.length',
            detail: String(analyzed.flowNodes.length),
        });
        addStreamEvent({
            type: 'data',
            message: 'flowEdges.length',
            detail: String(analyzed.flowEdges.length),
        });
        if (analyzed.tags?.length) {
            addStreamEvent({ type: 'data', message: 'tags', detail: analyzed.tags.join(', ') });
        }
        addStreamEvent({ type: 'complete', message: 'Analyse erfolgreich abgeschlossen' });
        trackEvent('recipe_import_completed', {
            node_count: analyzed.flowNodes.length,
            ingredient_count: analyzed.ingredients.length,
        });

        // Set form state from analyzed recipe
        setTitle(analyzed.title);
        setDescription(analyzed.description || '');
        setImageUrl(analyzed.imageUrl || '');
        setServings(analyzed.servings || 4);
        setPrepTime(analyzed.prepTime || 0);
        setCookTime(analyzed.cookTime || 0);
        setDifficulty(analyzed.difficulty || 'MEDIUM');
        setCategoryIds(analyzed.categoryIds || []);

        // Match ingredients against DB (lookup only, no creation)
        addStreamEvent({ type: 'progress', message: 'Zutaten werden abgeglichen...' });
        const matches = await matchImportedIngredients(analyzed.ingredients.map((i) => i.name));

        // Transform ingredients to AddedIngredient format with match info
        const addedIngredients: AddedIngredient[] = analyzed.ingredients.map((ing, idx) => ({
            id: `imported_${idx}`,
            name: ing.name,
            pluralName: null,
            amount: ing.amount,
            unit: ing.unit,
            availableUnits: [
                ...new Set(ing.unit ? [ing.unit, 'g', 'ml', 'Stk'] : ['g', 'ml', 'Stk']),
            ],
            notes: ing.notes || '',
            isOptional: ing.isOptional,
            isNew: matches[idx]?.status === 'new',
            matchStatus: matches[idx]?.status,
            matchedName: matches[idx]?.matchedName,
        }));
        setIngredients(addedIngredients);

        // Store flow data
        flowNodesRef.current = analyzed.flowNodes;
        flowEdgesRef.current = analyzed.flowEdges;

        setCurrentStep('preview');
    } catch (err) {
        addStreamEvent({
            type: 'error',
            message: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
        });
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.');
        setCurrentStep('url');
        setStatusDirect({ step: 'url', message: '', progress: 0 });
    }
}
