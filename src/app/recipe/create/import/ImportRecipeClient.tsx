'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import {
    ArrowRight,
    Check,
    ChefHat,
    Download,
    Edit3,
    ImageOff,
    Loader2,
    Wand2,
    X,
    Globe,
    FileText,
    Brain,
    Network,
    Zap,
    ArrowDownToLine,
    CheckCircle2,
    Circle,
    LoaderCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

import { CategorySelector } from '@app/components/recipe/RecipeForm/components/CategorySelector';
import { ErrorBanner } from '@app/components/recipe/RecipeForm/components/ErrorBanner';
import { GeneralInformationSection } from '@app/components/recipe/RecipeForm/components/GeneralInformationSection';
import { IngredientManager } from '@app/components/recipe/RecipeForm/components/IngredientManager';
import { SubmissionControls } from '@app/components/recipe/RecipeForm/components/SubmissionControls';
import { TimeAndDifficultySection } from '@app/components/recipe/RecipeForm/components/TimeAndDifficultySection';
import type { Category, Tag, AddedIngredient } from '@app/components/recipe/RecipeForm/data';

import { css } from 'styled-system/css';

import {
    scrapeRecipe,
    saveImportedRecipe,
    checkScraplerHealth,
    type ScrapedContent,
    type AnalyzedRecipe,
    type FlowNodeInput,
    type FlowEdgeInput,
} from './actions';
import { ImportPageHeader } from './components/ImportPageHeader';
import { ProgressBar } from './components/ProgressBar';
import { SuccessBanner } from './components/SuccessBanner';
import { containerClass, labelClass, primaryButtonClass } from './importStyles';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ImportStep = 'url' | 'scraping' | 'analyzing' | 'preview' | 'edit';

interface ProcessingStatus {
    step: ImportStep;
    message: string;
    progress: number;
    liveData?: {
        url?: string;
        markdownLength?: number;
        tokensUsed?: number;
        nodesFound?: number;
        edgesFound?: number;
    };
}

interface StreamEvent {
    type: 'progress' | 'data' | 'error' | 'complete';
    message?: string;
    progress?: number;
    data?: Record<string, unknown>;
    timestamp?: string;
    detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface ImportRecipeClientProps {
    categories: Category[];
    tags: Tag[];
    authorId: string;
}

export function ImportRecipeClient({ categories, tags: _tags, authorId }: ImportRecipeClientProps) {
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

    // ── Stream Management ────────────────────────────────────────────────────────

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
        setCurrentStep('scraping');

        // Initial status
        setStatus({
            step: 'scraping',
            message: 'Verbindung wird hergestellt...',
            progress: 5,
            liveData: { url: url.trim() },
        });

        addStreamEvent({ type: 'progress', message: 'Import gestartet', detail: url.trim() });
        op.track('recipe_import_started', { url: url.trim() });

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
            setStatus({
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
                        setStreamingBuffer('');
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
            setStatus({
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
            op.track('recipe_import_completed', {
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

            // Transform ingredients to AddedIngredient format
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
                isNew: true,
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
            setStatus({ step: 'url', message: '', progress: 0 });
        }
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
        servings,
        prepTime,
        cookTime,
        difficulty,
        categoryIds,
        ingredients,
        authorId,
        router,
    ]);

    // ── Render ─────────────────────────────────────────────────────────────

    // URL Input Step with Motion
    if (currentStep === 'url') {
        return (
            <div className={containerClass}>
                <ImportPageHeader
                    icon={Download}
                    title="Rezept importieren"
                    subtitle="Importiere ein Rezept von einer externen URL. Die KI analysiert das Rezept und erstellt automatisch einen Flow."
                />

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={errorWrapperClass}
                    >
                        <ErrorBanner message={error} />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={formWrapperClass}
                >
                    <label className={labelClass}>
                        Rezept-URL
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            type="url"
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setUrl(e.target.value)
                            }
                            placeholder="https://www.chefkoch.de/rezepte/..."
                            className={inputClass}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                                e.key === 'Enter' && startImport()
                            }
                        />
                    </label>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={startImport}
                        disabled={!url.trim()}
                        className={primaryButtonClass}
                    >
                        <Wand2 className={buttonIconClass} />
                        Import starten
                    </motion.button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className={hintWrapperClass}
                >
                    <p className={hintTextClass}>
                        Unterstützte Quellen: Chefkoch, Foodblogs, Rezept-Webseiten
                    </p>
                </motion.div>
            </div>
        );
    }

    // Processing Steps — sidebar + terminal layout
    if (currentStep === 'scraping' || currentStep === 'analyzing') {
        const isScraping = currentStep === 'scraping';

        const pipelineSteps = [
            { id: 'fetch', label: 'URL laden', icon: Globe, done: true, active: false },
            {
                id: 'scraping',
                label: 'Seite scrapen',
                icon: ArrowDownToLine,
                done: !isScraping,
                active: isScraping,
            },
            { id: 'analyzing', label: 'KI-Analyse', icon: Brain, done: false, active: !isScraping },
            { id: 'preview', label: 'Vorschau', icon: Check, done: false, active: false },
        ];

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={processingLayoutClass}
            >
                {/* ── LEFT SIDEBAR ── */}
                <div className={processingSidebarClass}>
                    <div className={sidebarHeaderClass}>
                        <motion.div
                            animate={isScraping ? { rotate: 360 } : { scale: [1, 1.15, 1] }}
                            transition={
                                isScraping
                                    ? { repeat: Infinity, duration: 2, ease: 'linear' }
                                    : { repeat: Infinity, duration: 1.5 }
                            }
                            className={sidebarIconWrapperClass(isScraping)}
                        >
                            {isScraping ? (
                                <Globe className={sidebarIconClass} />
                            ) : (
                                <Brain className={sidebarIconClass} />
                            )}
                        </motion.div>
                        <div>
                            <h2 className={sidebarTitleClass}>
                                {isScraping ? 'Seite wird geladen' : 'KI analysiert Rezept'}
                            </h2>
                            <motion.p
                                key={status.message}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={sidebarSubtitleClass}
                            >
                                {status.message}
                            </motion.p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className={css({ mb: '5' })}>
                        <ProgressBar progress={status.progress} />
                    </div>

                    {/* Pipeline steps */}
                    <div className={pipelineClass}>
                        {pipelineSteps.map((step, idx) => (
                            <div key={step.id} className={pipelineStepClass}>
                                <div className={pipelineStepIndicatorClass(step.done, step.active)}>
                                    {step.done ? (
                                        <CheckCircle2 size={16} />
                                    ) : step.active ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.2,
                                                ease: 'linear',
                                            }}
                                        >
                                            <LoaderCircle size={16} />
                                        </motion.div>
                                    ) : (
                                        <Circle size={16} />
                                    )}
                                </div>
                                <span className={pipelineStepLabelClass(step.done, step.active)}>
                                    {step.label}
                                </span>
                                {idx < pipelineSteps.length - 1 && (
                                    <div className={pipelineConnectorClass(step.done)} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Live stats */}
                    {status.liveData && (
                        <div className={sidebarStatsClass}>
                            {status.liveData.markdownLength != null && (
                                <div className={sidebarStatRowClass}>
                                    <FileText size={12} />
                                    <span>
                                        {status.liveData.markdownLength.toLocaleString()} chars
                                    </span>
                                </div>
                            )}
                            {status.liveData.nodesFound != null && (
                                <div className={sidebarStatRowClass}>
                                    <Network size={12} />
                                    <span>{status.liveData.nodesFound} Schritte</span>
                                </div>
                            )}
                            {status.liveData.edgesFound != null && (
                                <div className={sidebarStatRowClass}>
                                    <ArrowRight size={12} />
                                    <span>{status.liveData.edgesFound} Kanten</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── RIGHT TERMINAL ── */}
                <div className={terminalPanelClass}>
                    {/* macOS-style title bar */}
                    <div className={terminalTitleBarClass}>
                        <div className={terminalDotsClass}>
                            <span className={terminalDotClass('#ff5f57')} />
                            <span className={terminalDotClass('#febc2e')} />
                            <span className={terminalDotClass('#28c840')} />
                        </div>
                        <span className={terminalTitleClass}>küchentakt — import-log</span>
                        <div className={css({ width: '52px' })} />
                    </div>

                    {/* Terminal body */}
                    <div className={terminalBodyClass} ref={terminalRef}>
                        <div className={terminalInitClass}>
                            KüchenTakt Import Engine v1.0 — {new Date().toISOString().split('T')[0]}
                        </div>
                        {streamEvents.map((event, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15 }}
                                className={terminalLineClass}
                            >
                                <span className={terminalTimestampClass}>{event.timestamp}</span>
                                <span className={terminalPromptClass(event.type)}>
                                    {event.type === 'complete'
                                        ? '✓'
                                        : event.type === 'error'
                                          ? '✗'
                                          : event.type === 'data'
                                            ? '·'
                                            : '›'}
                                </span>
                                <span className={terminalMessageClass(event.type)}>
                                    {event.message}
                                </span>
                                {event.detail && (
                                    <span className={terminalDetailClass(event.type)}>
                                        {event.detail}
                                    </span>
                                )}
                            </motion.div>
                        ))}
                        {/* Live JSON stream — shows raw OpenAI output as it arrives */}
                        {streamingBuffer && (
                            <div className={terminalLineClass}>
                                <span className={terminalTimestampClass}>live</span>
                                <span className={terminalPromptClass('data')}>·</span>
                                <span
                                    className={css({
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        color: '#6b9e6b',
                                        flex: '1',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        display: 'block',
                                    })}
                                >
                                    {streamingBuffer.length > 160
                                        ? '…' + streamingBuffer.slice(-160)
                                        : streamingBuffer}
                                </span>
                            </div>
                        )}
                        {/* Blinking cursor */}
                        <div className={terminalCursorLineClass}>
                            <span className={terminalTimestampClass}>
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                            </span>
                            <motion.span
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className={terminalCursorClass}
                            >
                                █
                            </motion.span>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Preview Step with Motion
    if (currentStep === 'preview' && analyzedRecipe) {
        return (
            <div className={containerClass}>
                <SuccessBanner
                    title="Rezept erfolgreich importiert!"
                    subtitle="Du kannst das Rezept jetzt überprüfen und bearbeiten"
                />

                {error && (
                    <div className={errorWrapperClass}>
                        <ErrorBanner message={error} />
                    </div>
                )}

                {/* Animated Stats Cards */}
                <motion.div
                    className={previewCardsClass}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    {[
                        { label: 'Titel', value: analyzedRecipe.title, icon: ChefHat },
                        {
                            label: 'Zutaten',
                            value: `${analyzedRecipe.ingredients.length} erkannt`,
                            icon: Zap,
                        },
                        {
                            label: 'Schritte',
                            value: `${analyzedRecipe.flowNodes.length} Schritte`,
                            icon: Network,
                        },
                        {
                            label: 'Schwierigkeit',
                            value:
                                analyzedRecipe.difficulty === 'EASY'
                                    ? 'Einfach'
                                    : analyzedRecipe.difficulty === 'MEDIUM'
                                      ? 'Mittel'
                                      : 'Schwer',
                            icon: Brain,
                        },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + idx * 0.1 }}
                            className={previewCardClass}
                        >
                            <div className={previewCardLabelClass}>{stat.label}</div>
                            <div className={previewCardValueClass}>
                                <stat.icon size={14} className={cardIconClass} />
                                {stat.value}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Image Preview with opt-out */}
                {imageUrl && (
                    <motion.div
                        className={imagePreviewClass}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75 }}
                    >
                        <div className={imagePreviewHeaderClass}>
                            <h3 className={ingredientsPreviewTitleClass}>Rezeptbild</h3>
                            <button
                                type="button"
                                onClick={() => setImageUrl('')}
                                className={imageRemoveButtonClass}
                                title="Bild entfernen"
                            >
                                <ImageOff size={14} />
                                Entfernen
                            </button>
                        </div>
                        <img
                            src={imageUrl}
                            alt={analyzedRecipe.title}
                            className={imagePreviewImgClass}
                            onError={() => setImageUrl('')}
                        />
                    </motion.div>
                )}

                {/* Ingredients Preview with staggered animation */}
                <motion.div
                    className={ingredientsPreviewClass}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <h3 className={ingredientsPreviewTitleClass}>Erkannte Zutaten</h3>
                    <div className={ingredientsListClass}>
                        {analyzedRecipe.ingredients.slice(0, 8).map((ing, idx) => (
                            <motion.span
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.9 + idx * 0.05 }}
                                className={ingredientTagClass}
                            >
                                {ing.amount && `${ing.amount} `}
                                {ing.name}
                            </motion.span>
                        ))}
                        {analyzedRecipe.ingredients.length > 8 && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2 }}
                                className={moreTagClass}
                            >
                                +{analyzedRecipe.ingredients.length - 8} mehr
                            </motion.span>
                        )}
                    </div>
                </motion.div>

                {/* Actions with motion */}
                <motion.div
                    className={previewActionsClass}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentStep('url');
                            setUrl('');
                            setScrapedContent(null);
                            setAnalyzedRecipe(null);
                            clearStreamEvents();
                        }}
                        className={secondaryButtonClass}
                    >
                        <X className={buttonIconSmallClass} />
                        Abbrechen
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleContinueToEdit}
                        className={primaryButtonClass}
                    >
                        <Edit3 className={buttonIconClass} />
                        Bearbeiten
                        <ArrowRight className={buttonIconRightClass} />
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    // Edit Step (Full Form)
    if (currentStep === 'edit') {
        return (
            <div className={editContainerClass}>
                <div className={editHeaderClass}>
                    <button type="button" onClick={handleBackToPreview} className={backButtonClass}>
                        <ArrowRight className={rotate180Class} />
                        Zurück zur Vorschau
                    </button>
                    <h1 className={editTitleClass}>Rezept bearbeiten</h1>
                    <p className={editSubtitleClass}>
                        Überprüfe und passe das importierte Rezept an
                    </p>
                </div>

                {error && (
                    <div className={errorWrapperClass}>
                        <ErrorBanner message={error} />
                    </div>
                )}

                <div className={editFormClass}>
                    {/* General Info */}
                    <div className={formSectionClass}>
                        <GeneralInformationSection
                            title={title}
                            onTitleChange={setTitle}
                            description={description}
                            onDescriptionChange={setDescription}
                            showAutoSaveHint={false}
                        />
                    </div>

                    <div className={formDividerClass} />

                    {/* Time & Difficulty */}
                    <div className={formSectionClass}>
                        <TimeAndDifficultySection
                            prepTime={prepTime}
                            onPrepTimeChange={setPrepTime}
                            cookTime={cookTime}
                            onCookTimeChange={setCookTime}
                            difficulty={difficulty}
                            onDifficultyChange={setDifficulty}
                        />
                    </div>

                    <div className={formDividerClass} />

                    {/* Categories */}
                    <div className={formSectionClass}>
                        <CategorySelector
                            categories={categories}
                            selectedIds={categoryIds}
                            onToggle={(id, selected) => {
                                setCategoryIds((prev) =>
                                    selected ? [...prev, id] : prev.filter((c) => c !== id),
                                );
                            }}
                        />
                    </div>

                    <div className={formDividerClass} />

                    {/* Ingredients */}
                    <div className={formSectionClass}>
                        <IngredientManager
                            servings={servings}
                            onServingsChange={setServings}
                            ingredientQuery=""
                            onIngredientQueryChange={() => {}}
                            searchResults={[]}
                            ingredients={ingredients}
                            onAddIngredient={() => {}}
                            onAddNewIngredient={async () => {}}
                            onUpdateIngredient={(idx, changes) => {
                                setIngredients((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], ...changes };
                                    return next;
                                });
                            }}
                            onRemoveIngredient={(idx) => {
                                setIngredients((prev) => prev.filter((_, i) => i !== idx));
                            }}
                        />
                    </div>

                    <div className={formDividerClass} />

                    {/* Flow Preview Note */}
                    <div className={flowNoteClass}>
                        <ChefHat className={flowNoteIconClass} />
                        <div>
                            <strong>Zubereitungsfluss</strong>
                            <p>
                                Die KI hat {analyzedRecipe?.flowNodes.length || 0} Schritte erkannt.
                                Du kannst den Flow im nächsten Schritt anpassen.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={editActionsClass}>
                        <SubmissionControls
                            saving={saving}
                            saveStatus="DRAFT"
                            onStatusChange={() => {}}
                        />
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className={saveButtonClass}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className={spinningIconSmallClass} />
                                    Wird gespeichert...
                                </>
                            ) : (
                                <>
                                    <Check className={buttonIconClass} />
                                    Speichern & Bearbeiten
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const errorWrapperClass = css({
    mb: '6',
});

const formWrapperClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    p: '6',
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
});

const inputClass = css({
    width: '100%',
    px: '4',
    py: '3',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
    fontSize: 'md',
    outline: 'none',
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
        color: 'text.muted',
    },
});

const secondaryButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    transition: 'all 0.2s ease',
});

const buttonIconClass = css({
    width: '18px',
    height: '18px',
    flexShrink: 0,
});

const buttonIconSmallClass = css({
    width: '16px',
    height: '16px',
    flexShrink: 0,
});

const buttonIconRightClass = css({
    width: '16px',
    height: '16px',
    marginLeft: '1',
});

const hintWrapperClass = css({
    mt: '6',
    textAlign: 'center',
});

const hintTextClass = css({
    fontSize: 'sm',
    color: 'text.muted',
});

// ── Processing: two-panel layout ──────────────────────────────────────────────

const processingLayoutClass = css({
    display: 'flex',
    minHeight: 'calc(100vh - 64px)',
    maxWidth: '1280px',
    mx: 'auto',
    px: '6',
    py: '8',
    gap: '6',
    alignItems: 'flex-start',
});

// Sidebar
const processingSidebarClass = css({
    width: '300px',
    flexShrink: 0,
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.18)' },
    boxShadow: { base: '0 4px 24px rgba(0,0,0,0.06)', _dark: '0 4px 24px rgba(0,0,0,0.3)' },
    p: '5',
    position: 'sticky',
    top: '8',
});

const sidebarHeaderClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    mb: '5',
});

const sidebarIconWrapperClass = (isScraping: boolean) =>
    css({
        width: '40px',
        height: '40px',
        borderRadius: 'lg',
        backgroundColor: isScraping
            ? { base: 'rgba(59,130,246,0.1)', _dark: 'rgba(59,130,246,0.15)' }
            : { base: 'rgba(168,85,247,0.1)', _dark: 'rgba(168,85,247,0.15)' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    });

const sidebarIconClass = css({
    width: '20px',
    height: '20px',
    color: 'inherit',
});

const sidebarTitleClass = css({
    fontSize: 'sm',
    fontWeight: '700',
    color: 'text',
    lineHeight: '1.3',
});

const sidebarSubtitleClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    mt: '0.5',
});

// Pipeline steps
const pipelineClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    mb: '5',
});

const pipelineStepClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    position: 'relative',
});

const pipelineStepIndicatorClass = (done: boolean, active: boolean) =>
    css({
        width: '24px',
        height: '24px',
        borderRadius: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: done
            ? 'status.success'
            : active
              ? 'palette.orange'
              : { base: 'rgba(0,0,0,0.25)', _dark: 'rgba(255,255,255,0.3)' },
        backgroundColor: done
            ? { base: 'rgba(34,197,94,0.08)', _dark: 'rgba(34,197,94,0.12)' }
            : active
              ? { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' }
              : 'transparent',
        zIndex: 1,
    });

const pipelineStepLabelClass = (done: boolean, active: boolean) =>
    css({
        fontSize: 'sm',
        fontWeight: active ? '700' : '500',
        color: done ? 'status.success' : active ? 'text' : 'text.muted',
        pt: '3px',
        pb: '5',
    });

const pipelineConnectorClass = (done: boolean) =>
    css({
        position: 'absolute',
        left: '11px',
        top: '24px',
        width: '2px',
        height: '20px',
        backgroundColor: done
            ? { base: 'rgba(34,197,94,0.3)', _dark: 'rgba(34,197,94,0.4)' }
            : { base: 'rgba(0,0,0,0.08)', _dark: 'rgba(255,255,255,0.1)' },
        zIndex: 0,
    });

const sidebarStatsClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    pt: '4',
    borderTop: '1px solid',
    borderColor: { base: 'rgba(0,0,0,0.06)', _dark: 'rgba(255,255,255,0.08)' },
});

const sidebarStatRowClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'xs',
    color: 'text.muted',
});

// Terminal panel
const terminalPanelClass = css({
    flex: '1',
    minWidth: '0',
    borderRadius: 'xl',
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
});

const terminalTitleBarClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: '4',
    py: '3',
    backgroundColor: '#2d2d2d',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
});

const terminalDotsClass = css({
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
});

const terminalDotClass = (color: string) =>
    css({
        width: '12px',
        height: '12px',
        borderRadius: 'full',
        backgroundColor: color,
        display: 'inline-block',
    });

const terminalTitleClass = css({
    fontSize: 'xs',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'inherit',
});

const terminalBodyClass = css({
    backgroundColor: '#1a1a1a',
    p: '4',
    minHeight: '400px',
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    scrollBehavior: 'smooth',
});

const terminalInitClass = css({
    fontSize: 'xs',
    color: 'rgba(255,255,255,0.2)',
    mb: '2',
    fontFamily: 'inherit',
});

const terminalLineClass = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '2',
    fontFamily: 'inherit',
    lineHeight: '1.6',
});

const terminalTimestampClass = css({
    fontSize: '10px',
    color: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
    fontFamily: 'inherit',
    minWidth: '80px',
});

const terminalPromptClass = (type: string) =>
    css({
        fontSize: 'xs',
        flexShrink: 0,
        color:
            type === 'complete'
                ? '#28c840'
                : type === 'error'
                  ? '#ff5f57'
                  : type === 'data'
                    ? '#6699cc'
                    : 'rgba(255,255,255,0.35)',
        fontFamily: 'inherit',
    });

const terminalMessageClass = (type: string) =>
    css({
        fontSize: 'xs',
        color:
            type === 'complete'
                ? 'rgba(40,200,64,0.85)'
                : type === 'error'
                  ? '#ff5f57'
                  : type === 'data'
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(255,255,255,0.75)',
        fontFamily: 'inherit',
        flexShrink: 0,
    });

const terminalDetailClass = (type: string) =>
    css({
        fontSize: 'xs',
        color:
            type === 'complete'
                ? 'rgba(40,200,64,0.6)'
                : type === 'error'
                  ? 'rgba(255,95,87,0.7)'
                  : type === 'data'
                    ? 'palette.gold'
                    : 'rgba(255,255,255,0.4)',
        fontFamily: 'inherit',
        wordBreak: 'break-all',
    });

const terminalCursorLineClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    mt: '1',
});

const terminalCursorClass = css({
    color: 'palette.orange',
    fontSize: 'xs',
    fontFamily: 'inherit',
});

// Preview
const previewCardsClass = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '3',
    mb: '6',
});

const previewCardClass = css({
    p: '4',
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
});

const previewCardLabelClass = css({
    fontSize: 'xs',
    fontWeight: '600',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    mb: '1',
});

const previewCardValueClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1.5',
    fontSize: 'md',
    fontWeight: '700',
    color: 'text',
});

const cardIconClass = css({
    color: 'palette.orange',
});

const imagePreviewClass = css({
    mb: '6',
    p: '4',
    backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' },
    borderRadius: 'lg',
});

const imagePreviewHeaderClass = css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: '3',
});

const imageRemoveButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    px: '2',
    py: '1',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text.dimmed',
    backgroundColor: 'transparent',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: {
        color: { base: 'red.600', _dark: 'red.400' },
        borderColor: { base: 'red.300', _dark: 'red.700' },
        backgroundColor: { base: 'red.50', _dark: 'rgba(239,68,68,0.1)' },
    },
});

const imagePreviewImgClass = css({
    width: '100%',
    maxHeight: '240px',
    objectFit: 'cover',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: 'border',
});

const ingredientsPreviewClass = css({
    mb: '6',
    p: '4',
    backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' },
    borderRadius: 'lg',
});

const ingredientsPreviewTitleClass = css({
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    mb: '3',
});

const ingredientsListClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
});

const ingredientTagClass = css({
    display: 'inline-flex',
    px: '2',
    py: '1',
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'text',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
});

const moreTagClass = css({
    display: 'inline-flex',
    px: '2',
    py: '1',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    borderRadius: 'md',
    fontSize: 'xs',
    fontWeight: '500',
    color: 'palette.orange',
});

const previewActionsClass = css({
    display: 'flex',
    gap: '3',
    justifyContent: 'flex-end',
});

// Edit
const editContainerClass = css({
    maxWidth: '900px',
    mx: 'auto',
    px: '6',
    py: '8',
});

const editHeaderClass = css({
    mb: '6',
});

const backButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    px: '3',
    py: '1.5',
    borderRadius: 'lg',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontSize: 'sm',
    fontWeight: '500',
    cursor: 'pointer',
    mb: '4',
    _hover: {
        backgroundColor: 'surface.muted',
        color: 'text',
    },
});

const rotate180Class = css({
    width: '14px',
    height: '14px',
    transform: 'rotate(180deg)',
});

const editTitleClass = css({
    fontSize: '2xl',
    fontWeight: '800',
    color: 'text',
    mb: '1',
});

const editSubtitleClass = css({
    fontSize: 'md',
    color: 'text.muted',
});

const editFormClass = css({
    backgroundColor: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.15)', _dark: 'rgba(224,123,83,0.2)' },
    overflow: 'hidden',
});

const formSectionClass = css({
    p: '6',
});

const formDividerClass = css({
    height: '1px',
    backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.12)' },
});

const flowNoteClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    mx: '6',
    my: '4',
    p: '4',
    backgroundColor: { base: 'rgba(224,123,83,0.05)', _dark: 'rgba(224,123,83,0.08)' },
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
});

const flowNoteIconClass = css({
    width: '20px',
    height: '20px',
    color: 'palette.orange',
    flexShrink: 0,
    mt: '0.5',
});

const editActionsClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: '6',
    borderTop: '1px solid',
    borderTopColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    backgroundColor: { base: 'rgba(224,123,83,0.02)', _dark: 'rgba(224,123,83,0.04)' },
});

const saveButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '6',
    py: '3',
    borderRadius: 'xl',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'md',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    _disabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
});

const spinningIconSmallClass = css({
    width: '16px',
    height: '16px',
    animation: 'spin 1s linear infinite',
});
