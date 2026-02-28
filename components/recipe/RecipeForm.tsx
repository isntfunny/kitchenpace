'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { stack } from 'styled-system/patterns';

import { searchIngredients } from '../recipe/actions';
import { createIngredient, createRecipe } from '../recipe/createActions';

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

const formStackClass = stack({
    gap: '6',
});

const normalizeTag = (value: string) => value.trim().toLowerCase();

type TagWithCount = Tag & { count: number; selected: boolean };

interface RecipeFormProps {
    categories: Category[];
    tags: Tag[];
    tagFacets?: TagFacet[];
    authorId: string;
}

export function RecipeForm({ categories, tags, tagFacets, authorId }: RecipeFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [servings, setServings] = useState(4);
    const [prepTime, setPrepTime] = useState(0);
    const [cookTime, setCookTime] = useState(0);
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [tagQuery, setTagQuery] = useState('');
    const [ingredients, setIngredients] = useState<AddedIngredient[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
    const [error, setError] = useState<string | null>(null);

    const [ingredientQuery, setIngredientQuery] = useState('');
    const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>([]);
    const [showNewIngredient, setShowNewIngredient] = useState(false);
    const [newIngredientName, setNewIngredientName] = useState('');
    const [newIngredientUnit, setNewIngredientUnit] = useState('');

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

    const tagFacetCountMap = useMemo(() => {
        const map = new Map<string, number>();
        tagFacets?.forEach((facet) => {
            const normalized = normalizeTag(facet.key);
            map.set(facet.key, facet.count);
            map.set(normalized, facet.count);
        });
        return map;
    }, [tagFacets]);

    const sortedTags = useMemo(() => {
        const normalizedQuery = tagQuery.toLowerCase().trim();
        const tagPool: TagWithCount[] = tags.map((tag) => {
            const normalizedName = normalizeTag(tag.name);
            const facetCount =
                tagFacetCountMap.get(tag.name) ?? tagFacetCountMap.get(normalizedName);
            const resolvedCount = facetCount ?? tag.count ?? 0;
            return {
                ...tag,
                count: resolvedCount,
                selected: selectedTags.includes(tag.id),
            };
        });
        const filtered = normalizedQuery
            ? tagPool.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
            : tagPool;

        return filtered.sort((a, b) => {
            if (a.selected && !b.selected) return -1;
            if (!a.selected && b.selected) return 1;
            if (a.count !== b.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });
    }, [selectedTags, tagQuery, tags, tagFacetCountMap]);

    const handleCategoryToggle = (id: string, selected: boolean) => {
        setCategoryIds((prev) => {
            if (selected) {
                return [...prev, id];
            }
            return prev.filter((categoryId) => categoryId !== id);
        });
    };

    const handleAddIngredient = (ing: IngredientSearchResult) => {
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

    const handleCreateNewIngredient = async () => {
        if (!newIngredientName.trim()) return;

        const unit = newIngredientUnit.trim() || 'Stück';
        const created = await createIngredient(newIngredientName.trim(), undefined, [unit]);
        setIngredients((prev) => [
            ...prev,
            {
                id: created.id,
                name: created.name,
                amount: '',
                unit,
                notes: '',
                isOptional: false,
                isNew: true,
            },
        ]);
        setNewIngredientName('');
        setNewIngredientUnit('');
        setShowNewIngredient(false);
        setIngredientQuery('');
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

            const recipe = await createRecipe(
                {
                    title: title.trim(),
                    description: description.trim(),
                    imageUrl: imageUrl || undefined,
                    servings,
                    prepTime,
                    cookTime,
                    difficulty,
                    categoryIds,
                    tagIds: selectedTags,
                    ingredients: ingredients.map((ing) => ({
                        ingredientId: ing.id,
                        amount: ing.amount,
                        unit: ing.unit,
                        notes: ing.notes || undefined,
                        isOptional: ing.isOptional,
                    })),
                    status: saveStatus,
                },
                authorId,
            );

            window.location.href = `/recipe/${recipe.id}`;
        } catch (err) {
            console.error('Error creating recipe:', err);
            setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Rezepts.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className={formStackClass}>
                <GeneralInformationSection
                    title={title}
                    onTitleChange={setTitle}
                    description={description}
                    onDescriptionChange={setDescription}
                    imageUrl={imageUrl}
                    onImageUrlChange={setImageUrl}
                />

                <TimeAndDifficultySection
                    prepTime={prepTime}
                    onPrepTimeChange={setPrepTime}
                    cookTime={cookTime}
                    onCookTimeChange={setCookTime}
                    servings={servings}
                    onServingsChange={setServings}
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
                    ingredientQuery={ingredientQuery}
                    onIngredientQueryChange={setIngredientQuery}
                    searchResults={searchResults}
                    showNewIngredient={showNewIngredient}
                    onShowNewIngredient={setShowNewIngredient}
                    newIngredientName={newIngredientName}
                    onNewIngredientNameChange={setNewIngredientName}
                    newIngredientUnit={newIngredientUnit}
                    onNewIngredientUnitChange={setNewIngredientUnit}
                    onCreateNewIngredient={handleCreateNewIngredient}
                    ingredients={ingredients}
                    onAddIngredient={handleAddIngredient}
                    onUpdateIngredient={updateIngredient}
                    onRemoveIngredient={handleRemoveIngredient}
                />

                {error && <ErrorBanner message={error} />}

                <SubmissionControls
                    saving={saving}
                    saveStatus={saveStatus}
                    onStatusChange={(next) => setSaveStatus(next)}
                />
            </div>
        </form>
    );
}
