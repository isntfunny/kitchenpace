'use client';

import * as Checkbox from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useEffect, useMemo, useState } from 'react';

import { FileUpload } from '@/components/features/FileUpload';
import { css, cx } from 'styled-system/css';
import { grid, stack } from 'styled-system/patterns';

import { searchIngredients } from '../recipe/actions';
import { createIngredient, createRecipe } from '../recipe/createActions';

import type { TagFacet } from './types';

interface Category {
    id: string;
    name: string;
}

interface Tag {
    id: string;
    name: string;
    count?: number;
}

interface IngredientSearchResult {
    id: string;
    name: string;
    category: string | null;
    units: string[];
}

interface AddedIngredient {
    id: string;
    name: string;
    amount: string;
    unit: string;
    notes: string;
    isOptional: boolean;
    isNew: boolean;
}

interface RecipeFormProps {
    categories: Category[];
    tags: Tag[];
    tagFacets?: TagFacet[];
    authorId: string;
}

type TagWithCount = Tag & { count: number; selected: boolean };

const formStackClass = stack({
    gap: '6',
});

const sectionStackClass = stack({
    gap: '3',
});

const normalizeTag = (value: string) => value.trim().toLowerCase();

const tagSearchInputClass = css({
    width: '100%',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: 'light',
    background: 'surface',
    px: '3',
    py: '2.5',
    fontSize: 'sm',
    outline: 'none',
    _focus: {
        borderColor: 'primary',
    },
});

const tagChipsWrapperClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
});

const tagChipBaseClass = css({
    borderRadius: 'full',
    px: '3',
    py: '2',
    minHeight: '40px',
    border: '1px solid',
    borderColor: 'light',
    background: 'surface',
    color: 'text',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'sm',
    cursor: 'pointer',
    transition: 'border 150ms ease, background 150ms ease, color 150ms ease',
});

const tagChipSelectedClass = css({
    borderColor: 'primary-dark',
    background: 'primary',
    color: 'light',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.12)',
});

const tagZeroClass = css({
    opacity: 0.8,
    color: 'text-muted',
});

const tagCountClass = css({
    fontSize: 'xs',
    borderRadius: 'full',
    px: '2',
    py: '0.5',
    background: 'accent',
    color: 'secondary',
    fontWeight: '600',
});

const tagCountZeroClass = css({
    background: 'surface',
    border: '1px solid',
    borderColor: 'light',
    color: 'text-muted',
    fontWeight: '500',
});

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
    const [error, setError] = useState<string | null>(null);

    // Ingredient search state
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>([]);
    const [showNewIngredient, setShowNewIngredient] = useState(false);
    const [newIngredientName, setNewIngredientName] = useState('');
    const [newIngredientUnit, setNewIngredientUnit] = useState('');

    // Search for ingredients
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
        tagFacets?.forEach((facet: TagFacet) => {
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

    const handleAddIngredient = (ing: IngredientSearchResult) => {
        setIngredients([
            ...ingredients,
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

        setIngredients([
            ...ingredients,
            {
                id: created.id,
                name: created.name,
                amount: '',
                unit: unit,
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
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Validate
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
                    categoryIds: categoryIds,
                    tagIds: selectedTags,
                    ingredients: ingredients.map((ing) => ({
                        ingredientId: ing.id,
                        amount: ing.amount,
                        unit: ing.unit,
                        notes: ing.notes || undefined,
                        isOptional: ing.isOptional,
                    })),
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
                {/* Image Upload */}
                <div>
                    <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                        Rezeptbild
                    </label>
                    <FileUpload type="recipe" value={imageUrl} onChange={setImageUrl} />
                </div>

                {/* Title */}
                <div>
                    <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                        Titel *
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="z.B. Spaghetti Carbonara"
                        className={css({
                            width: '100%',
                            padding: '3',
                            borderRadius: 'xl',
                            border: '1px solid rgba(224,123,83,0.4)',
                            fontSize: 'md',
                            outline: 'none',
                            _focus: {
                                borderColor: '#e07b53',
                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                            },
                        })}
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                        Beschreibung
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Kurze Beschreibung des Rezepts..."
                        rows={3}
                        className={css({
                            width: '100%',
                            padding: '3',
                            borderRadius: 'xl',
                            border: '1px solid rgba(224,123,83,0.4)',
                            fontSize: 'md',
                            resize: 'vertical',
                            outline: 'none',
                            _focus: {
                                borderColor: '#e07b53',
                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                            },
                        })}
                    />
                </div>

                {/* Time & Servings */}
                <div
                    className={grid({
                        columns: { base: 2, md: 4 },
                        gap: '4',
                    })}
                >
                    <div>
                        <label
                            className={css({
                                fontWeight: '600',
                                display: 'block',
                                mb: '2',
                                fontSize: 'sm',
                            })}
                        >
                            Vorbereitung (Min)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={prepTime}
                            onChange={(e) => setPrepTime(Number(e.target.value))}
                            className={css({
                                width: '100%',
                                padding: '3',
                                borderRadius: 'xl',
                                border: '1px solid rgba(224,123,83,0.4)',
                                fontSize: 'md',
                                outline: 'none',
                                _focus: {
                                    borderColor: '#e07b53',
                                },
                            })}
                        />
                    </div>
                    <div>
                        <label
                            className={css({
                                fontWeight: '600',
                                display: 'block',
                                mb: '2',
                                fontSize: 'sm',
                            })}
                        >
                            Kochen (Min)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={cookTime}
                            onChange={(e) => setCookTime(Number(e.target.value))}
                            className={css({
                                width: '100%',
                                padding: '3',
                                borderRadius: 'xl',
                                border: '1px solid rgba(224,123,83,0.4)',
                                fontSize: 'md',
                                outline: 'none',
                                _focus: {
                                    borderColor: '#e07b53',
                                },
                            })}
                        />
                    </div>
                    <div>
                        <label
                            className={css({
                                fontWeight: '600',
                                display: 'block',
                                mb: '2',
                                fontSize: 'sm',
                            })}
                        >
                            Portionen
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={servings}
                            onChange={(e) => setServings(Number(e.target.value))}
                            className={css({
                                width: '100%',
                                padding: '3',
                                borderRadius: 'xl',
                                border: '1px solid rgba(224,123,83,0.4)',
                                fontSize: 'md',
                                outline: 'none',
                                _focus: {
                                    borderColor: '#e07b53',
                                },
                            })}
                        />
                    </div>
                    <div>
                        <label
                            className={css({
                                fontWeight: '600',
                                display: 'block',
                                mb: '2',
                                fontSize: 'sm',
                            })}
                        >
                            Schwierigkeit
                        </label>
                        <select
                            value={difficulty}
                            onChange={(e) =>
                                setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')
                            }
                            className={css({
                                width: '100%',
                                padding: '3',
                                borderRadius: 'xl',
                                border: '1px solid rgba(224,123,83,0.4)',
                                fontSize: 'md',
                                outline: 'none',
                                bg: 'white',
                                _focus: {
                                    borderColor: '#e07b53',
                                },
                            })}
                        >
                            <option value="EASY">Einfach</option>
                            <option value="MEDIUM">Mittel</option>
                            <option value="HARD">Schwer</option>
                        </select>
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                        Kategorien (mindestens eine)
                    </label>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '2',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: '2',
                            border: '1px solid rgba(224,123,83,0.4)',
                            borderRadius: 'xl',
                        })}
                    >
                        {categories.map((cat) => (
                            <label
                                key={cat.id}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    cursor: 'pointer',
                                    padding: '1',
                                    borderRadius: 'md',
                                    _hover: { bg: 'gray.50' },
                                })}
                            >
                                <Checkbox.Root
                                    checked={categoryIds.includes(cat.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setCategoryIds([...categoryIds, cat.id]);
                                        } else {
                                            setCategoryIds(
                                                categoryIds.filter((id) => id !== cat.id),
                                            );
                                        }
                                    }}
                                    className={css({
                                        width: '4',
                                        height: '4',
                                        backgroundColor: 'white',
                                        borderRadius: 'sm',
                                        border: '2px solid',
                                        borderColor: categoryIds.includes(cat.id)
                                            ? 'brand.primary'
                                            : 'gray.300',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        _hover: { borderColor: 'brand.primary' },
                                        '&[data-state="checked"]': {
                                            backgroundColor: 'brand.primary',
                                            borderColor: 'brand.primary',
                                        },
                                    })}
                                >
                                    <Checkbox.Indicator>
                                        <CheckIcon color="white" width={12} height={12} />
                                    </Checkbox.Indicator>
                                </Checkbox.Root>
                                <span>{cat.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Tags */}
                <div className={sectionStackClass}>
                    <label className={css({ fontWeight: '600', display: 'block' })}>Tags</label>
                    <input
                        type="search"
                        value={tagQuery}
                        onChange={(event) => setTagQuery(event.target.value)}
                        placeholder="Tags durchsuchen"
                        className={tagSearchInputClass}
                    />
                    <ToggleGroup.Root
                        type="multiple"
                        aria-label="Tags auswählen"
                        className={tagChipsWrapperClass}
                        value={selectedTags}
                        onValueChange={(next) => setSelectedTags(next)}
                    >
                        {sortedTags.map((tag) => {
                            const chipClass = cx(
                                tagChipBaseClass,
                                tag.selected && tagChipSelectedClass,
                                !tag.selected && tag.count === 0 && tagZeroClass,
                            );
                            const badgeClass = cx(
                                tagCountClass,
                                tag.count === 0 && tagCountZeroClass,
                            );
                            return (
                                <ToggleGroup.Item key={tag.id} value={tag.id} className={chipClass}>
                                    <span>{tag.name}</span>
                                    <span className={badgeClass}>{tag.count}</span>
                                </ToggleGroup.Item>
                            );
                        })}
                    </ToggleGroup.Root>
                    {sortedTags.length === 0 && (
                        <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                            Keine Tags zum Anzeigen.
                        </p>
                    )}
                </div>

                {/* Ingredients */}
                <div>
                    <label className={css({ fontWeight: '600', display: 'block', mb: '2' })}>
                        Zutaten *
                    </label>

                    {/* Search/Add Ingredient */}
                    <div className={css({ position: 'relative', mb: '4' })}>
                        <input
                            type="text"
                            value={ingredientQuery}
                            onChange={(e) => {
                                setIngredientQuery(e.target.value);
                                setShowNewIngredient(false);
                            }}
                            placeholder="Zutat suchen oder neu erstellen..."
                            className={css({
                                width: '100%',
                                padding: '3',
                                borderRadius: 'xl',
                                border: '1px solid rgba(224,123,83,0.4)',
                                fontSize: 'md',
                                outline: 'none',
                                _focus: {
                                    borderColor: '#e07b53',
                                    boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                },
                            })}
                        />

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div
                                className={css({
                                    position: 'absolute',
                                    top: '100%',
                                    left: '0',
                                    right: '0',
                                    bg: 'white',
                                    borderRadius: 'xl',
                                    boxShadow: 'lg',
                                    zIndex: '10',
                                    maxH: '200px',
                                    overflowY: 'auto',
                                })}
                            >
                                {searchResults.map((ing) => (
                                    <button
                                        key={ing.id}
                                        type="button"
                                        onClick={() => handleAddIngredient(ing)}
                                        className={css({
                                            width: '100%',
                                            padding: '3',
                                            textAlign: 'left',
                                            bg: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            _hover: { bg: 'rgba(224,123,83,0.1)' },
                                        })}
                                    >
                                        <span className={css({ fontWeight: '500' })}>
                                            {ing.name}
                                        </span>
                                        <span
                                            className={css({
                                                color: 'text-muted',
                                                fontSize: 'sm',
                                                ml: '2',
                                            })}
                                        >
                                            {ing.category || 'Ohne Kategorie'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Create New Option */}
                        {ingredientQuery.length >= 2 && !showNewIngredient && (
                            <button
                                type="button"
                                onClick={() => setShowNewIngredient(true)}
                                className={css({
                                    position: 'absolute',
                                    right: '2',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bg: '#e07b53',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'lg',
                                    px: '3',
                                    py: '1',
                                    fontSize: 'sm',
                                    cursor: 'pointer',
                                })}
                            >
                                + Neu
                            </button>
                        )}

                        {/* New Ingredient Form */}
                        {showNewIngredient && (
                            <div
                                className={css({
                                    position: 'absolute',
                                    top: '100%',
                                    left: '0',
                                    right: '0',
                                    bg: 'white',
                                    borderRadius: 'xl',
                                    boxShadow: 'lg',
                                    p: '4',
                                    zIndex: '10',
                                })}
                            >
                                <div className={css({ fontWeight: '600', mb: '2' })}>
                                    Neue Zutat erstellen
                                </div>
                                <input
                                    type="text"
                                    value={newIngredientName}
                                    onChange={(e) => setNewIngredientName(e.target.value)}
                                    placeholder="Name der Zutat"
                                    className={css({
                                        width: '100%',
                                        padding: '2',
                                        borderRadius: 'lg',
                                        border: '1px solid rgba(224,123,83,0.4)',
                                        mb: '2',
                                    })}
                                />
                                <input
                                    type="text"
                                    value={newIngredientUnit}
                                    onChange={(e) => setNewIngredientUnit(e.target.value)}
                                    placeholder="Einheit (z.B. g, ml, Stück)"
                                    className={css({
                                        width: '100%',
                                        padding: '2',
                                        borderRadius: 'lg',
                                        border: '1px solid rgba(224,123,83,0.4)',
                                        mb: '3',
                                    })}
                                />
                                <div className={css({ display: 'flex', gap: '2' })}>
                                    <button
                                        type="button"
                                        onClick={handleCreateNewIngredient}
                                        className={css({
                                            flex: '1',
                                            bg: '#e07b53',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'lg',
                                            py: '2',
                                            cursor: 'pointer',
                                        })}
                                    >
                                        Erstellen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewIngredient(false)}
                                        className={css({
                                            flex: '1',
                                            bg: 'transparent',
                                            color: 'text',
                                            border: '1px solid rgba(224,123,83,0.4)',
                                            borderRadius: 'lg',
                                            py: '2',
                                            cursor: 'pointer',
                                        })}
                                    >
                                        Abbrechen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Added Ingredients List */}
                    {ingredients.length > 0 && (
                        <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                            {ingredients.map((ing, index) => (
                                <div
                                    key={`${ing.id}-${index}`}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                        padding: '3',
                                        bg: 'rgba(224,123,83,0.05)',
                                        borderRadius: 'xl',
                                    })}
                                >
                                    <span className={css({ flex: '1', fontWeight: '500' })}>
                                        {ing.name}
                                    </span>
                                    <input
                                        type="text"
                                        value={ing.amount}
                                        onChange={(e) => {
                                            const updated = [...ingredients];
                                            updated[index].amount = e.target.value;
                                            setIngredients(updated);
                                        }}
                                        placeholder="Menge"
                                        className={css({
                                            width: '80px',
                                            padding: '2',
                                            borderRadius: 'lg',
                                            border: '1px solid rgba(224,123,83,0.3)',
                                            fontSize: 'sm',
                                            textAlign: 'center',
                                        })}
                                    />
                                    <input
                                        type="text"
                                        value={ing.unit}
                                        onChange={(e) => {
                                            const updated = [...ingredients];
                                            updated[index].unit = e.target.value;
                                            setIngredients(updated);
                                        }}
                                        placeholder="Einheit"
                                        className={css({
                                            width: '80px',
                                            padding: '2',
                                            borderRadius: 'lg',
                                            border: '1px solid rgba(224,123,83,0.3)',
                                            fontSize: 'sm',
                                            textAlign: 'center',
                                        })}
                                    />
                                    <label
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1',
                                            fontSize: 'sm',
                                        })}
                                    >
                                        <Checkbox.Root
                                            checked={ing.isOptional}
                                            onCheckedChange={(checked) => {
                                                const updated = [...ingredients];
                                                updated[index].isOptional = checked === true;
                                                setIngredients(updated);
                                            }}
                                            className={css({
                                                width: '4',
                                                height: '4',
                                                backgroundColor: 'white',
                                                borderRadius: 'sm',
                                                border: '2px solid',
                                                borderColor: ing.isOptional
                                                    ? 'brand.primary'
                                                    : 'gray.300',
                                                cursor: 'pointer',
                                                transition: 'all 150ms ease',
                                                _hover: { borderColor: 'brand.primary' },
                                                '&[data-state="checked"]': {
                                                    backgroundColor: 'brand.primary',
                                                    borderColor: 'brand.primary',
                                                },
                                            })}
                                        >
                                            <Checkbox.Indicator>
                                                <CheckIcon color="white" width={12} height={12} />
                                            </Checkbox.Indicator>
                                        </Checkbox.Root>
                                        Optional
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveIngredient(index)}
                                        className={css({
                                            bg: 'transparent',
                                            border: 'none',
                                            color: '#e07b53',
                                            fontSize: 'lg',
                                            cursor: 'pointer',
                                            padding: '1',
                                        })}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div
                        className={css({
                            padding: '4',
                            bg: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: 'xl',
                        })}
                    >
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={saving}
                    className={css({
                        alignSelf: 'flex-start',
                        borderRadius: 'full',
                        px: '8',
                        py: '3',
                        background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                        color: 'white',
                        fontWeight: '700',
                        border: 'none',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                        transition: 'transform 150ms ease',
                        _hover: { transform: saving ? 'none' : 'translateY(-1px)' },
                    })}
                >
                    {saving ? 'Wird gespeichert...' : 'Rezept erstellen'}
                </button>
            </div>
        </form>
    );
}
