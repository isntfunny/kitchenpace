'use client';

import { autoPlacement, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { OnboardingProvider, useOnboarding } from '@onboardjs/react';
import type { OnboardingStep, StepComponentProps } from '@onboardjs/react';
import { useOpenPanel } from '@openpanel/nextjs';
import { Lock, Monitor, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import type { EditRecipeData } from '@app/app/actions/recipes';
import type {
    FlowEdgeSerialized,
    FlowNodeSerialized,
} from '@app/components/flow/editor/editorTypes';
import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';
import { stack } from 'styled-system/patterns';

const FlowEditor = dynamic(
    () => import('@app/components/flow/FlowEditor').then((m) => m.FlowEditor),
    { ssr: false },
);

import { searchIngredients, searchTags } from '../recipe/actions';
import {
    createIngredient,
    createRecipe,
    updateRecipe,
    type FlowNodeInput,
    type FlowEdgeInput,
} from '../recipe/createActions';

import {
    GeneralInformationSection,
    TimeAndDifficultySection,
    CategorySelector,
    TagSelector,
    IngredientManager,
    SubmissionControls,
    ErrorBanner,
} from './RecipeForm/components';
import { AddedIngredient, Category, IngredientSearchResult, Tag } from './RecipeForm/data';
import type { TagFacet } from './types';

const formStackClass = stack({ gap: '6' });
const normalizeTag = (value: string) => value.trim().toLowerCase();
type TagOption = Tag & { count: number };
type TagWithCount = TagOption & { selected: boolean };

interface RecipeWelcomePayload {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
}

function RecipeWelcomeStep({ payload }: StepComponentProps<RecipeWelcomePayload>) {
    const { next, skip, loading } = useOnboarding();
    const isBusy = loading.isAnyLoading;

    return (
        <div className={css({ textAlign: 'center' })}>
            {/* Icon */}
            <div
                className={css({
                    width: '72px',
                    height: '72px',
                    borderRadius: 'full',
                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6',
                    boxShadow: '0 8px 30px rgba(224, 123, 83, 0.4)',
                })}
            >
                <Sparkles className={css({ width: '36px', height: '36px', color: 'white' })} />
            </div>

            <h2
                className={css({
                    fontSize: { base: '2xl', md: '3xl' },
                    fontWeight: '700',
                    marginBottom: '3',
                    color: 'text.primary',
                })}
            >
                {payload.title}
            </h2>
            <p
                className={css({
                    fontSize: 'md',
                    color: 'text.muted',
                    marginBottom: '6',
                    lineHeight: '1.7',
                    maxWidth: '400px',
                    marginX: 'auto',
                })}
            >
                {payload.description}
            </p>

            <div
                className={css({
                    display: 'flex',
                    gap: '3',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                })}
            >
                <button
                    type="button"
                    className={css({
                        backgroundColor: 'palette.orange',
                        color: 'white',
                        fontWeight: '600',
                        borderRadius: 'xl',
                        px: '6',
                        py: '3.5',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        fontSize: 'md',
                        boxShadow: '0 4px 15px rgba(224, 123, 83, 0.4)',
                        _hover: {
                            filter: 'brightness(1.05)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(224, 123, 83, 0.5)',
                        },
                        _disabled: { filter: 'brightness(0.9)', cursor: 'not-allowed' },
                    })}
                    onClick={() => void next()}
                    disabled={isBusy}
                >
                    {payload.primaryLabel}
                </button>
                <button
                    type="button"
                    className={css({
                        background: 'transparent',
                        border: '1px solid',
                        borderColor: 'border.subtle',
                        color: 'text.muted',
                        fontWeight: '500',
                        borderRadius: 'xl',
                        px: '6',
                        py: '3.5',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        fontSize: 'md',
                        _hover: { borderColor: 'palette.orange', color: 'text.primary' },
                    })}
                    onClick={() => void skip()}
                >
                    {payload.secondaryLabel}
                </button>
            </div>
        </div>
    );
}

interface RecipeTitlePayload {
    fieldLabel: string;
    description: string;
    expectedValue: string;
    primaryLabel: string;
    secondaryLabel: string;
}

interface RecipeTitleStepProps extends StepComponentProps<RecipeTitlePayload> {
    titleValue: string;
    onFocusTitleField: () => void;
}

function RecipeTitleStep({ payload, titleValue, onFocusTitleField }: RecipeTitleStepProps) {
    const { next, skip, loading } = useOnboarding();
    const isBusy = loading.isAnyLoading;
    const normalizedTitle = titleValue.trim().toLowerCase();
    const normalizedExpected = payload.expectedValue.trim().toLowerCase();
    const isMatch = normalizedTitle === normalizedExpected;

    useEffect(() => {
        onFocusTitleField();
    }, [onFocusTitleField]);

    const callNext = () => {
        if (!isMatch || isBusy) return;
        void next();
    };

    const descriptionMessage = isMatch
        ? 'Perfekt! Du hast den Titel so geschrieben, wie wir ihn brauchen.'
        : 'Schreibe exakt das Stichwort, damit wir dich an die richtige Stelle führen.';

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <h2
                className={css({
                    fontSize: { base: '2xl', md: '3xl' },
                    fontWeight: '700',
                    marginBottom: '2',
                    color: 'text.primary',
                })}
            >
                {payload.fieldLabel}
            </h2>
            <p
                className={css({
                    fontSize: 'md',
                    color: 'text.muted',
                    lineHeight: '1.6',
                })}
            >
                {payload.description}
            </p>
            <p
                className={css({
                    fontSize: 'sm',
                    color: 'text.secondary',
                })}
            >
                Erwartete Eingabe: <strong>{payload.expectedValue}</strong>
            </p>
            <p
                className={css({
                    fontSize: 'sm',
                    color: isMatch ? 'palette.emerald' : 'text.primary',
                    fontWeight: isMatch ? '600' : '500',
                })}
            >
                {descriptionMessage}
            </p>
            <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
                <button
                    type="button"
                    className={css({
                        borderRadius: 'xl',
                        px: '5',
                        py: '3',
                        fontWeight: '600',
                        backgroundColor: isMatch ? 'palette.orange' : 'rgba(224,123,83,0.4)',
                        color: isMatch ? 'canvas' : 'canvas',
                        border: 'none',
                        cursor: isMatch ? 'pointer' : 'not-allowed',
                        transition: 'transform 150ms ease',
                        _hover: isMatch ? { transform: 'translateY(-1px)' } : undefined,
                    })}
                    onClick={callNext}
                    disabled={!isMatch || isBusy}
                >
                    {payload.primaryLabel}
                </button>
                <button
                    type="button"
                    className={css({
                        borderRadius: 'xl',
                        px: '5',
                        py: '3',
                        fontWeight: '500',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'text.muted',
                    })}
                    onClick={() => void skip()}
                >
                    {payload.secondaryLabel}
                </button>
            </div>
        </div>
    );
}

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface RecipeFormProps {
    categories: Category[];
    tags: Tag[];
    tagFacets?: TagFacet[];
    authorId: string;
    initialData?: EditRecipeData;
    layout?: 'stack' | 'sidebar';
}

export function RecipeForm({
    categories,
    tags,
    tagFacets,
    authorId,
    initialData,
    layout = 'stack',
}: RecipeFormProps) {
    const op = useOpenPanel();
    const isEditMode = Boolean(initialData);

    // ── form state ──────────────────────────────────────────
    const [title, setTitle] = useState(initialData?.title ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [imageKey, setImageKey] = useState(initialData?.imageKey ?? '');
    const [servings, setServings] = useState(initialData?.servings ?? 4);
    const [prepTime, setPrepTime] = useState(initialData?.prepTime ?? 0);
    const [cookTime, setCookTime] = useState(initialData?.cookTime ?? 0);
    const [calories, setCalories] = useState<number | undefined>(
        initialData?.calories ?? undefined,
    );
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>(
        initialData?.difficulty ?? 'MEDIUM',
    );
    const [categoryIds, setCategoryIds] = useState<string[]>(initialData?.categoryIds ?? []);
    const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tagIds ?? []);
    const [tagQuery, setTagQuery] = useState('');
    const [ingredients, setIngredients] = useState<AddedIngredient[]>(
        (initialData?.ingredients ?? []).map((ing) => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            notes: ing.notes,
            isOptional: ing.isOptional,
            isNew: false,
        })),
    );

    // ── manual save state ───────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'DRAFT' | 'PUBLISHED'>(
        initialData?.status ?? 'DRAFT',
    );
    const [error, setError] = useState<string | null>(null);

    // ── ingredient search state ─────────────────────────────
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>([]);

    // ── flow state (stored in refs — changes don't re-render form) ──
    const flowNodesRef = useRef<FlowNodeInput[]>(initialData?.flowNodes ?? []);
    const flowEdgesRef = useRef<FlowEdgeInput[]>(initialData?.flowEdges ?? []);

    // ── auto-save ────────────────────────────────────────────
    const autoSavedIdRef = useRef<string | null>(initialData?.id ?? null);
    const [savedRecipeId, setSavedRecipeId] = useState<string | undefined>(initialData?.id);
    const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
    const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const focusTitleField = useCallback(() => {
        if (!titleInputRef.current) return;
        titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInputRef.current.focus({ preventScroll: true });
    }, []);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Progress bar: mandatory fields → 60%, optional → +40%
    const titleDone = title.trim().length > 0;
    const kategorieDone = categoryIds.length > 0;
    const ingredientsDone = ingredients.length > 0;
    const mandatoryPct = [titleDone, kategorieDone, ingredientsDone].filter(Boolean).length * 20;
    const mandatoryMet = mandatoryPct === 60;
    const optionalPct =
        (description.trim().length > 0 ? 10 : 0) +
        (prepTime > 0 || cookTime > 0 ? 10 : 0) +
        (selectedTags.length > 0 ? 10 : 0) +
        (servings !== 4 ? 10 : 0);
    const progressPct = Math.min(100, mandatoryPct + optionalPct);

    // Build the payload for save/update — reads current state at call time
    const buildPayload = useCallback(
        (status: 'DRAFT' | 'PUBLISHED') => ({
            title: title.trim(),
            description: description.trim(),
            imageKey: imageKey || undefined,
            servings,
            prepTime,
            cookTime,
            calories,
            difficulty,
            categoryIds,
            tagIds: selectedTags,
            ingredients: ingredients.map((ing) => ({
                ingredientId: ing.id,
                ingredientName: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                notes: ing.notes || undefined,
                isOptional: ing.isOptional,
            })),
            flowNodes: flowNodesRef.current,
            flowEdges: flowEdgesRef.current,
            status,
        }),
        [
            title,
            description,
            imageKey,
            servings,
            prepTime,
            cookTime,
            calories,
            difficulty,
            categoryIds,
            selectedTags,
            ingredients,
        ],
    );

    const buildPayloadRef = useRef(buildPayload);
    buildPayloadRef.current = buildPayload;

    const performAutoSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        setAutoSaveStatus('saving');
        try {
            const payload = buildPayloadRef.current('DRAFT');

            if (autoSavedIdRef.current) {
                const result = await updateRecipe(autoSavedIdRef.current, payload, authorId);
                if (result.imageKey && result.imageKey !== payload.imageKey) {
                    setImageKey(result.imageKey);
                }
            } else {
                const recipe = await createRecipe(payload, authorId);
                autoSavedIdRef.current = recipe.id;
                setSavedRecipeId(recipe.id);
                window.history.replaceState({}, '', `/recipe/${recipe.id}/edit`);
            }

            setAutoSaveStatus('saved');
            setAutoSavedAt(new Date());
        } catch {
            setAutoSaveStatus('error');
        }
    }, [title, authorId]);

    const performAutoSaveRef = useRef(performAutoSave);
    performAutoSaveRef.current = performAutoSave;

    const isPublished = saveStatus === 'PUBLISHED';

    useEffect(() => {
        if (isPublished || !title.trim()) {
            setAutoSaveStatus('idle');
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            return;
        }

        setAutoSaveStatus('idle');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => performAutoSaveRef.current(), 2500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [
        isPublished,
        title,
        description,
        imageKey,
        servings,
        prepTime,
        cookTime,
        difficulty,
        categoryIds,
        selectedTags,
        ingredients,
    ]);

    // ── ingredient search ────────────────────────────────────
    useEffect(() => {
        if (ingredientQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            const results = await searchIngredients(ingredientQuery);
            setSearchResults(results);
        }, 300);
        return () => clearTimeout(timer);
    }, [ingredientQuery]);

    // ── tag sorting ──────────────────────────────────────────
    const tagFacetCountMap = useMemo(() => {
        const map = new Map<string, number>();
        tagFacets?.forEach((facet) => {
            map.set(facet.key, facet.count);
            map.set(normalizeTag(facet.key), facet.count);
        });
        return map;
    }, [tagFacets]);

    const initialTagCandidates = useMemo<TagOption[]>(() => {
        const candidates = tags.map((tag) => {
            const normalizedName = normalizeTag(tag.name);
            const count =
                tagFacetCountMap.get(tag.name) ??
                tagFacetCountMap.get(normalizedName) ??
                tag.count ??
                0;
            return { ...tag, count };
        });
        return candidates
            .sort((a, b) => {
                if (a.count !== b.count) return b.count - a.count;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 50);
    }, [tags, tagFacetCountMap]);

    const [tagCandidates, setTagCandidates] = useState<TagOption[]>(initialTagCandidates);

    useEffect(() => {
        setTagCandidates(initialTagCandidates);
    }, [initialTagCandidates]);

    useEffect(() => {
        const trimmedQuery = tagQuery.trim();
        if (trimmedQuery.length < 2) {
            setTagCandidates(initialTagCandidates);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const searchResults = await searchTags(trimmedQuery);
                setTagCandidates(searchResults);
            } catch (error) {
                console.error('Tag search failed', error);
                setTagCandidates(initialTagCandidates);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
        };
    }, [tagQuery, initialTagCandidates]);

    const sortedTags = useMemo(() => {
        const normalizedQuery = tagQuery.toLowerCase().trim();
        const tagPool: TagWithCount[] = tagCandidates.map((tag) => ({
            ...tag,
            selected: selectedTags.includes(tag.id),
        }));
        const filtered = normalizedQuery
            ? tagPool.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
            : tagPool;
        return filtered.sort((a, b) => {
            if (a.selected && !b.selected) return -1;
            if (!a.selected && b.selected) return 1;
            if (a.count !== b.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });
    }, [selectedTags, tagQuery, tagCandidates]);

    // ── handlers ─────────────────────────────────────────────
    const handleCategoryToggle = (id: string, selected: boolean) => {
        setCategoryIds((prev) =>
            selected ? [...prev, id] : prev.filter((categoryId) => categoryId !== id),
        );
    };

    const handleAddIngredient = (ing: IngredientSearchResult) => {
        if (ingredients.some((i) => i.id === ing.id)) return; // already added
        setIngredients((prev) => [
            ...prev,
            {
                id: ing.id,
                name: ing.name,
                amount: '',
                unit: ing.units[0] || '',
                notes: '',
                isOptional: false,
                isNew: false,
            },
        ]);
        setIngredientQuery('');
        setSearchResults([]);
    };

    const handleAddNewIngredient = async (name: string) => {
        const created = await createIngredient(name, undefined, []);
        setIngredients((prev) => [
            ...prev,
            {
                id: created.id,
                name: created.name,
                amount: '',
                unit: '',
                notes: '',
                isOptional: false,
                isNew: true,
            },
        ]);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const updateIngredient = (index: number, changes: Partial<AddedIngredient>) => {
        setIngredients((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...changes };
            return next;
        });
    };

    const handleFlowChange = useCallback((nodes: FlowNodeInput[], edges: FlowEdgeInput[]) => {
        flowNodesRef.current = nodes;
        flowEdgesRef.current = edges;
    }, []);

    const handleAiApply = useCallback(
        async (result: AIAnalysisResult, apply: ApplySelection) => {
            if (apply.title && result.title) setTitle(result.title);
            if (apply.description && result.description) setDescription(result.description);
            if (apply.prepTime) setPrepTime(result.prepTime);
            if (apply.cookTime) setCookTime(result.cookTime);
            if (apply.servings) setServings(result.servings);
            if (apply.difficulty) setDifficulty(result.difficulty);

            if (apply.category && result.categorySlug) {
                const matched = categories.find((c) => c.slug === result.categorySlug);
                if (matched) setCategoryIds([matched.id]);
            }

            if (apply.tags && result.tags && result.tags.length > 0) {
                const matchedIds = result.tags
                    .map((tagName) =>
                        initialTagCandidates.find(
                            (t) => t.name.toLowerCase() === tagName.toLowerCase(),
                        ),
                    )
                    .filter((t): t is NonNullable<typeof t> => Boolean(t))
                    .map((t) => t.id);
                if (matchedIds.length > 0) setSelectedTags(matchedIds);
            }

            if (apply.ingredients && result.ingredients && result.ingredients.length > 0) {
                const newIngredients: AddedIngredient[] = [];
                for (const ing of result.ingredients) {
                    try {
                        const created = await createIngredient(
                            ing.name,
                            undefined,
                            ing.unit ? [ing.unit] : [],
                        );
                        newIngredients.push({
                            id: created.id,
                            name: created.name,
                            amount: ing.amount ?? '',
                            unit: ing.unit || 'Stück',
                            notes: ing.notes ?? '',
                            isOptional: false,
                            isNew: false,
                        });
                    } catch (e) {
                        console.error('Failed to add ingredient:', ing.name, e);
                    }
                }
                if (newIngredients.length > 0) {
                    setIngredients((prev) => {
                        const existingIds = new Set(prev.map((i) => i.id));
                        return [...prev, ...newIngredients.filter((i) => !existingIds.has(i.id))];
                    });
                }
            }
        },
        [categories, initialTagCandidates],
    );

    // ── submit ────────────────────────────────────────────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (!title.trim()) {
                setError('Bitte gib einen Titel ein.');
                return;
            }
            if (categoryIds.length === 0) {
                setError('Bitte wähle mindestens eine Kategorie aus.');
                return;
            }
            if (ingredients.length === 0) {
                setError('Bitte füge mindestens eine Zutat hinzu.');
                return;
            }

            // Prevent publishing without flow nodes
            if (
                saveStatus === 'PUBLISHED' &&
                flowNodesRef.current.length === 0 &&
                flowEdgesRef.current.length === 0
            ) {
                setError(
                    'Bitte erstelle zuerst einen Rezept-Flow mit mindestens einem Schritt, bevor du veröffentlichst.',
                );
                return;
            }

            // Flow validation: modular checks for publishing requirements
            if (saveStatus === 'PUBLISHED') {
                const { validateFlow, formatValidationErrors } =
                    await import('@app/lib/validation/flowValidation');
                const validation = validateFlow(flowNodesRef.current, flowEdgesRef.current, {
                    scope: 'publish',
                });

                if (!validation.isValid) {
                    setError(formatValidationErrors(validation));
                    return;
                }
            }

            const payload = buildPayload(saveStatus);

            if (saveStatus === 'PUBLISHED') {
                op.track('recipe_published', {
                    is_edit: isEditMode,
                    has_image: Boolean(imageKey),
                    has_flow: flowNodesRef.current.length > 0,
                    step_count: flowNodesRef.current.length,
                    ingredient_count: ingredients.length,
                });
            }

            if (isEditMode || autoSavedIdRef.current) {
                const recipeId = (isEditMode ? initialData!.id : autoSavedIdRef.current)!;
                const recipe = await updateRecipe(recipeId, payload, authorId);
                window.location.href = `/recipe/${recipe.slug}`;
            } else {
                const recipe = await createRecipe(payload, authorId);
                window.location.href = `/recipe/${recipe.slug}`;
            }
        } catch (err) {
            console.error('Error saving recipe:', err);
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern des Rezepts.');
        } finally {
            setSaving(false);
        }
    };

    // ── auto-save status label ────────────────────────────────
    const autoSaveLabel = (() => {
        if (isPublished) return 'Automatisches Speichern ist nur für Entwürfe verfügbar';
        if (!title.trim()) return null;
        if (autoSaveStatus === 'saving') return 'Wird gespeichert…';
        if (autoSaveStatus === 'error') return 'Fehler beim Speichern';
        if (autoSaveStatus === 'saved' && autoSavedAt) {
            return `Entwurf gespeichert ${autoSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        }
        return null;
    })();

    /* ── shared components ── */

    const flowEditorDisabled = !titleDone || !kategorieDone;

    /* ── only load FlowEditor JS on desktop (mobile never shows it) ── */
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const flowEditor = !isDesktop ? null : (
        <div className={css({ position: 'relative', width: '100%', height: '100%' })}>
            <FlowEditor
                availableIngredients={ingredients}
                initialNodes={(initialData?.flowNodes ?? []) as unknown as FlowNodeSerialized[]}
                initialEdges={initialData?.flowEdges as unknown as FlowEdgeSerialized[]}
                onChange={handleFlowChange}
                onAddIngredientToRecipe={handleAddIngredient}
                onAiApply={handleAiApply}
                recipeId={savedRecipeId}
            />
            {flowEditorDisabled && (
                <div
                    className={css({
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3',
                        backdropFilter: 'blur(6px)',
                        background: {
                            base: 'rgba(248,248,248,0.82)',
                            _dark: 'rgba(10,10,10,0.82)',
                        },
                        pointerEvents: 'all',
                    })}
                >
                    <div
                        className={css({
                            w: '12',
                            h: '12',
                            borderRadius: 'full',
                            bg: {
                                base: 'rgba(224,123,83,0.12)',
                                _dark: 'rgba(224,123,83,0.18)',
                            },
                            border: '2px solid',
                            borderColor: 'rgba(224,123,83,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'brand.primary',
                            mb: '2',
                        })}
                    >
                        <Lock size={22} />
                    </div>
                    <span
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '700',
                            color: 'text',
                        })}
                    >
                        Ablauf-Editor gesperrt
                    </span>
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'text.muted',
                            textAlign: 'center',
                            maxWidth: '280px',
                        })}
                    >
                        {!titleDone
                            ? 'Bitte gib zuerst einen Titel ein.'
                            : 'Bitte wähle zuerst eine Kategorie aus.'}
                    </span>
                </div>
            )}
        </div>
    );

    const TitleStepComponent = useCallback(
        (props: StepComponentProps<RecipeTitlePayload>) => (
            <RecipeTitleStep {...props} titleValue={title} onFocusTitleField={focusTitleField} />
        ),
        [title, focusTitleField],
    );

    /* ── sidebar / accordion layout ── */

    const sidebarLayoutForm = (
        <form onSubmit={handleSubmit} className={sidebarFormClass}>
            {/* Left: accordion sidebar */}
            <div className={sidebarCollapsed ? sidebarCollapsedClass : sidebarClass}>
                {!sidebarCollapsed && (
                    <button
                        type="button"
                        className={sidebarToggleClass}
                        onClick={() => setSidebarCollapsed(true)}
                        title="Sidebar einklappen"
                    >
                        <PanelLeftClose className={css({ width: '16px', height: '16px' })} />
                    </button>
                )}

                {/* Mobile: flow editor not available banner */}
                <div
                    className={css({
                        display: { base: 'flex', md: 'none' },
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3',
                        m: '3',
                        p: '5',
                        borderRadius: '2xl',
                        textAlign: 'center',
                    })}
                    style={{
                        background: `linear-gradient(135deg, ${PALETTE.orange}15, ${PALETTE.gold}10)`,
                        border: `1px solid ${PALETTE.orange}30`,
                    }}
                >
                    <div
                        className={css({
                            width: '48px',
                            height: '48px',
                            borderRadius: 'full',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        })}
                        style={{
                            background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                        }}
                    >
                        <Monitor size={24} color="white" />
                    </div>
                    <div>
                        <p className={css({ fontWeight: '700', fontSize: 'sm', mb: '1' })}>
                            Flow-Editor nur am Desktop
                        </p>
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                lineHeight: '1.6',
                            })}
                        >
                            Rezept-Flows kannst du nur am Computer erstellen. Hier kannst du Titel,
                            Zutaten und alle Details bearbeiten.
                        </p>
                    </div>
                </div>

                {/* Sticky header: autosave + progress */}
                <div
                    className={sidebarStickyHeaderClass}
                    ref={(el) => {
                        if (el && window.innerWidth < 768) {
                            const header = document.querySelector('header');
                            el.style.top = header ? `${header.offsetHeight}px` : '0px';
                        }
                    }}
                >
                    {/* Autosave bar */}
                    {autoSaveLabel && (
                        <div className={autoSaveBarClass(autoSaveStatus)}>
                            {autoSaveStatus === 'saving' && <span className={spinnerClass} />}
                            {autoSaveLabel}
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className={progressBarWrapperClass}>
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: '1',
                            })}
                        >
                            <span
                                className={css({
                                    fontSize: '8px',
                                    fontWeight: '700',
                                    color: {
                                        base: 'rgba(0,0,0,0.5)',
                                        _dark: 'rgba(255,255,255,0.5)',
                                    },
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                })}
                            >
                                {progressPct}%
                            </span>
                            {progressPct >= 100 && (
                                <span
                                    className={css({
                                        fontSize: '8px',
                                        color: 'palette.emerald',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    })}
                                >
                                    Vollständig
                                </span>
                            )}
                            {mandatoryMet && progressPct < 100 && (
                                <span
                                    className={css({
                                        fontSize: '8px',
                                        color: 'palette.emerald',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    })}
                                >
                                    Bereit
                                </span>
                            )}
                        </div>
                        {/* Track with 60% milestone marker */}
                        <div className={progressTrackClass} style={{ position: 'relative' }}>
                            <div
                                className={progressFillClass}
                                style={{
                                    width: `${progressPct}%`,
                                    backgroundColor: mandatoryMet
                                        ? PALETTE.emerald
                                        : PALETTE.orange,
                                }}
                            />
                            {/* 60% milestone marker */}
                            <div
                                className={css({
                                    position: 'absolute',
                                    left: '60%',
                                    top: '-2px',
                                    bottom: '-2px',
                                    width: '1.5px',
                                    backgroundColor: {
                                        base: 'rgba(0,0,0,0.15)',
                                        _dark: 'rgba(255,255,255,0.15)',
                                    },
                                    borderRadius: '1px',
                                })}
                            />
                        </div>
                    </div>
                </div>

                {/* Flat scrollable sections */}
                <div className={sidebarSectionsClass}>
                    {/* Title */}
                    <div className={sidebarSectionClass}>
                        <GeneralInformationSection
                            title={title}
                            onTitleChange={setTitle}
                            description={description}
                            onDescriptionChange={setDescription}
                            imageKey={imageKey}
                            onImageKeyChange={setImageKey}
                            showAutoSaveHint={false}
                            recipeId={savedRecipeId}
                            titleInputRef={titleInputRef}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Categories — required, moved above Details */}
                    <div className={sidebarSectionClass}>
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                mb: '2',
                            })}
                        >
                            {!kategorieDone && (
                                <span
                                    className={css({
                                        display: 'inline-block',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: 'full',
                                        background: 'palette.orange',
                                        flexShrink: 0,
                                        animation: 'pulse 2s ease-in-out infinite',
                                    })}
                                />
                            )}
                        </div>
                        <CategorySelector
                            categories={categories}
                            selectedIds={categoryIds}
                            onToggle={handleCategoryToggle}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Time, Difficulty */}
                    <div className={sidebarSectionClass}>
                        <div className={sectionHeadingClass}>Details</div>
                        <TimeAndDifficultySection
                            prepTime={prepTime}
                            onPrepTimeChange={setPrepTime}
                            cookTime={cookTime}
                            onCookTimeChange={setCookTime}
                            difficulty={difficulty}
                            onDifficultyChange={setDifficulty}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Tags */}
                    <div className={sidebarSectionClass}>
                        <TagSelector
                            sortedTags={sortedTags}
                            selectedTags={selectedTags}
                            tagQuery={tagQuery}
                            onTagQueryChange={setTagQuery}
                            onSelectionChange={setSelectedTags}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Ingredients */}
                    <div className={sidebarSectionClass}>
                        <IngredientManager
                            servings={servings}
                            onServingsChange={setServings}
                            ingredientQuery={ingredientQuery}
                            onIngredientQueryChange={setIngredientQuery}
                            searchResults={searchResults}
                            ingredients={ingredients}
                            onAddIngredient={handleAddIngredient}
                            onAddNewIngredient={handleAddNewIngredient}
                            onUpdateIngredient={updateIngredient}
                            onRemoveIngredient={handleRemoveIngredient}
                            calories={calories}
                            onCaloriesChange={setCalories}
                        />
                    </div>
                </div>

                {/* Sticky footer */}
                <div className={sidebarFooterClass}>
                    {error && <ErrorBanner message={error} />}
                    <SubmissionControls
                        saving={saving}
                        saveStatus={saveStatus}
                        onStatusChange={(next) => setSaveStatus(next)}
                    />
                </div>
            </div>

            {/* Right: flow editor canvas */}
            <div className={canvasAreaClass}>
                {sidebarCollapsed && (
                    <button
                        type="button"
                        className={sidebarReopenClass}
                        onClick={() => setSidebarCollapsed(false)}
                        title="Sidebar öffnen"
                    >
                        <PanelLeftOpen className={css({ width: '16px', height: '16px' })} />
                    </button>
                )}
                {flowEditor}
            </div>
        </form>
    );

    /* ── stack layout (default) ── */

    const stackLayoutForm = (
        <form onSubmit={handleSubmit}>
            <div className={formStackClass}>
                <GeneralInformationSection
                    title={title}
                    onTitleChange={setTitle}
                    description={description}
                    onDescriptionChange={setDescription}
                    imageKey={imageKey}
                    onImageKeyChange={setImageKey}
                    showAutoSaveHint={true}
                    recipeId={savedRecipeId}
                    titleInputRef={titleInputRef}
                />

                <TimeAndDifficultySection
                    prepTime={prepTime}
                    onPrepTimeChange={setPrepTime}
                    cookTime={cookTime}
                    onCookTimeChange={setCookTime}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                />

                <CategorySelector
                    categories={categories}
                    selectedIds={categoryIds}
                    onToggle={handleCategoryToggle}
                />

                <TagSelector
                    sortedTags={sortedTags}
                    selectedTags={selectedTags}
                    tagQuery={tagQuery}
                    onTagQueryChange={setTagQuery}
                    onSelectionChange={setSelectedTags}
                />

                <IngredientManager
                    servings={servings}
                    onServingsChange={setServings}
                    ingredientQuery={ingredientQuery}
                    onIngredientQueryChange={setIngredientQuery}
                    searchResults={searchResults}
                    ingredients={ingredients}
                    onAddIngredient={handleAddIngredient}
                    onAddNewIngredient={handleAddNewIngredient}
                    onUpdateIngredient={updateIngredient}
                    onRemoveIngredient={handleRemoveIngredient}
                    calories={calories}
                    onCaloriesChange={setCalories}
                />

                <div>
                    <h2
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '600',
                            mb: '1',
                            color: 'text',
                        })}
                    >
                        Zubereitungsschritte
                    </h2>
                    <p className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
                        Baue deinen Kochablauf Schritt für Schritt auf.
                    </p>
                    {flowEditor}
                </div>

                {error && <ErrorBanner message={error} />}

                <SubmissionControls
                    saving={saving}
                    saveStatus={saveStatus}
                    onStatusChange={(next) => setSaveStatus(next)}
                />
            </div>
        </form>
    );

    const layoutForm = layout === 'sidebar' ? sidebarLayoutForm : stackLayoutForm;
    const componentRegistry = useMemo(
        () => ({
            'recipe-welcome': RecipeWelcomeStep,
            'recipe-title': TitleStepComponent,
        }),
        [TitleStepComponent],
    );

    const onboardingSteps = useMemo<OnboardingStep[]>(
        () => [
            {
                id: 'recipe-create-welcome',
                type: 'CUSTOM_COMPONENT',
                payload: {
                    componentKey: 'recipe-welcome',
                    title: 'Willkommen im Rezept-Ersteller',
                    description: 'Hier passiert die Magie beim Planen deiner nächsten Kreation.',
                    primaryLabel: 'Alles klar',
                    secondaryLabel: 'Später ansehen',
                },
            },
            {
                id: 'recipe-title-challenge',
                type: 'CUSTOM_COMPONENT',
                payload: {
                    componentKey: 'recipe-title',
                    fieldLabel: 'Titel',
                    description:
                        'Schreibe „Flammkuchen" in das Titelfeld, damit wir dich sicher durch den Workflow führen.',
                    expectedValue: 'Flammkuchen',
                    primaryLabel: 'Weiter',
                    secondaryLabel: 'Später machen',
                },
            },
        ],
        [],
    );

    return (
        <OnboardingProvider steps={onboardingSteps} componentRegistry={componentRegistry}>
            {layoutForm}
            <RecipeOnboardingOverlay titleInputRef={titleInputRef} />
        </OnboardingProvider>
    );
}

interface RecipeOnboardingOverlayProps {
    titleInputRef: React.RefObject<HTMLInputElement | null>;
}

interface OnboardingArrowProps {
    placement: string;
}

function OnboardingArrow({ placement }: OnboardingArrowProps) {
    // Get position styles based on placement
    const getPositionStyles = () => {
        switch (placement) {
            case 'right-start':
            case 'right':
            case 'right-end':
                return { left: '-8px', top: '20px' };
            case 'left-start':
            case 'left':
            case 'left-end':
                return { right: '-8px', top: '20px' };
            case 'bottom-start':
            case 'bottom':
            case 'bottom-end':
                return { top: '-8px', left: '20px' };
            case 'top-start':
            case 'top':
            case 'top-end':
                return { bottom: '-8px', left: '20px' };
            default:
                return { left: '-8px', top: '20px' };
        }
    };

    const getRotation = () => {
        switch (placement) {
            case 'right-start':
            case 'right':
            case 'right-end':
                return 'rotate(45deg)';
            case 'left-start':
            case 'left':
            case 'left-end':
                return 'rotate(-135deg)';
            case 'bottom-start':
            case 'bottom':
            case 'bottom-end':
                return 'rotate(-45deg)';
            case 'top-start':
            case 'top':
            case 'top-end':
                return 'rotate(135deg)';
            default:
                return 'rotate(45deg)';
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: '#fff',
                transform: getRotation(),
                border: '1px solid rgba(224, 123, 83, 0.3)',
                ...getPositionStyles(),
            }}
        />
    );
}

function RecipeOnboardingOverlay({ titleInputRef }: RecipeOnboardingOverlayProps) {
    const { currentStep, renderStep } = useOnboarding();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const isWelcomeStep = currentStep?.id === 'recipe-create-welcome';
    const isTitleStep = currentStep?.id === 'recipe-title-challenge';

    // Floating UI for smart placement
    const { refs, floatingStyles, placement } = useFloating({
        strategy: 'fixed',
        placement: 'right-start',
        middleware: [
            offset(16),
            flip({ fallbackPlacements: ['left-start', 'bottom-start', 'top-start'] }),
            shift({ padding: 16 }),
            autoPlacement({
                allowedPlacements: ['right-start', 'left-start', 'bottom-start', 'top-start'],
            }),
        ],
        whileElementsMounted: autoUpdate,
    });

    // Destructure refs to avoid React warning about accessing refs during render
    const { setFloating, setReference } = refs;

    // Set up reference element when step changes
    // Using useLayoutEffect to measure DOM and set position synchronously before paint
    // This prevents visual flicker and ensures accurate positioning
    /* eslint-disable react-hooks/set-state-in-effect */
    useLayoutEffect(() => {
        if (!currentStep) {
            setTargetRect(null);
            return;
        }

        if (isTitleStep && titleInputRef.current) {
            const rect = titleInputRef.current.getBoundingClientRect();
            setTargetRect(rect);
            setReference(titleInputRef.current);
        } else {
            setTargetRect(null);
            setReference(null);
        }
    }, [currentStep, isTitleStep, titleInputRef, setReference]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!currentStep) return null;

    // Welcome step - centered modal with backdrop
    if (isWelcomeStep) {
        return (
            <>
                {/* Dark backdrop */}
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 100,
                        animation: 'fadeIn 200ms ease',
                    })}
                />
                {/* Centered modal */}
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 101,
                        p: '4',
                    })}
                >
                    <div
                        className={css({
                            backgroundColor: 'surface',
                            borderRadius: '2xl',
                            p: { base: '6', md: '8' },
                            maxWidth: '480px',
                            width: '100%',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
                            color: 'text',
                            animation: 'slideUp 300ms ease',
                        })}
                    >
                        {renderStep()}
                    </div>
                </div>
            </>
        );
    }

    // Tutorial step with spotlight
    return (
        <>
            {/* Dark backdrop with spotlight cutout */}
            <div
                className={css({
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    pointerEvents: 'none',
                })}
            >
                {/* Top area */}
                <div
                    className={css({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        height: targetRect ? `${targetRect.top}px` : 0,
                    })}
                />
                {/* Left area */}
                {targetRect && (
                    <div
                        className={css({
                            position: 'absolute',
                            top: `${targetRect.top}px`,
                            left: 0,
                            width: `${targetRect.left}px`,
                            height: `${targetRect.height}px`,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        })}
                    />
                )}
                {/* Right area */}
                {targetRect && (
                    <div
                        className={css({
                            position: 'absolute',
                            top: `${targetRect.top}px`,
                            right: 0,
                            width: `calc(100% - ${targetRect.right}px)`,
                            height: `${targetRect.height}px`,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        })}
                    />
                )}
                {/* Bottom area */}
                <div
                    className={css({
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        height: targetRect ? `calc(100% - ${targetRect.bottom}px)` : '100%',
                    })}
                />
            </div>

            {/* Highlight border around target */}
            {targetRect && (
                <div
                    className={css({
                        position: 'fixed',
                        left: `${targetRect.left - 4}px`,
                        top: `${targetRect.top - 4}px`,
                        width: `${targetRect.width + 8}px`,
                        height: `${targetRect.height + 8}px`,
                        border: '3px solid',
                        borderColor: 'palette.orange',
                        borderRadius: 'lg',
                        zIndex: 101,
                        pointerEvents: 'none',
                        boxShadow:
                            '0 0 0 4px rgba(224, 123, 83, 0.3), 0 0 20px rgba(224, 123, 83, 0.5)',
                        animation: 'pulse 2s ease-in-out infinite',
                    })}
                />
            )}

            {/* Tutorial panel positioned near target */}
            <div
                ref={setFloating}
                className={css({
                    position: 'fixed',
                    zIndex: 102,
                    pointerEvents: 'auto',
                    maxWidth: '360px',
                })}
                style={floatingStyles}
            >
                <div
                    className={css({
                        backgroundColor: 'surface',
                        borderRadius: 'xl',
                        p: '5',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                        color: 'text',
                        border: '1px solid',
                        borderColor: 'rgba(224, 123, 83, 0.3)',
                    })}
                >
                    {/* Arrow pointing to target */}
                    {targetRect && placement && <OnboardingArrow placement={placement} />}
                    {renderStep()}
                </div>
            </div>

            {/* Keyframe animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(224, 123, 83, 0.3), 0 0 20px rgba(224, 123, 83, 0.5); }
                    50% { box-shadow: 0 0 0 8px rgba(224, 123, 83, 0.2), 0 0 30px rgba(224, 123, 83, 0.7); }
                }
            `}</style>
        </>
    );
}

/* ── styles ───────────────────────────────────────────────── */

const autoSaveBarClass = (status: AutoSaveStatus) =>
    css({
        display: 'flex',
        alignItems: 'center',
        gap: '1.5',
        px: '3.5',
        py: '2',
        fontSize: '8px',
        fontWeight: '600',
        backgroundColor:
            status === 'error'
                ? { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.12)' }
                : { base: 'rgba(224,123,83,0.06)', _dark: 'rgba(224,123,83,0.1)' },
        color: status === 'error' ? 'red.500' : 'text.muted',
        borderBottom: '1px solid',
        borderBottomColor:
            status === 'error'
                ? { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.25)' }
                : { base: 'rgba(224,123,83,0.12)', _dark: 'rgba(224,123,83,0.18)' },
        flexShrink: '0',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    });

const spinnerClass = css({
    width: '10px',
    height: '10px',
    borderRadius: 'full',
    border: '2px solid',
    borderColor: 'brand.primary',
    borderTopColor: 'transparent',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
    flexShrink: '0',
});

// Sidebar layout
const sidebarFormClass = css({
    display: { base: 'block', md: 'flex' },
    flexDirection: { md: 'row' },
    height: { base: 'auto', md: '100%' },
    overflow: { base: 'visible', md: 'hidden' },
    flex: { md: '1' },
});

const sidebarClass = css({
    width: { base: '100%', md: '360px', lg: '420px', xl: '480px', '2xl': '540px' },
    minWidth: { base: '100%', md: '360px', lg: '420px', xl: '480px', '2xl': '540px' },
    flexShrink: '0',
    borderRight: {
        base: 'none',
        md: { base: '1px solid rgba(224,123,83,0.15)', _dark: '1px solid rgba(224,123,83,0.12)' },
    },
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'surface',
    overflowX: { base: 'visible', md: 'hidden' },
    transition: 'width 200ms ease, min-width 200ms ease',
});

const sidebarCollapsedClass = css({
    width: { base: '100%', md: '0px' },
    minWidth: { base: '100%', md: '0px' },
    flexShrink: '0',
    overflow: { base: 'auto', md: 'hidden' },
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'surface',
    transition: 'width 200ms ease, min-width 200ms ease',
});

const sidebarToggleClass = css({
    display: { base: 'none', md: 'flex' },
    alignItems: 'center',
    justifyContent: 'center',
    p: '1.5',
    mx: '2.5',
    mt: '1.5',
    mb: '0.5',
    borderRadius: 'md',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'text.muted',
    cursor: 'pointer',
    alignSelf: 'flex-end',
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.13)' },
        color: 'text',
    },
});

const sidebarReopenClass = css({
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: '20',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: 'md',
    border: { base: '1px solid rgba(224,123,83,0.3)', _dark: '1px solid rgba(224,123,83,0.25)' },
    backgroundColor: 'surface',
    color: 'text.muted',
    cursor: 'pointer',
    boxShadow: { base: '0 2px 8px rgba(0,0,0,0.08)', _dark: '0 2px 8px rgba(0,0,0,0.25)' },
    transition: 'all 0.15s ease',
    _hover: {
        backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.13)' },
        color: 'text',
    },
});

const sidebarFooterClass = css({
    p: '3.5',
    borderTop: { base: '1px solid rgba(224,123,83,0.1)', _dark: '1px solid rgba(224,123,83,0.08)' },
    position: { base: 'static', md: 'sticky' },
    bottom: '0',
    backgroundColor: 'surface',
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5',
    flexShrink: '0',
    zIndex: '10',
});

// Progress bar
const progressBarWrapperClass = css({
    px: '3.5',
    py: '2.5',
    flexShrink: '0',
});

const progressTrackClass = css({
    width: '100%',
    height: '3px',
    borderRadius: 'full',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    overflow: 'visible',
    position: 'relative',
});

const progressFillClass = css({
    height: '100%',
    borderRadius: 'full',
    backgroundColor: 'brand.primary',
    transition: 'width 0.3s ease',
});

const sidebarStickyHeaderClass = css({
    position: { base: 'sticky', md: 'static' },
    zIndex: '19',
    backgroundColor: 'surface',
    flexShrink: '0',
});

// Flat sidebar sections
const sidebarSectionsClass = css({
    flex: '1',
    overflowY: { base: 'visible', md: 'auto' },
    overflowX: 'hidden',
    scrollBehavior: 'smooth',
    overscrollBehaviorY: { base: 'auto', md: 'contain' },
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
        background: 'rgba(224,123,83,0.2)',
        borderRadius: '2px',
    },
});

const sidebarSectionClass = css({
    px: '3.5',
    py: '2.5',
});

const sidebarDividerClass = css({
    height: '1px',
    mx: '3.5',
    backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.12)' },
});

const sectionHeadingClass = css({
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: { base: 'rgba(0,0,0,0.55)', _dark: 'rgba(255,255,255,0.5)' },
    mb: '2',
});

// Canvas area
const canvasAreaClass = css({
    flex: '1',
    overflow: 'hidden',
    display: { base: 'none', md: 'flex' },
    flexDirection: 'column',
    minWidth: '0',
    position: 'relative',
});
