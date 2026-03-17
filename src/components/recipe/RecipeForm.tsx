'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import { Lock, Monitor, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import type { EditRecipeData } from '@app/app/actions/recipes';
import { completeRecipeCreationTutorial } from '@app/app/actions/tutorials';
import type {
    FlowEdgeSerialized,
    FlowNodeSerialized,
} from '@app/components/flow/editor/editorTypes';
import { extractMentionedIds } from '@app/components/flow/viewer/viewerUtils';
import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { escapeRegex } from '@app/lib/ingredients/parseIngredientInput';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';
import { stack } from 'styled-system/patterns';

const FlowEditor = dynamic(
    () => import('@app/components/flow/FlowEditor').then((m) => m.FlowEditor),
    { ssr: false },
);

const RecipeCreationTutorial = dynamic(
    () => import('./tutorial').then((m) => m.RecipeCreationTutorial),
    { ssr: false },
);

import { searchTags } from '../recipe/actions';
import {
    createIngredient,
    createRecipe,
    findOrCreateTag,
    updateRecipe,
    uploadImageFromUrl,
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
import {
    dispatchRecipeTutorialEvent,
    RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY,
    RECIPE_CREATION_TUTORIAL_KEY,
    RECIPE_TUTORIAL_EVENTS,
} from './tutorial/shared';
import type { TagFacet } from './types';

const formStackClass = stack({ gap: '6' });
const normalizeTag = (value: string) => value.trim().toLowerCase();
type TagOption = Tag & { count: number };
type TagWithCount = TagOption & { selected: boolean };

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface RecipeFormProps {
    categories: Category[];
    tags: Tag[];
    tagFacets?: TagFacet[];
    authorId: string;
    initialData?: EditRecipeData;
    layout?: 'stack' | 'sidebar';
    initialShouldShowTutorial?: boolean;
    isAdmin?: boolean;
}

export function RecipeForm({
    categories,
    tags,
    tagFacets,
    authorId,
    initialData,
    layout = 'stack',
    initialShouldShowTutorial = false,
    isAdmin = false,
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
    // Calories are auto-calculated on save from ingredient nutrition data
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
            pluralName: ing.pluralName ?? null,
            amount: ing.amount,
            unit: ing.unit,
            availableUnits: ing.availableUnits ?? ['g', 'ml', 'Stk'],
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

    // ── flow state (stored in refs — changes don't re-render form) ──
    const flowNodesRef = useRef<FlowNodeInput[]>(initialData?.flowNodes ?? []);
    const flowEdgesRef = useRef<FlowEdgeInput[]>(initialData?.flowEdges ?? []);

    // ── tutorial guard — ref so the auto-save effect can read it without re-firing ──
    const tutorialActiveRef = useRef(!isEditMode && initialShouldShowTutorial);

    // ── auto-save ────────────────────────────────────────────
    const autoSavedIdRef = useRef<string | null>(initialData?.id ?? null);
    const [savedRecipeId, setSavedRecipeId] = useState<string | undefined>(initialData?.id);
    const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
    const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const [tutorialFlowState, setTutorialFlowState] = useState({
        nodeCount: initialData?.flowNodes?.length ?? 2,
        hasBranch: false,
    });
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
                const result = await updateRecipe(
                    autoSavedIdRef.current,
                    payload,
                    authorId,
                    isAdmin,
                );
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
    }, [title, authorId, isAdmin]);

    const performAutoSaveRef = useRef(performAutoSave);
    performAutoSaveRef.current = performAutoSave;

    const isPublished = saveStatus === 'PUBLISHED';

    useEffect(() => {
        if (tutorialActiveRef.current || isPublished || !title.trim()) {
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
                pluralName: ing.pluralName ?? null,
                amount: '',
                unit: ing.units[0] || 'g',
                availableUnits: ing.units.length > 0 ? ing.units : ['g', 'ml', 'Stk'],
                notes: '',
                isOptional: false,
                isNew: false,
            },
        ]);
    };

    const handleAddNewIngredient = async (name: string) => {
        const created = await createIngredient(name, undefined, []);
        setIngredients((prev) => [
            ...prev,
            {
                id: created.id,
                name: created.name,
                pluralName: created.pluralName ?? null,
                amount: '',
                unit: 'g',
                availableUnits: ['g', 'ml', 'Stk'],
                notes: '',
                isOptional: false,
                isNew: true,
            },
        ]);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const handleReorderIngredients = (newOrder: AddedIngredient[]) => {
        setIngredients(newOrder);
    };

    const handleReplaceIngredient = (index: number, replacement: IngredientSearchResult) => {
        if (ingredients.some((i, idx) => i.id === replacement.id && idx !== index)) return;

        const oldIngredient = ingredients[index];

        // 1. Replace in ingredient list
        setIngredients((prev) => {
            const next = [...prev];
            next[index] = {
                id: replacement.id,
                name: replacement.name,
                pluralName: replacement.pluralName ?? null,
                amount: oldIngredient.amount,
                unit: replacement.units.includes(oldIngredient.unit)
                    ? oldIngredient.unit
                    : replacement.units[0] || 'g',
                availableUnits:
                    replacement.units.length > 0 ? replacement.units : ['g', 'ml', 'Stk'],
                notes: oldIngredient.notes,
                isOptional: oldIngredient.isOptional,
                isNew: false,
            };
            return next;
        });

        // 2. Update @mentions in flow node descriptions
        //    @[OldName](oldId) → @[NewName](newId), preserving |override
        const escapedName = escapeRegex(oldIngredient.name);
        const mentionRegex = new RegExp(
            `@\\[${escapedName}(\\|[^\\]]*)?\\]\\(${oldIngredient.id}\\)`,
            'g',
        );
        flowNodesRef.current = flowNodesRef.current.map((node) => {
            if (!node.description?.includes(oldIngredient.id)) return node;
            const newDesc = node.description.replace(
                mentionRegex,
                `@[${replacement.name}$1](${replacement.id})`,
            );
            return {
                ...node,
                description: newDesc,
                ingredientIds: [...extractMentionedIds(newDesc)],
            };
        });
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

        const outgoingCounts = new Map<string, number>();
        for (const edge of edges) {
            outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) ?? 0) + 1);
        }

        setTutorialFlowState({
            nodeCount: nodes.length,
            hasBranch: Array.from(outgoingCounts.values()).some((count) => count > 1),
        });
    }, []);

    const handleAiApply = useCallback(
        async (result: AIAnalysisResult, apply: ApplySelection) => {
            if (apply.title && result.title) setTitle(result.title);
            if (apply.description && result.description) setDescription(result.description);
            if (apply.prepTime && result.prepTime) setPrepTime(result.prepTime);
            if (apply.cookTime && result.cookTime) setCookTime(result.cookTime);
            if (apply.servings && result.servings) setServings(result.servings);
            if (apply.difficulty && result.difficulty) setDifficulty(result.difficulty);

            if (apply.category && result.categoryIds?.length) {
                const matchedIds = result.categoryIds
                    .map((slug) => categories.find((c) => c.slug === slug))
                    .filter((c): c is NonNullable<typeof c> => Boolean(c))
                    .map((c) => c.id);
                if (matchedIds.length > 0) setCategoryIds(matchedIds);
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
                            pluralName: created.pluralName ?? null,
                            amount: ing.amount ?? '',
                            unit: ing.unit || 'g',
                            availableUnits: [
                                ...new Set(
                                    ing.unit ? [ing.unit, 'g', 'ml', 'Stk'] : ['g', 'ml', 'Stk'],
                                ),
                            ],
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

            // Upload AI-extracted recipe image to S3 (fire-and-forget — don't block the dialog)
            if (result.imageUrl && !imageKey) {
                uploadImageFromUrl(result.imageUrl)
                    .then((imgResult) => {
                        if (imgResult.success) {
                            setImageKey(imgResult.key);
                        }
                    })
                    .catch((err) => console.error('Failed to upload AI image:', err));
            }
        },
        [categories, initialTagCandidates, imageKey],
    );

    // Block Enter key from submitting form during tutorial
    const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (
            e.key === 'Enter' &&
            tutorialActiveRef.current &&
            (e.target as HTMLElement).tagName !== 'TEXTAREA'
        ) {
            e.preventDefault();
        }
    }, []);

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
                const recipe = await updateRecipe(recipeId, payload, authorId, isAdmin);
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
        if (tutorialActiveRef.current) return 'Auto-Save ist während des Tutorials pausiert';
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

    /* ── sidebar / accordion layout ── */

    const sidebarLayoutForm = (
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className={sidebarFormClass}>
            {/* Left: accordion sidebar */}
            <div className={sidebarCollapsed ? sidebarCollapsedClass : sidebarClass}>
                {!sidebarCollapsed && (
                    <button
                        type="button"
                        className={sidebarToggleClass}
                        onClick={() => setSidebarCollapsed(true)}
                        title="Sidebar einklappen"
                        data-tutorial="sidebar-collapse"
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
                        <div
                            className={autoSaveBarClass(autoSaveStatus)}
                            data-tutorial="autosave-bar"
                        >
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
                    <div className={sidebarSectionClass} data-tutorial="tags">
                        <TagSelector
                            sortedTags={sortedTags}
                            selectedTags={selectedTags}
                            tagQuery={tagQuery}
                            onTagQueryChange={setTagQuery}
                            onSelectionChange={setSelectedTags}
                            onCreateTag={findOrCreateTag}
                        />
                    </div>

                    <div className={sidebarDividerClass} />

                    {/* Ingredients */}
                    <div className={sidebarSectionClass}>
                        <IngredientManager
                            servings={servings}
                            onServingsChange={setServings}
                            ingredients={ingredients}
                            onAddIngredient={handleAddIngredient}
                            onAddNewIngredient={handleAddNewIngredient}
                            onUpdateIngredient={updateIngredient}
                            onRemoveIngredient={handleRemoveIngredient}
                            onReorderIngredients={handleReorderIngredients}
                            onReplaceIngredient={handleReplaceIngredient}
                            onServingsCustomTriggerClick={() =>
                                dispatchRecipeTutorialEvent(
                                    RECIPE_TUTORIAL_EVENTS.servingsCustomOpened,
                                )
                            }
                            onIngredientAmountFocus={() =>
                                dispatchRecipeTutorialEvent(
                                    RECIPE_TUTORIAL_EVENTS.ingredientAmountFocused,
                                )
                            }
                            onIngredientCommentClick={() =>
                                dispatchRecipeTutorialEvent(
                                    RECIPE_TUTORIAL_EVENTS.ingredientCommentClicked,
                                )
                            }
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
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
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

                <div data-tutorial="tags">
                    <TagSelector
                        sortedTags={sortedTags}
                        selectedTags={selectedTags}
                        tagQuery={tagQuery}
                        onTagQueryChange={setTagQuery}
                        onSelectionChange={setSelectedTags}
                        onCreateTag={findOrCreateTag}
                    />
                </div>

                <IngredientManager
                    servings={servings}
                    onServingsChange={setServings}
                    ingredients={ingredients}
                    onAddIngredient={handleAddIngredient}
                    onAddNewIngredient={handleAddNewIngredient}
                    onUpdateIngredient={updateIngredient}
                    onRemoveIngredient={handleRemoveIngredient}
                    onServingsCustomTriggerClick={() =>
                        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.servingsCustomOpened)
                    }
                    onIngredientAmountFocus={() =>
                        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.ingredientAmountFocused)
                    }
                    onIngredientCommentClick={() =>
                        dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.ingredientCommentClicked)
                    }
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
    const tutorialEligible = !isEditMode;

    const [showTutorial, setShowTutorial] = useState(initialShouldShowTutorial);

    useEffect(() => {
        if (!tutorialEligible) {
            setShowTutorial(false);
            return;
        }

        setShowTutorial(initialShouldShowTutorial);
    }, [initialShouldShowTutorial, tutorialEligible]);

    const handleTutorialComplete = useCallback(async () => {
        try {
            await completeRecipeCreationTutorial();
            window.localStorage.setItem(RECIPE_CREATION_TUTORIAL_KEY, 'done');
        } catch {
            // ignore localStorage failures and still hide tutorial
        }

        setShowTutorial(false);
        tutorialActiveRef.current = false;

        try {
            window.sessionStorage.setItem(
                RECIPE_CREATION_TUTORIAL_CELEBRATION_KEY,
                'finished-tutorial',
            );
        } catch {
            // ignore sessionStorage failures
        }

        // Redirect to the showcase recipe instead of creating a junk draft
        window.location.href = '/recipe/flammkuchen';
    }, []);

    return (
        <>
            {layoutForm}
            {tutorialEligible && showTutorial ? (
                <RecipeCreationTutorial
                    state={{
                        titleValue: title,
                        categoryCount: categoryIds.length,
                        ingredientCount: ingredients.length,
                        hasIngredientAmount: ingredients.some((i) => i.amount.trim() !== ''),
                        autoSaveLabel,
                        savedRecipeId,
                        isDesktop,
                        flow: tutorialFlowState,
                    }}
                    onFocusTitleField={focusTitleField}
                    onComplete={handleTutorialComplete}
                />
            ) : null}
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
