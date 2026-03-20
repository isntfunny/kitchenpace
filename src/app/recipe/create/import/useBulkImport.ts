import { useOpenPanel } from '@openpanel/nextjs';
import { useState, useCallback, useRef } from 'react';

import type { Category } from '@app/components/recipe/RecipeForm/data';

import {
    scrapeRecipe,
    analyzeWithAI,
    saveImportedRecipe,
    checkScraplerHealth,
    type AnalyzedRecipe,
} from './actions';
import type { BulkItem, BulkStep } from './bulk-import-types';

interface UseBulkImportOptions {
    categories: Category[];
    authorId: string;
}

export function useBulkImport({ categories, authorId }: UseBulkImportOptions) {
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
    const reviewableItems = items.filter(
        (item) => item.status === 'done' && item.recipe && !item.savedId && !item.skipped,
    );

    // Always review the first remaining item
    const currentReviewItem = reviewableItems[0] ?? null;

    // Load edit fields when review item changes
    const loadEditFields = useCallback((recipe: AnalyzedRecipe, imageUrl?: string) => {
        setEditTitle(recipe.title);
        setEditServings(recipe.servings ?? 4);
        setEditDifficulty(recipe.difficulty ?? 'MEDIUM');
        setEditImageUrl(imageUrl ?? recipe.imageUrl ?? '');
    }, []);

    // ── Start bulk processing (parallel, up to 10 at once) ──────────────────

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

        // Mutable results array — each worker updates its own index
        const results: BulkItem[] = [...initialItems];

        const updateItem = (index: number, patch: Partial<BulkItem>) => {
            results[index] = { ...results[index], ...patch };
            setItems([...results]);
        };

        // Process a single URL
        const processOne = async (index: number) => {
            if (abortRef.current) return;

            updateItem(index, { status: 'scraping' });

            try {
                const scraped = await scrapeRecipe(results[index].url);

                if (abortRef.current) return;
                updateItem(index, { status: 'analyzing' });

                const analyzed = await analyzeWithAI(
                    scraped.markdown,
                    results[index].url,
                    authorId,
                );

                const resolvedCategoryIds = (analyzed.categoryIds ?? [])
                    .map((slug) => categories.find((c) => c.slug === slug)?.id)
                    .filter((id): id is string => id != null);

                const recipe: AnalyzedRecipe = {
                    ...analyzed,
                    categoryIds: resolvedCategoryIds,
                    imageUrl: scraped.imageUrl || analyzed.imageUrl,
                };

                updateItem(index, { status: 'done', recipe });
            } catch (err) {
                updateItem(index, {
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Unbekannter Fehler',
                });
            }
        };

        // Parallel queue: up to 10 concurrent workers
        const CONCURRENCY = 10;
        const queue = [...initialItems.keys()]; // [0, 1, 2, ...]
        let cursor = 0;

        const worker = async () => {
            while (cursor < queue.length) {
                if (abortRef.current) break;
                const idx = cursor++;
                if (idx < queue.length) {
                    await processOne(idx);
                }
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
        );

        // Move to review if we have any successes
        const successCount = results.filter((p) => p.status === 'done').length;
        if (successCount > 0) {
            const firstReviewable = results.find((p) => p.status === 'done' && p.recipe);
            if (firstReviewable?.recipe) {
                loadEditFields(firstReviewable.recipe, firstReviewable.recipe.imageUrl);
            }
            setStep('review');
        } else {
            setError('Keines der Rezepte konnte verarbeitet werden.');
            setStep('urls');
        }

        op.track('bulk_import_processing_done', {
            success: successCount,
            failed: results.filter((p) => p.status === 'error').length,
        });
    }, [validUrls, categories, op, loadEditFields]);

    // ── Review actions ───────────────────────────────────────────────────────

    const advanceReview = useCallback(() => {
        if (reviewableItems.length <= 1) {
            setStep('done');
        } else {
            const nextItem = reviewableItems[1];
            if (nextItem?.recipe) {
                loadEditFields(nextItem.recipe, nextItem.recipe.imageUrl);
            }
        }
    }, [reviewableItems, loadEditFields]);

    const handleSaveAndNext = useCallback(async () => {
        if (!currentReviewItem?.recipe) return;

        setSaving(true);
        setError(null);

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

            // Update item with saved info
            setItems((prev) =>
                prev.map((item) =>
                    item.url === currentReviewItem.url
                        ? { ...item, savedId: result.id, savedSlug: result.slug }
                        : item,
                ),
            );

            op.track('bulk_import_recipe_saved', { recipe_id: result.id });
            advanceReview();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
        } finally {
            setSaving(false);
        }
    }, [
        currentReviewItem,
        editTitle,
        editServings,
        editDifficulty,
        editImageUrl,
        authorId,
        op,
        advanceReview,
    ]);

    const handleSkip = useCallback(() => {
        if (!currentReviewItem) return;

        setItems((prev) =>
            prev.map((item) =>
                item.url === currentReviewItem.url ? { ...item, skipped: true } : item,
            ),
        );

        advanceReview();
    }, [currentReviewItem, advanceReview]);

    const handleSkipAll = useCallback(() => {
        setItems((prev) =>
            prev.map((item) =>
                item.status === 'done' && !item.savedId ? { ...item, skipped: true } : item,
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
