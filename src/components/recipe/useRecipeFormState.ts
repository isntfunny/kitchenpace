'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EditRecipeData } from '@app/app/actions/recipes';
import type {
    FlowEdgeSerialized,
    FlowNodeSerialized,
} from '@app/components/flow/editor/editorTypes';
import { extractMentionedIds } from '@app/components/flow/viewer/viewerUtils';
import type { AIAnalysisResult, ApplySelection } from '@app/lib/importer/ai-text-analysis';
import { escapeRegex } from '@app/lib/ingredients/parseIngredientInput';

import { searchTags } from '../recipe/actions';

import { createIngredient, findOrCreateTag, uploadImageFromUrl } from './ingredientActions';
import { AddedIngredient, Category, IngredientSearchResult, Tag } from './RecipeForm/data';
import type { FlowEdgeInput, FlowNodeInput } from './recipeFormTypes';
import type { TagFacet } from './types';

const normalizeTag = (value: string) => value.trim().toLowerCase();
type TagOption = Tag & { count: number };
type TagWithCount = TagOption & { selected: boolean };

export type { TagWithCount };

export interface RecipeFormStateProps {
    categories: Category[];
    tags: Tag[];
    tagFacets?: TagFacet[];
    initialData?: EditRecipeData;
}

export function useRecipeFormState({
    categories,
    tags,
    tagFacets,
    initialData,
}: RecipeFormStateProps) {
    const isEditMode = Boolean(initialData);

    // -- form state --
    const [title, setTitle] = useState(initialData?.title ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [imageKey, setImageKey] = useState(initialData?.imageKey ?? '');
    const [servings, setServings] = useState(initialData?.servings ?? 4);
    const [prepTime, setPrepTime] = useState(initialData?.prepTime ?? 0);
    const [cookTime, setCookTime] = useState(initialData?.cookTime ?? 0);
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

    // -- manual save state --
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'DRAFT' | 'PUBLISHED'>(
        initialData?.status ?? 'DRAFT',
    );
    const [error, setError] = useState<string | null>(null);

    // -- flow state (stored in refs -- changes don't re-render form) --
    const flowNodesRef = useRef<FlowNodeInput[]>(initialData?.flowNodes ?? []);
    const flowEdgesRef = useRef<FlowEdgeInput[]>(initialData?.flowEdges ?? []);

    const titleInputRef = useRef<HTMLInputElement>(null);
    const focusTitleField = useCallback(() => {
        if (!titleInputRef.current) return;
        titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInputRef.current.focus({ preventScroll: true });
    }, []);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // -- tutorial flow state --
    const [tutorialFlowState, setTutorialFlowState] = useState({
        nodeCount: initialData?.flowNodes?.length ?? 2,
        hasBranch: false,
    });

    // -- progress --
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

    // -- tag sorting --
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

    // -- handlers --
    const handleCategoryToggle = (id: string, selected: boolean) => {
        setCategoryIds((prev) =>
            selected ? [...prev, id] : prev.filter((categoryId) => categoryId !== id),
        );
    };

    const handleAddIngredient = (ing: IngredientSearchResult) => {
        if (ingredients.some((i) => i.id === ing.id)) return;
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

            // Upload AI-extracted recipe image to S3 (fire-and-forget)
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

    return {
        // Form state
        title,
        setTitle,
        description,
        setDescription,
        imageKey,
        setImageKey,
        servings,
        setServings,
        prepTime,
        setPrepTime,
        cookTime,
        setCookTime,
        difficulty,
        setDifficulty,
        categoryIds,
        selectedTags,
        setSelectedTags,
        tagQuery,
        setTagQuery,
        ingredients,
        saving,
        setSaving,
        saveStatus,
        setSaveStatus,
        error,
        setError,

        // Refs
        flowNodesRef,
        flowEdgesRef,
        titleInputRef,

        // Computed
        isEditMode,
        titleDone,
        kategorieDone,
        ingredientsDone,
        mandatoryMet,
        progressPct,
        sortedTags,
        focusTitleField,
        sidebarCollapsed,
        setSidebarCollapsed,
        tutorialFlowState,

        // Handlers
        handleCategoryToggle,
        handleAddIngredient,
        handleAddNewIngredient,
        handleRemoveIngredient,
        handleReorderIngredients,
        handleReplaceIngredient,
        updateIngredient,
        handleFlowChange,
        handleAiApply,

        // For tag selector
        findOrCreateTag,

        // Initial data passthrough
        initialNodes: (initialData?.flowNodes ?? []) as unknown as FlowNodeSerialized[],
        initialEdges: initialData?.flowEdges as unknown as FlowEdgeSerialized[],
    };
}
