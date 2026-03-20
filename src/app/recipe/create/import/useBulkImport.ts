import { useOpenPanel } from '@openpanel/nextjs';
import { useState, useCallback, useRef } from 'react';

import {
    scrapeRecipe,
    analyzeWithAI,
    saveImportedRecipe,
    checkScraplerHealth,
    type AnalyzedRecipe,
} from './actions';
import type { BulkItem, BulkStep } from './bulk-import-types';

// ── Shared predicates ─────────────────────────────────────────────────────────

const isAwaitingAnalysis = (item: BulkItem) =>
    item.status === 'scraped' && Boolean(item.scrapedMarkdown);

const isReviewable = (item: BulkItem) =>
    item.status === 'done' && item.recipe && !item.savedId && !item.skipped;

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseBulkImportOptions {
    authorId: string;
}

export function useBulkImport({ authorId }: UseBulkImportOptions) {
    const op = useOpenPanel();

    // ── State ────────────────────────────────────────────────────────────────
    const [step, setStep] = useState<BulkStep>('urls');
    const [urlText, setUrlText] = useState('');
    const [items, setItems] = useState<BulkItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // For inline edit during review
    const [editTitle, setEditTitle] = useState('');
    const [editServings, setEditServings] = useState(4);
    const [editDifficulty, setEditDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [editImageUrl, setEditImageUrl] = useState('');

    const abortRef = useRef(false);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const parseUrls = useCallback((text: string): string[] => {
        return text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => {
                if (!line) return false;
                try {
                    new URL(line);
                    return true;
                } catch {
                    return false;
                }
            });
    }, []);

    const validUrls = parseUrls(urlText);

    /** Items that have a recipe ready for review (done + not yet saved/skipped) */
    const reviewableItems = items.filter(isReviewable);

    // Always review the first remaining item
    const currentReviewItem = reviewableItems[0] ?? null;

    // Derived: true when an item is currently being analyzed by AI
    const analyzing = items.some((item) => item.status === 'analyzing');

    // Load edit fields when review item changes
    const loadEditFields = useCallback((recipe: AnalyzedRecipe, imageUrl?: string) => {
        setEditTitle(recipe.title);
        setEditServings(recipe.servings ?? 4);
        setEditDifficulty(recipe.difficulty ?? 'MEDIUM');
        setEditImageUrl(imageUrl ?? recipe.imageUrl ?? '');
    }, []);

    // ── Analyze next scraped item ─────────────────────────────────────────────

    /**
     * Find the next scraped (not yet analyzed) item, run AI analysis on it,
     * and present it for review. Uses a loop instead of recursion to avoid
     * stack growth when consecutive items fail.
     *
     * This is called:
     * 1. After all scraping finishes (for the first recipe)
     * 2. After each save/skip (for subsequent recipes)
     *
     * Sequential analysis ensures each recipe's AI context includes
     * ingredients created by previously saved recipes.
     */
    const analyzeNextItem = useCallback(
        async (currentItems: BulkItem[]) => {
            const updatedItems = [...currentItems];

            // Loop through scraped items until one succeeds or none remain

            while (true) {
                const nextIdx = updatedItems.findIndex(isAwaitingAnalysis);

                if (nextIdx === -1) {
                    // No more scraped items — check if we're done
                    if (!updatedItems.some(isReviewable)) {
                        setStep('done');
                    }
                    return;
                }

                // Update status to analyzing
                updatedItems[nextIdx] = { ...updatedItems[nextIdx], status: 'analyzing' };
                setItems([...updatedItems]);

                try {
                    const item = updatedItems[nextIdx];
                    const analyzed = await analyzeWithAI(item.scrapedMarkdown!, item.url, authorId);

                    const recipe: AnalyzedRecipe = {
                        ...analyzed,
                        imageUrl: item.scrapedImageUrl || analyzed.imageUrl,
                    };

                    updatedItems[nextIdx] = { ...updatedItems[nextIdx], status: 'done', recipe };
                    setItems([...updatedItems]);
                    loadEditFields(recipe, recipe.imageUrl);
                    return; // Success — present for review
                } catch (err) {
                    updatedItems[nextIdx] = {
                        ...updatedItems[nextIdx],
                        status: 'error',
                        error: err instanceof Error ? err.message : 'KI-Analyse fehlgeschlagen',
                    };
                    setItems([...updatedItems]);
                    // Loop continues to try the next scraped item
                }
            }
        },
        [authorId, loadEditFields],
    );

    // ── Start bulk processing ─────────────────────────────────────────────────
    // Phase 1: Parallel scraping only (up to 10 concurrent)
    // Phase 2: Sequential AI analysis triggered per-recipe during review

    const startBulkImport = useCallback(async () => {
        if (validUrls.length === 0) {
            setError('Bitte gib mindestens eine gültige URL ein.');
            return;
        }

        setError(null);
        abortRef.current = false;

        const initialItems: BulkItem[] = validUrls.map((url) => ({
            url,
            status: 'pending' as const,
        }));
        setItems(initialItems);
        setStep('processing');

        op.track('bulk_import_started', { url_count: validUrls.length });

        // Check scraper health first
        let healthy = false;
        try {
            healthy = await checkScraplerHealth();
        } catch {
            // scraper unreachable
        }
        if (!healthy) {
            setError('Der Scraping-Dienst ist nicht erreichbar. Bitte später erneut versuchen.');
            setStep('urls');
            return;
        }

        // ── Phase 1: Parallel scraping ──────────────────────────────────────
        const results: BulkItem[] = [...initialItems];

        const updateItem = (index: number, patch: Partial<BulkItem>) => {
            results[index] = { ...results[index], ...patch };
            setItems([...results]);
        };

        const scrapeOne = async (index: number) => {
            if (abortRef.current) return;

            updateItem(index, { status: 'scraping' });

            try {
                const scraped = await scrapeRecipe(results[index].url);

                updateItem(index, {
                    status: 'scraped',
                    scrapedMarkdown: scraped.markdown,
                    scrapedImageUrl: scraped.imageUrl || undefined,
                });
            } catch (err) {
                updateItem(index, {
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Scraping fehlgeschlagen',
                });
            }
        };

        // Parallel queue: up to 10 concurrent workers (scraping only)
        const CONCURRENCY = 10;
        const queue = [...initialItems.keys()];
        let cursor = 0;

        const worker = async () => {
            while (cursor < queue.length) {
                if (abortRef.current) break;
                const idx = cursor++;
                if (idx < queue.length) {
                    await scrapeOne(idx);
                }
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
        );

        // ── Phase 2: Start sequential analysis with the first scraped item ──
        const scrapedCount = results.filter(isAwaitingAnalysis).length;
        if (scrapedCount > 0) {
            setStep('review');
            // Analyze the first scraped recipe
            await analyzeNextItem(results);
        } else {
            setError('Keines der Rezepte konnte geladen werden.');
            setStep('urls');
        }

        op.track('bulk_import_scraping_done', {
            scraped: scrapedCount,
            failed: results.filter((p) => p.status === 'error').length,
        });
    }, [validUrls, op, analyzeNextItem]);

    // ── Review actions ───────────────────────────────────────────────────────

    /**
     * After saving/skipping, decide what to do next based on the updated items.
     * Accepts the updated items array directly to avoid stale state from batching.
     */
    const advanceWithItems = useCallback(
        async (updatedItems: BulkItem[]) => {
            const nextReviewable = updatedItems.find(isReviewable);

            if (nextReviewable?.recipe) {
                // There's already an analyzed item ready — show it
                loadEditFields(nextReviewable.recipe, nextReviewable.recipe.imageUrl);
            } else if (updatedItems.some(isAwaitingAnalysis)) {
                // Analyze the next scraped recipe
                await analyzeNextItem(updatedItems);
            } else {
                setStep('done');
            }
        },
        [analyzeNextItem, loadEditFields],
    );

    const handleSaveAndNext = useCallback(async () => {
        if (!currentReviewItem?.recipe) return;

        setSaving(true);
        setError(null);

        const saveUrl = currentReviewItem.url;
        let updatedItems: BulkItem[];
        try {
            const recipeData: AnalyzedRecipe = {
                ...currentReviewItem.recipe,
                title: editTitle.trim() || currentReviewItem.recipe.title,
                servings: editServings,
                difficulty: editDifficulty,
                imageUrl: editImageUrl || undefined,
                sourceUrl: currentReviewItem.url || undefined,
            };

            const result = await saveImportedRecipe(recipeData, authorId);

            // Use functional updater to avoid stale closure over `items`
            let captured: BulkItem[] = [];
            setItems((prev) => {
                captured = prev.map((item) =>
                    item.url === saveUrl
                        ? { ...item, savedId: result.id, savedSlug: result.slug }
                        : item,
                );
                return captured;
            });
            updatedItems = captured;

            op.track('bulk_import_recipe_saved', { recipe_id: result.id });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
            setSaving(false);
            return;
        }

        setSaving(false);
        await advanceWithItems(updatedItems);
    }, [
        currentReviewItem,
        editTitle,
        editServings,
        editDifficulty,
        editImageUrl,
        authorId,
        op,
        advanceWithItems,
    ]);

    const handleSkip = useCallback(async () => {
        if (!currentReviewItem) return;

        const skipUrl = currentReviewItem.url;
        let updatedItems: BulkItem[] = [];
        setItems((prev) => {
            updatedItems = prev.map((item) =>
                item.url === skipUrl ? { ...item, skipped: true } : item,
            );
            return updatedItems;
        });

        await advanceWithItems(updatedItems);
    }, [currentReviewItem, advanceWithItems]);

    const handleSkipAll = useCallback(() => {
        setItems((prev) =>
            prev.map((item) =>
                // Skip all scraped (not yet analyzed) and done (analyzed but not saved)
                item.status === 'scraped' || (item.status === 'done' && !item.savedId)
                    ? { ...item, skipped: true }
                    : item,
            ),
        );
        setStep('done');
    }, []);

    // ── Summary stats ────────────────────────────────────────────────────────

    const savedItems = items.filter((i) => i.savedId);
    const skippedItems = items.filter((i) => i.skipped);
    const failedItems = items.filter((i) => i.status === 'error');

    // ── Reset ────────────────────────────────────────────────────────────────

    const resetImport = useCallback(() => {
        setStep('urls');
        setUrlText('');
        setItems([]);
        setError(null);
    }, []);

    return {
        // State
        step,
        urlText,
        setUrlText,
        items,
        error,
        saving,
        analyzing,
        validUrls,
        reviewableItems,
        currentReviewItem,
        savedItems,
        skippedItems,
        failedItems,

        // Edit fields
        editTitle,
        setEditTitle,
        editServings,
        setEditServings,
        editDifficulty,
        setEditDifficulty,
        editImageUrl,
        setEditImageUrl,

        // Refs
        abortRef,

        // Actions
        startBulkImport,
        handleSaveAndNext,
        handleSkip,
        handleSkipAll,
        resetImport,
    };
}
