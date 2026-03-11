'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import {
    ArrowRight,
    Check,
    CheckCircle2,
    ChefHat,
    Circle,
    Download,
    ExternalLink,
    ImageOff,
    Link2,
    List,
    Loader2,
    LoaderCircle,
    Network,
    SkipForward,
    Wand2,
    X,
    XCircle,
    Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef } from 'react';

import type { Category, Tag } from '@app/components/recipe/RecipeForm/data';
import { css } from 'styled-system/css';

import {
    scrapeRecipe,
    analyzeWithAI,
    saveImportedRecipe,
    checkScraplerHealth,
    type AnalyzedRecipe,
} from './actions';
import { ImportPageHeader } from './components/ImportPageHeader';
import { ProgressBar } from './components/ProgressBar';
import { SuccessBanner } from './components/SuccessBanner';
import { containerClass, labelClass, primaryButtonClass } from './importStyles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BulkStep = 'urls' | 'processing' | 'review' | 'done';

type UrlStatus = 'pending' | 'scraping' | 'analyzing' | 'done' | 'error';

interface BulkItem {
    url: string;
    status: UrlStatus;
    error?: string;
    recipe?: AnalyzedRecipe;
    /** Set after saving */
    savedId?: string;
    savedSlug?: string;
    /** Set if user skipped */
    skipped?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface BulkImportClientProps {
    categories: Category[];
    tags: Tag[];
    authorId: string;
}

export function BulkImportClient({ categories, tags: _tags, authorId }: BulkImportClientProps) {
    const router = useRouter();
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

    // Always review the first remaining item — the list shrinks as items get saved/skipped
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

                const analyzed = await analyzeWithAI(scraped.markdown, results[index].url);

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
        // After save/skip, reviewableItems will shrink by 1 on next render.
        // If only 1 left (the one we just handled), we're done.
        if (reviewableItems.length <= 1) {
            setStep('done');
        } else {
            // The next item becomes reviewableItems[0] after state update,
            // but we can preload from [1] (the next one after current).
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

    // ── Render: URL Input ────────────────────────────────────────────────────

    if (step === 'urls') {
        return (
            <div className={containerClass}>
                <ImportPageHeader
                    icon={List}
                    title="Bulk-Import"
                    subtitle="Importiere mehrere Rezepte auf einmal. Eine URL pro Zeile."
                />

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={css({ mb: '6' })}
                    >
                        <div className={errorBannerClass}>
                            <XCircle size={16} />
                            {error}
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={formCardClass}
                >
                    <label className={labelClass}>
                        Rezept-URLs (eine pro Zeile)
                        <textarea
                            value={urlText}
                            onChange={(e) => setUrlText(e.target.value)}
                            placeholder={
                                'https://www.chefkoch.de/rezepte/...\nhttps://www.lecker.de/...\nhttps://www.eatsmarter.de/...'
                            }
                            rows={8}
                            className={textareaClass}
                        />
                    </label>

                    {urlText.trim() && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={urlCountClass}
                        >
                            <Link2 size={14} />
                            <span>
                                {validUrls.length} gültige URL{validUrls.length !== 1 ? 's' : ''}{' '}
                                erkannt
                            </span>
                            {urlText.split('\n').filter((l) => l.trim()).length >
                                validUrls.length && (
                                <span className={css({ color: 'status.warning' })}>
                                    (
                                    {urlText.split('\n').filter((l) => l.trim()).length -
                                        validUrls.length}{' '}
                                    ungültig)
                                </span>
                            )}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={startBulkImport}
                        disabled={validUrls.length === 0}
                        className={primaryButtonClass}
                    >
                        <Wand2 size={18} />
                        {validUrls.length} Rezept{validUrls.length !== 1 ? 'e' : ''} importieren
                    </motion.button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className={css({ mt: '6', textAlign: 'center' })}
                >
                    <p className={hintClass}>
                        Die Rezepte werden nacheinander verarbeitet. Du kannst jedes Rezept
                        anschließend einzeln prüfen und speichern.
                    </p>
                </motion.div>
            </div>
        );
    }

    // ── Render: Processing ───────────────────────────────────────────────────

    if (step === 'processing') {
        const doneCount = items.filter((i) => i.status === 'done' || i.status === 'error').length;
        const progress = Math.round((doneCount / items.length) * 100);
        const currentItem = items.find((i) => i.status === 'scraping' || i.status === 'analyzing');

        return (
            <div className={processingContainerClass}>
                <div className={processingHeaderClass}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    >
                        <Loader2 size={24} className={css({ color: 'palette.orange' })} />
                    </motion.div>
                    <div>
                        <h2 className={processingTitleClass}>
                            Verarbeite {doneCount} von {items.length} Rezepten...
                        </h2>
                        {currentItem && (
                            <p className={processingSubtitleClass}>
                                {currentItem.status === 'scraping'
                                    ? 'Lade Seite...'
                                    : 'KI analysiert...'}{' '}
                                <span className={css({ color: 'text.dimmed', fontSize: 'xs' })}>
                                    {new URL(currentItem.url).hostname}
                                </span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Overall progress */}
                <div className={css({ mb: '6' })}>
                    <ProgressBar progress={progress} />
                </div>

                {/* URL list with statuses */}
                <div className={urlListClass}>
                    {items.map((item, idx) => (
                        <motion.div
                            key={item.url}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={urlItemClass(item.status)}
                        >
                            <div className={urlItemIconClass}>
                                {item.status === 'pending' && (
                                    <Circle size={16} className={css({ color: 'text.dimmed' })} />
                                )}
                                {item.status === 'scraping' && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1,
                                            ease: 'linear',
                                        }}
                                    >
                                        <LoaderCircle
                                            size={16}
                                            className={css({ color: 'palette.blue' })}
                                        />
                                    </motion.div>
                                )}
                                {item.status === 'analyzing' && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        <LoaderCircle
                                            size={16}
                                            className={css({ color: 'palette.purple' })}
                                        />
                                    </motion.div>
                                )}
                                {item.status === 'done' && (
                                    <CheckCircle2
                                        size={16}
                                        className={css({ color: 'status.success' })}
                                    />
                                )}
                                {item.status === 'error' && (
                                    <XCircle size={16} className={css({ color: 'status.error' })} />
                                )}
                            </div>

                            <div className={urlItemContentClass}>
                                <span className={urlItemUrlClass}>
                                    {(() => {
                                        try {
                                            const u = new URL(item.url);
                                            return u.hostname + u.pathname.slice(0, 40);
                                        } catch {
                                            return item.url.slice(0, 50);
                                        }
                                    })()}
                                </span>
                                {item.status === 'done' && item.recipe && (
                                    <span className={urlItemTitleClass}>{item.recipe.title}</span>
                                )}
                                {item.status === 'error' && item.error && (
                                    <span className={urlItemErrorClass}>{item.error}</span>
                                )}
                                {item.status === 'scraping' && (
                                    <span className={urlItemStatusClass}>
                                        Seite wird geladen...
                                    </span>
                                )}
                                {item.status === 'analyzing' && (
                                    <span className={urlItemStatusClass}>
                                        KI analysiert das Rezept...
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => {
                        abortRef.current = true;
                    }}
                    className={cancelButtonClass}
                >
                    <X size={16} />
                    Abbrechen
                </button>
            </div>
        );
    }

    // ── Render: Review Wizard ────────────────────────────────────────────────

    if (step === 'review' && currentReviewItem?.recipe) {
        const recipe = currentReviewItem.recipe;
        const totalReviewable = items.filter((i) => i.status === 'done' && i.recipe).length;
        const alreadyReviewed = savedItems.length + skippedItems.length;
        const currentNum = alreadyReviewed + 1;

        return (
            <div className={containerClass}>
                {/* Progress indicator */}
                <div className={reviewProgressClass}>
                    <span className={reviewCounterClass}>
                        Rezept {currentNum} von {totalReviewable}
                    </span>
                    <div className={reviewProgressDotsClass}>
                        {items
                            .filter((i) => i.status === 'done' && i.recipe)
                            .map((item, idx) => (
                                <div
                                    key={item.url}
                                    className={reviewDotClass(
                                        item.savedId
                                            ? 'saved'
                                            : item.skipped
                                              ? 'skipped'
                                              : idx === alreadyReviewed
                                                ? 'current'
                                                : 'pending',
                                    )}
                                />
                            ))}
                    </div>
                    <button type="button" onClick={handleSkipAll} className={skipAllButtonClass}>
                        Alle überspringen
                    </button>
                </div>

                {error && (
                    <div className={css({ mb: '4' })}>
                        <div className={errorBannerClass}>
                            <XCircle size={16} />
                            {error}
                        </div>
                    </div>
                )}

                {/* Recipe preview card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentReviewItem.url}
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60 }}
                        transition={{ duration: 0.3 }}
                        className={reviewCardClass}
                    >
                        {/* Source URL */}
                        <div className={reviewSourceClass}>
                            <Link2 size={12} />
                            <a
                                href={currentReviewItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={reviewSourceLinkClass}
                            >
                                {(() => {
                                    try {
                                        return new URL(currentReviewItem.url).hostname;
                                    } catch {
                                        return currentReviewItem.url;
                                    }
                                })()}
                                <ExternalLink size={10} />
                            </a>
                        </div>

                        {/* Image */}
                        {editImageUrl && (
                            <div className={reviewImageWrapperClass}>
                                <img
                                    src={editImageUrl}
                                    alt={editTitle}
                                    className={reviewImageClass}
                                    onError={() => setEditImageUrl('')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setEditImageUrl('')}
                                    className={imageRemoveBtnClass}
                                    title="Bild entfernen"
                                >
                                    <ImageOff size={14} />
                                </button>
                            </div>
                        )}

                        {/* Editable title */}
                        <div className={reviewFieldClass}>
                            <label className={reviewFieldLabelClass}>Titel</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className={reviewInputClass}
                            />
                        </div>

                        {/* Stats row */}
                        <div className={reviewStatsRowClass}>
                            <div className={reviewStatClass}>
                                <Zap size={14} className={css({ color: 'palette.orange' })} />
                                <span>{recipe.ingredients.length} Zutaten</span>
                            </div>
                            <div className={reviewStatClass}>
                                <Network size={14} className={css({ color: 'palette.orange' })} />
                                <span>{recipe.flowNodes.length} Schritte</span>
                            </div>
                        </div>

                        {/* Quick settings row */}
                        <div className={reviewSettingsRowClass}>
                            <div className={reviewFieldSmallClass}>
                                <label className={reviewFieldLabelClass}>Portionen</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={editServings}
                                    onChange={(e) => setEditServings(Number(e.target.value) || 1)}
                                    className={reviewInputSmallClass}
                                />
                            </div>
                            <div className={reviewFieldSmallClass}>
                                <label className={reviewFieldLabelClass}>Schwierigkeit</label>
                                <select
                                    value={editDifficulty}
                                    onChange={(e) =>
                                        setEditDifficulty(
                                            e.target.value as 'EASY' | 'MEDIUM' | 'HARD',
                                        )
                                    }
                                    className={reviewSelectClass}
                                >
                                    <option value="EASY">Einfach</option>
                                    <option value="MEDIUM">Mittel</option>
                                    <option value="HARD">Schwer</option>
                                </select>
                            </div>
                        </div>

                        {/* Ingredients preview */}
                        <div className={reviewIngredientsClass}>
                            <span className={reviewFieldLabelClass}>Zutaten</span>
                            <div className={reviewIngredientTagsClass}>
                                {recipe.ingredients.slice(0, 10).map((ing, idx) => (
                                    <span key={idx} className={ingredientChipClass}>
                                        {ing.amount && `${ing.amount} `}
                                        {ing.name}
                                    </span>
                                ))}
                                {recipe.ingredients.length > 10 && (
                                    <span className={moreChipClass}>
                                        +{recipe.ingredients.length - 10} mehr
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        {recipe.tags && recipe.tags.length > 0 && (
                            <div className={reviewTagsClass}>
                                {recipe.tags.map((tag) => (
                                    <span key={tag} className={tagChipClass}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Action buttons */}
                <div className={reviewActionsClass}>
                    <button type="button" onClick={handleSkip} className={skipButtonClass}>
                        <SkipForward size={16} />
                        Überspringen
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleSaveAndNext}
                        disabled={saving || !editTitle.trim()}
                        className={primaryButtonClass}
                    >
                        {saving ? (
                            <>
                                <Loader2
                                    size={18}
                                    className={css({ animation: 'spin 1s linear infinite' })}
                                />
                                Speichern...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Speichern & Weiter
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        );
    }

    // ── Render: Done Summary ─────────────────────────────────────────────────

    // Also covers: step === 'review' but no reviewable items left
    if (step === 'done' || step === 'review') {
        return (
            <div className={containerClass}>
                <SuccessBanner
                    title="Bulk-Import abgeschlossen"
                    subtitle={`${savedItems.length} gespeichert, ${skippedItems.length} übersprungen${failedItems.length > 0 ? `, ${failedItems.length} fehlgeschlagen` : ''}`}
                />

                {/* Summary cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={summaryGridClass}
                >
                    <div className={summaryCardClass('success')}>
                        <CheckCircle2 size={20} />
                        <span className={summaryCardCountClass}>{savedItems.length}</span>
                        <span className={summaryCardLabelClass}>Gespeichert</span>
                    </div>
                    <div className={summaryCardClass('skip')}>
                        <SkipForward size={20} />
                        <span className={summaryCardCountClass}>{skippedItems.length}</span>
                        <span className={summaryCardLabelClass}>Übersprungen</span>
                    </div>
                    <div className={summaryCardClass('error')}>
                        <XCircle size={20} />
                        <span className={summaryCardCountClass}>{failedItems.length}</span>
                        <span className={summaryCardLabelClass}>Fehlgeschlagen</span>
                    </div>
                </motion.div>

                {/* Saved recipes list */}
                {savedItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className={savedListClass}
                    >
                        <h3 className={savedListTitleClass}>Gespeicherte Rezepte</h3>
                        {savedItems.map((item) => (
                            <a
                                key={item.savedId}
                                href={`/recipe/${item.savedId}/edit`}
                                className={savedItemClass}
                            >
                                <ChefHat size={16} className={css({ color: 'palette.orange' })} />
                                <span className={savedItemTitleClass}>
                                    {item.recipe?.title ?? 'Rezept'}
                                </span>
                                <ArrowRight
                                    size={14}
                                    className={css({ color: 'text.dimmed', ml: 'auto' })}
                                />
                            </a>
                        ))}
                    </motion.div>
                )}

                {/* Failed URLs */}
                {failedItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className={failedListClass}
                    >
                        <h3 className={savedListTitleClass}>Fehlgeschlagen</h3>
                        {failedItems.map((item) => (
                            <div key={item.url} className={failedItemClass}>
                                <XCircle
                                    size={14}
                                    className={css({ color: 'status.error', flexShrink: 0 })}
                                />
                                <div>
                                    <span
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'text.dimmed',
                                            display: 'block',
                                        })}
                                    >
                                        {(() => {
                                            try {
                                                return new URL(item.url).hostname;
                                            } catch {
                                                return item.url;
                                            }
                                        })()}
                                    </span>
                                    <span
                                        className={css({ fontSize: 'xs', color: 'status.error' })}
                                    >
                                        {item.error}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className={doneActionsClass}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setStep('urls');
                            setUrlText('');
                            setItems([]);
                            setError(null);
                        }}
                        className={secondaryButtonClass}
                    >
                        <Download size={16} />
                        Weiteren Import starten
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/my-recipes')}
                        className={primaryButtonCompactClass}
                    >
                        Meine Rezepte
                        <ArrowRight size={16} />
                    </button>
                </motion.div>
            </div>
        );
    }

    // Fallback — shouldn't reach here
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const formCardClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    p: '6',
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
});

const textareaClass = css({
    width: '100%',
    mt: '2',
    px: '4',
    py: '3',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
    fontSize: 'sm',
    fontFamily: 'mono',
    lineHeight: '1.8',
    outline: 'none',
    resize: 'vertical',
    transition: 'all 0.15s ease',
    bg: { base: 'transparent', _dark: 'surface' },
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.1)',
            _dark: '0 0 0 3px rgba(224,123,83,0.15)',
        },
    },
    _placeholder: {
        color: 'text.dimmed',
    },
});

const urlCountClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    mt: '3',
    fontSize: 'sm',
    color: 'text.muted',
    fontWeight: '500',
});

const primaryButtonCompactClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '5',
    py: '3',
    borderRadius: 'xl',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'md',
    fontWeight: '700',
    cursor: 'pointer',
});

const secondaryButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '5',
    py: '3',
    borderRadius: 'xl',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
    backgroundColor: { base: 'white', _dark: 'surface' },
    color: 'text',
    fontSize: 'md',
    fontWeight: '600',
    cursor: 'pointer',
});

const hintClass = css({
    fontSize: 'sm',
    color: 'text.muted',
});

const errorBannerClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    p: '3',
    borderRadius: 'lg',
    backgroundColor: { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.12)' },
    color: { base: 'red.700', _dark: 'red.400' },
    fontSize: 'sm',
    fontWeight: '500',
    border: '1px solid',
    borderColor: { base: 'rgba(239,68,68,0.2)', _dark: 'rgba(239,68,68,0.25)' },
});

// ── Processing ──────────────────────────────────────────────────────────────

const processingContainerClass = css({
    maxWidth: '720px',
    mx: 'auto',
    px: '6',
    py: '8',
});

const processingHeaderClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    mb: '6',
});

const processingTitleClass = css({
    fontSize: 'lg',
    fontWeight: '700',
    color: 'text',
});

const processingSubtitleClass = css({
    fontSize: 'sm',
    color: 'text.muted',
    mt: '0.5',
});

const urlListClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    mb: '6',
});

const urlItemClass = (status: UrlStatus) =>
    css({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '3',
        p: '3',
        borderRadius: 'lg',
        backgroundColor:
            status === 'done'
                ? { base: 'rgba(34,197,94,0.05)', _dark: 'rgba(34,197,94,0.08)' }
                : status === 'error'
                  ? { base: 'rgba(239,68,68,0.05)', _dark: 'rgba(239,68,68,0.08)' }
                  : status === 'scraping' || status === 'analyzing'
                    ? { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' }
                    : { base: 'rgba(0,0,0,0.02)', _dark: 'rgba(255,255,255,0.03)' },
        border: '1px solid',
        borderColor:
            status === 'done'
                ? { base: 'rgba(34,197,94,0.15)', _dark: 'rgba(34,197,94,0.2)' }
                : status === 'error'
                  ? { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.2)' }
                  : status === 'scraping' || status === 'analyzing'
                    ? { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' }
                    : { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.06)' },
        transition: 'all 0.2s ease',
    });

const urlItemIconClass = css({
    mt: '1',
    flexShrink: 0,
});

const urlItemContentClass = css({
    flex: 1,
    minWidth: 0,
});

const urlItemUrlClass = css({
    fontSize: 'xs',
    color: 'text.dimmed',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
});

const urlItemTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    display: 'block',
    mt: '0.5',
});

const urlItemErrorClass = css({
    fontSize: 'xs',
    color: 'status.error',
    display: 'block',
    mt: '0.5',
});

const urlItemStatusClass = css({
    fontSize: 'xs',
    color: 'palette.orange',
    display: 'block',
    mt: '0.5',
});

const cancelButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '4',
    py: '2',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(239,68,68,0.3)', _dark: 'rgba(239,68,68,0.35)' },
    backgroundColor: 'transparent',
    color: { base: 'red.600', _dark: 'red.400' },
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    mx: 'auto',
});

// ── Review ──────────────────────────────────────────────────────────────────

const reviewProgressClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: '6',
    gap: '4',
});

const reviewCounterClass = css({
    fontSize: 'sm',
    fontWeight: '700',
    color: 'text',
    whiteSpace: 'nowrap',
});

const reviewProgressDotsClass = css({
    display: 'flex',
    gap: '4px',
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
});

const reviewDotClass = (state: 'saved' | 'skipped' | 'current' | 'pending') =>
    css({
        width: '10px',
        height: '10px',
        borderRadius: 'full',
        backgroundColor:
            state === 'saved'
                ? 'status.success'
                : state === 'skipped'
                  ? 'text.dimmed'
                  : state === 'current'
                    ? 'palette.orange'
                    : { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.15)' },
        transition: 'all 0.2s ease',
    });

const skipAllButtonClass = css({
    fontSize: 'xs',
    color: 'text.dimmed',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    _hover: { color: 'text.muted' },
});

const reviewCardClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    overflow: 'hidden',
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
    mb: '6',
});

const reviewSourceClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    px: '5',
    py: '3',
    backgroundColor: { base: 'rgba(0,0,0,0.02)', _dark: 'rgba(255,255,255,0.03)' },
    borderBottom: '1px solid',
    borderColor: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(255,255,255,0.06)' },
    fontSize: 'xs',
    color: 'text.dimmed',
});

const reviewSourceLinkClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    color: 'text.muted',
    textDecoration: 'none',
    _hover: { color: 'palette.orange' },
});

const reviewImageWrapperClass = css({
    position: 'relative',
    maxHeight: '200px',
    overflow: 'hidden',
});

const reviewImageClass = css({
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
});

const imageRemoveBtnClass = css({
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '32px',
    height: '32px',
    borderRadius: 'full',
    backgroundColor: 'rgba(0,0,0,0.6)',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    _hover: { backgroundColor: 'rgba(0,0,0,0.8)' },
});

const reviewFieldClass = css({
    px: '5',
    pt: '4',
    pb: '2',
});

const reviewFieldSmallClass = css({
    flex: 1,
});

const reviewFieldLabelClass = css({
    display: 'block',
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    mb: '1.5',
});

const reviewInputClass = css({
    width: '100%',
    px: '3',
    py: '2',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
    fontSize: 'lg',
    fontWeight: '700',
    outline: 'none',
    bg: 'transparent',
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.1)',
            _dark: '0 0 0 3px rgba(224,123,83,0.08)',
        },
    },
});

const reviewInputSmallClass = css({
    width: '100%',
    px: '3',
    py: '2',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
    fontSize: 'sm',
    outline: 'none',
    bg: 'transparent',
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
    },
});

const reviewSelectClass = css({
    width: '100%',
    px: '3',
    py: '2',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.25)', _dark: 'rgba(224,123,83,0.3)' },
    fontSize: 'sm',
    outline: 'none',
    bg: { base: 'white', _dark: 'surface' },
    color: 'text',
    cursor: 'pointer',
    _focus: {
        borderColor: 'palette.orange',
    },
});

const reviewStatsRowClass = css({
    display: 'flex',
    gap: '4',
    px: '5',
    py: '3',
});

const reviewStatClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    fontSize: 'sm',
    color: 'text.muted',
    fontWeight: '500',
});

const reviewSettingsRowClass = css({
    display: 'flex',
    gap: '4',
    px: '5',
    pb: '4',
});

const reviewIngredientsClass = css({
    px: '5',
    pb: '4',
});

const reviewIngredientTagsClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    mt: '1',
});

const ingredientChipClass = css({
    display: 'inline-flex',
    px: '2',
    py: '0.5',
    backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.12)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text',
});

const moreChipClass = css({
    display: 'inline-flex',
    px: '2',
    py: '0.5',
    backgroundColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'palette.orange',
});

const reviewTagsClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    px: '5',
    pb: '4',
});

const tagChipClass = css({
    display: 'inline-flex',
    px: '2',
    py: '0.5',
    backgroundColor: { base: 'rgba(168,85,247,0.08)', _dark: 'rgba(168,85,247,0.12)' },
    borderRadius: 'md',
    fontSize: 'xs',
    color: { base: 'purple.700', _dark: 'purple.300' },
});

const reviewActionsClass = css({
    display: 'flex',
    gap: '3',
    justifyContent: 'flex-end',
});

const skipButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '5',
    py: '3',
    borderRadius: 'xl',
    border: '1.5px solid',
    borderColor: { base: 'rgba(0,0,0,0.1)', _dark: 'rgba(255,255,255,0.12)' },
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'md',
    fontWeight: '600',
    cursor: 'pointer',
    _hover: {
        borderColor: { base: 'rgba(0,0,0,0.2)', _dark: 'rgba(255,255,255,0.2)' },
        color: 'text',
    },
});

// ── Done ────────────────────────────────────────────────────────────────────

const summaryGridClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '3',
    mb: '6',
});

const summaryCardClass = (type: 'success' | 'skip' | 'error') =>
    css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1',
        p: '4',
        borderRadius: 'lg',
        backgroundColor:
            type === 'success'
                ? { base: 'rgba(34,197,94,0.06)', _dark: 'rgba(34,197,94,0.1)' }
                : type === 'skip'
                  ? { base: 'rgba(0,0,0,0.03)', _dark: 'rgba(255,255,255,0.05)' }
                  : { base: 'rgba(239,68,68,0.06)', _dark: 'rgba(239,68,68,0.1)' },
        color:
            type === 'success'
                ? 'status.success'
                : type === 'skip'
                  ? 'text.dimmed'
                  : 'status.error',
        border: '1px solid',
        borderColor:
            type === 'success'
                ? { base: 'rgba(34,197,94,0.15)', _dark: 'rgba(34,197,94,0.2)' }
                : type === 'skip'
                  ? { base: 'rgba(0,0,0,0.06)', _dark: 'rgba(255,255,255,0.08)' }
                  : { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.2)' },
    });

const summaryCardCountClass = css({
    fontSize: '2xl',
    fontWeight: '800',
});

const summaryCardLabelClass = css({
    fontSize: 'xs',
    fontWeight: '500',
});

const savedListClass = css({
    mb: '4',
});

const savedListTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    mb: '2',
});

const savedItemClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    p: '3',
    borderRadius: 'lg',
    backgroundColor: { base: 'white', _dark: 'surface' },
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    textDecoration: 'none',
    color: 'text',
    mb: '2',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 2px 12px rgba(224,123,83,0.1)',
            _dark: '0 2px 12px rgba(224,123,83,0.08)',
        },
    },
});

const savedItemTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    flex: 1,
});

const failedListClass = css({
    mb: '6',
});

const failedItemClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '2',
    p: '3',
    borderRadius: 'lg',
    backgroundColor: { base: 'rgba(239,68,68,0.04)', _dark: 'rgba(239,68,68,0.06)' },
    mb: '2',
});

const doneActionsClass = css({
    display: 'flex',
    gap: '3',
    justifyContent: 'flex-end',
});
