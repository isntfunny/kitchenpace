'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

import type { Category, Tag, AddedIngredient } from '@app/components/recipe/RecipeForm/data';

import {
    saveImportedRecipe,
    checkScraplerHealth,
    type ScrapedContent,
    type AnalyzedRecipe,
    type FlowNodeInput,
    type FlowEdgeInput,
} from './actions';
import type { ImportStep, ProcessingStatus, StreamEvent } from './import-types';
import { runImportPipeline } from './runImportPipeline';

interface UseImportScrapingArgs {
    categories: Category[];
    tags: Tag[];
    authorId: string;
}

export function useImportScraping({ categories, tags: _tags, authorId }: UseImportScrapingArgs) {
    const router = useRouter();
    const op = useOpenPanel();

    // ── State ────────────────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState<ImportStep>('url');
    const [url, setUrl] = useState('');
    const [_scrapedContent, setScrapedContent] = useState<ScrapedContent | null>(null);
    const [analyzedRecipe, setAnalyzedRecipe] = useState<AnalyzedRecipe | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Processing state with live data
    const [status, setStatus] = useState<ProcessingStatus>({
        step: 'url',
        message: '',
        progress: 0,
    });

    // Stream events for live display
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);

    // Raw JSON being streamed from OpenAI — shown live in terminal
    const [streamingBuffer, setStreamingBuffer] = useState('');

    // Form state (for edit step)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [servings, setServings] = useState(4);
    const [prepTime, setPrepTime] = useState(0);
    const [cookTime, setCookTime] = useState(0);
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<AddedIngredient[]>([]);
    const flowNodesRef = useRef<FlowNodeInput[]>([]);
    const flowEdgesRef = useRef<FlowEdgeInput[]>([]);

    // ── Terminal ref (auto-scroll) ───────────────────────────────────────────
    const terminalRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = terminalRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [streamEvents]);

    // ── Stream Management ────────────────────────────────────────────────────

    const addStreamEvent = useCallback((event: StreamEvent) => {
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        setStreamEvents((prev) => [...prev, { ...event, timestamp }]);
    }, []);

    const clearStreamEvents = useCallback(() => {
        setStreamEvents([]);
    }, []);

    // Check scrapler health on mount
    useEffect(() => {
        checkScraplerHealth().then((isHealthy) => {
            if (!isHealthy) {
                console.warn('Scrapler service is not available');
            }
        });
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const startImport = useCallback(async () => {
        if (!url.trim()) {
            setError('Bitte gib eine URL ein.');
            return;
        }

        setError(null);
        clearStreamEvents();
        setStreamingBuffer('');

        await runImportPipeline(url.trim(), {
            setCurrentStep,
            setStatus: (fn) => setStatus(fn),
            setStatusDirect: (s) => setStatus(s),
            setScrapedContent,
            setAnalyzedRecipe,
            setStreamingBuffer,
            clearStreamingBuffer: () => setStreamingBuffer(''),
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
            trackEvent: (name, data) => op.track(name, data),
            categories,
        });
    }, [url, addStreamEvent, clearStreamEvents, categories, op]);

    const handleContinueToEdit = useCallback(() => {
        setCurrentStep('edit');
    }, []);

    const handleBackToPreview = useCallback(() => {
        setCurrentStep('preview');
    }, []);

    const handleSave = useCallback(async () => {
        if (!analyzedRecipe) return;

        setSaving(true);
        setError(null);

        try {
            const recipeData: AnalyzedRecipe = {
                title: title.trim(),
                description: description.trim(),
                imageUrl: imageUrl || undefined,
                sourceUrl: url || undefined,
                servings,
                prepTime,
                cookTime,
                difficulty,
                categoryIds,
                tags: analyzedRecipe.tags ?? [],
                ingredients: ingredients.map((ing) => ({
                    name: ing.name,
                    amount: ing.amount,
                    unit: ing.unit,
                    notes: ing.notes,
                    isOptional: ing.isOptional,
                })),
                flowNodes: flowNodesRef.current,
                flowEdges: flowEdgesRef.current,
            };

            const result = await saveImportedRecipe(recipeData, authorId);

            // Redirect to edit page
            router.push(`/recipe/${result.id}/edit`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
        } finally {
            setSaving(false);
        }
    }, [
        analyzedRecipe,
        title,
        description,
        imageUrl,
        url,
        servings,
        prepTime,
        cookTime,
        difficulty,
        categoryIds,
        ingredients,
        authorId,
        router,
    ]);

    const resetImport = useCallback(() => {
        setCurrentStep('url');
        setUrl('');
        setScrapedContent(null);
        setAnalyzedRecipe(null);
        clearStreamEvents();
    }, [clearStreamEvents]);

    return {
        // Step state
        currentStep,
        url,
        setUrl,
        analyzedRecipe,
        error,
        saving,
        status,
        streamEvents,
        streamingBuffer,
        terminalRef,

        // Form state
        title,
        setTitle,
        description,
        setDescription,
        imageUrl,
        setImageUrl,
        servings,
        setServings,
        prepTime,
        setPrepTime,
        cookTime,
        setCookTime,
        difficulty,
        setDifficulty,
        categoryIds,
        setCategoryIds,
        ingredients,
        setIngredients,

        // Handlers
        startImport,
        handleContinueToEdit,
        handleBackToPreview,
        handleSave,
        resetImport,
    };
}
