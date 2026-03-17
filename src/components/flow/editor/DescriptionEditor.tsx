'use client';

import { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';

import { searchIngredients } from '@app/components/recipe/actions';
import { createIngredient } from '@app/components/recipe/createActions';
import type { AddedIngredient } from '@app/components/recipe/RecipeForm/data';
import type { IngredientSearchResult } from '@app/components/recipe/RecipeForm/data';
import {
    dispatchRecipeTutorialEvent,
    RECIPE_TUTORIAL_EVENTS,
} from '@app/components/recipe/tutorial/shared';
import { useDropdownNavigation } from '@app/components/recipe/useDropdownNavigation';
import { useIngredientSearch } from '@app/components/recipe/useIngredientSearch';

import { css } from 'styled-system/css';

interface DescriptionEditorProps {
    value: string;
    onChange: (value: string) => void;
    availableIngredients: AddedIngredient[];
    placeholder?: string;
    /** Called when user selects a DB ingredient — add it to recipe list */
    onAddIngredient?: (ing: IngredientSearchResult) => void;
}

type DropdownIngredient =
    | { source: 'recipe'; ingredient: AddedIngredient }
    | { source: 'db'; ingredient: IngredientSearchResult };

/** Matches @[Name](id) or @[Name|override](id) */
const MENTION_FULL_REGEX = /@\[(.*?)(?:\|(.*?))?\]\((.*?)\)/g;

const FRACTIONS: { label: string; value: number }[] = [
    { label: '½', value: 0.5 },
    { label: '⅓', value: 1 / 3 },
    { label: '¼', value: 0.25 },
];

function computeFraction(ing: AddedIngredient, frac: number): string {
    const num = parseFloat(ing.amount);
    if (!isNaN(num) && num > 0) {
        const result = num * frac;
        const nice = Number.isInteger(result)
            ? String(result)
            : result.toFixed(1).replace(/\.0$/, '');
        return ing.unit ? `${nice} ${ing.unit}` : nice;
    }
    // Non-numeric amount — use symbol
    const fracLabel = FRACTIONS.find((f) => Math.abs(f.value - frac) < 0.001)?.label;
    return fracLabel ?? `${Math.round(frac * 100)}%`;
}

/** Render raw description string with @[Name](id) or @[Name|override](id) as inline chips */
function renderMentions(raw: string, ingredients: AddedIngredient[]): ReactNode {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_FULL_REGEX.lastIndex = 0;

    while ((match = MENTION_FULL_REGEX.exec(raw)) !== null) {
        if (match.index > lastIndex) {
            parts.push(raw.slice(lastIndex, match.index));
        }
        const [, name, override, id] = match;
        const ing = ingredients.find((i) => i.id === id);
        const amountStr = override
            ? ` (${override})`
            : ing && (ing.amount || ing.unit)
              ? ` (${[ing.amount, ing.unit].filter(Boolean).join(' ')})`
              : '';
        parts.push(
            <span
                key={match.index}
                style={{
                    backgroundColor: 'rgba(224,123,83,0.15)',
                    color: '#c45e30',
                    borderRadius: '4px',
                    padding: '1px 4px',
                    fontWeight: 600,
                }}
            >
                {name}
                {amountStr}
            </span>,
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < raw.length) {
        parts.push(raw.slice(lastIndex));
    }
    return parts.length > 0 ? parts : raw;
}

export function DescriptionEditor({
    value,
    onChange,
    availableIngredients,
    placeholder = 'Beschreibe den Schritt...',
    onAddIngredient,
}: DescriptionEditorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [query, setQuery] = useState('');
    const [mentionStart, setMentionStart] = useState(0);
    const [hoveredDropdownIndex, setHoveredDropdownIndex] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { results: dbResults } = useIngredientSearch(query);

    // Filter recipe ingredients matching the query
    const recipeMatches = useMemo<DropdownIngredient[]>(() => {
        const q = query.trim().toLowerCase();
        const matches = q
            ? availableIngredients.filter((ing) => ing.name.toLowerCase().includes(q))
            : availableIngredients;
        return matches.map((ing) => ({ source: 'recipe' as const, ingredient: ing }));
    }, [query, availableIngredients]);

    // Combine: recipe matches first, then DB results not already in recipe
    const dropdownItems = useMemo<DropdownIngredient[]>(() => {
        const recipeIds = new Set(availableIngredients.map((i) => i.id));
        const dbFiltered = dbResults.filter((r) => !recipeIds.has(r.id));
        return [
            ...recipeMatches,
            ...dbFiltered.map((ing) => ({ source: 'db' as const, ingredient: ing })),
        ];
    }, [recipeMatches, dbResults, availableIngredients]);

    /** Insert a @mention at the current mentionStart position. */
    const doInsertMention = useCallback(
        (id: string, name: string, amountOverride?: string) => {
            const before = value.slice(0, mentionStart);
            const after = value.slice(mentionStart + query.length + 1); // +1 for the @
            const mention = amountOverride
                ? `@[${name}|${amountOverride}](${id})`
                : `@[${name}](${id})`;
            const newValue = before + mention + ' ' + after;

            onChange(newValue);
            setIsOpen(false);
            setQuery('');
            dispatchRecipeTutorialEvent(RECIPE_TUTORIAL_EVENTS.descriptionMentionInserted);

            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    const pos = mentionStart + mention.length + 1;
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(pos, pos);
                }
            });
        },
        [value, mentionStart, query, onChange],
    );

    const insertMention = useCallback(
        (item: DropdownIngredient, amountOverride?: string) => {
            // If DB ingredient, add it to recipe first
            if (item.source === 'db' && onAddIngredient) {
                onAddIngredient(item.ingredient as IngredientSearchResult);
            }
            doInsertMention(item.ingredient.id, item.ingredient.name, amountOverride);
        },
        [doInsertMention, onAddIngredient],
    );

    /** Server-side resolve: search → bestMatch or create new → insert mention. */
    const resolveAndInsert = useCallback(
        async (mentionQuery: string) => {
            const fresh = await searchIngredients(mentionQuery);
            if (fresh.bestMatch) {
                // Add to recipe if not already there
                if (onAddIngredient) onAddIngredient(fresh.bestMatch);
                doInsertMention(fresh.bestMatch.id, fresh.bestMatch.name);
            } else {
                // Create new ingredient
                const created = await createIngredient(mentionQuery);
                if (onAddIngredient) {
                    onAddIngredient({
                        id: created.id,
                        name: created.name,
                        pluralName: null,
                        categories: [],
                        units: [],
                    });
                }
                doInsertMention(created.id, created.name);
            }
        },
        [doInsertMention, onAddIngredient],
    );

    const showDropdown = isOpen && dropdownItems.length > 0;

    const {
        highlightedIndex,
        setHighlightedIndex,
        handleKeyDown: navKeyDown,
        resetHighlight,
    } = useDropdownNavigation({
        itemCount: dropdownItems.length,
        isOpen: showDropdown,
        onSelect: (index) => {
            if (dropdownItems[index]) insertMention(dropdownItems[index]);
        },
        onEscape: () => setIsOpen(false),
    });

    /** Wrap navKeyDown: when @mention is open but dropdown has no items (or nav didn't handle),
     *  Enter resolves via server — same as IngredientSearchInput. */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // Let dropdown nav handle arrow keys, escape, and Enter when items exist
            if (showDropdown) {
                navKeyDown(e);
                return;
            }

            // @mention open but no dropdown items — handle Enter ourselves
            if (isOpen && query.trim() && e.key === 'Enter') {
                e.preventDefault();
                void resolveAndInsert(query.trim());
                return;
            }

            // Not in @mention mode — let default textarea behavior through
        },
        [showDropdown, navKeyDown, isOpen, query, resolveAndInsert],
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const text = e.target.value;
            const cursorPos = e.target.selectionStart;
            onChange(text);

            const textBeforeCursor = text.slice(0, cursorPos);
            const atIndex = textBeforeCursor.lastIndexOf('@');

            if (atIndex !== -1) {
                const textAfterAt = textBeforeCursor.slice(atIndex + 1);
                if (!textAfterAt.includes(']') && !textAfterAt.includes('\n')) {
                    setQuery(textAfterAt);
                    setMentionStart(atIndex);
                    setIsOpen(true);
                    resetHighlight();
                    return;
                }
            }

            setIsOpen(false);
            setQuery('');
        },
        [onChange, resetHighlight],
    );

    const recipeCount = recipeMatches.length;

    const hasMentions = value.includes('@[');

    return (
        <div ref={containerRef} className={containerClass} data-tutorial="node-description">
            {/* Rendered preview — shown when not focused and value has mentions */}
            {!isFocused && hasMentions && (
                <div
                    className={previewClass}
                    onClick={() => {
                        setIsFocused(true);
                        requestAnimationFrame(() => textareaRef.current?.focus());
                    }}
                >
                    {renderMentions(value, availableIngredients)}
                </div>
            )}

            <textarea
                ref={textareaRef}
                className={textareaClass}
                style={
                    !isFocused && hasMentions
                        ? {
                              position: 'absolute',
                              opacity: 0,
                              pointerEvents: 'none',
                              height: 0,
                              minHeight: 0,
                          }
                        : undefined
                }
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
                    setTimeout(() => {
                        setIsOpen(false);
                        setIsFocused(false);
                    }, 150);
                }}
                placeholder={placeholder}
            />
            {showDropdown && (
                <div className={dropdownClass} data-tutorial-child="node-description">
                    {dropdownItems.map((item, index) => {
                        const ing = item.ingredient;
                        const isDb = item.source === 'db';
                        const showSeparator = isDb && index === recipeCount && recipeCount > 0;
                        const isHovered = hoveredDropdownIndex === index;
                        const recipeIng = !isDb ? (ing as AddedIngredient) : null;
                        const hasFractions =
                            recipeIng !== null && !!(recipeIng.amount || recipeIng.unit);
                        return (
                            <div key={`${item.source}-${ing.id}`}>
                                {showSeparator && (
                                    <div className={separatorClass}>Aus Datenbank hinzufügen</div>
                                )}
                                <div
                                    className={itemClass}
                                    style={
                                        index === highlightedIndex
                                            ? { backgroundColor: 'rgba(224,123,83,0.1)' }
                                            : undefined
                                    }
                                    onMouseEnter={() => {
                                        setHighlightedIndex(index);
                                        setHoveredDropdownIndex(index);
                                    }}
                                    onMouseLeave={() => setHoveredDropdownIndex(null)}
                                >
                                    {/* Left: name — click inserts full amount */}
                                    <span
                                        className={ingredientNameClass}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertMention(item);
                                        }}
                                        style={{ cursor: 'pointer', flex: 1 }}
                                    >
                                        {ing.name}
                                    </span>

                                    {/* Right: amount or fraction buttons */}
                                    {isDb ? (
                                        <span className={addBadgeClass}>+ hinzufügen</span>
                                    ) : hasFractions && isHovered ? (
                                        /* Fraction buttons — shown on hover */
                                        <div className={fractionGroupClass}>
                                            {FRACTIONS.map((frac) => (
                                                <button
                                                    key={frac.label}
                                                    type="button"
                                                    className={fractionBtnClass}
                                                    title={computeFraction(recipeIng!, frac.value)}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        insertMention(
                                                            item,
                                                            computeFraction(recipeIng!, frac.value),
                                                        );
                                                    }}
                                                >
                                                    {frac.label}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className={ingredientAmountClass}>
                                            {recipeIng?.amount} {recipeIng?.unit}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <p className={hintClass}>Tipp: Schreibe @Zutat um eine Zutat zu verknüpfen</p>
        </div>
    );
}

/* ── styles ──────────────────────────────────────────────── */

const containerClass = css({
    position: 'relative',
    width: '100%',
});

const previewClass = css({
    width: '100%',
    minHeight: '80px',
    p: '2.5',
    border: { base: '1px solid rgba(224,123,83,0.4)', _dark: '1px solid rgba(224,123,83,0.3)' },
    borderRadius: 'xl',
    fontSize: 'sm',
    lineHeight: '1.6',
    cursor: 'text',
    color: 'text',
    backgroundColor: 'surface',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    _hover: {
        borderColor: 'brand.primary',
    },
});

const textareaClass = css({
    width: '100%',
    minHeight: '80px',
    p: '2.5',
    border: { base: '1px solid rgba(224,123,83,0.4)', _dark: '1px solid rgba(224,123,83,0.3)' },
    borderRadius: 'xl',
    fontSize: 'sm',
    fontFamily: 'body',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none',
    backgroundColor: 'surface',
    color: 'text',
    _placeholder: { color: 'text.muted' },
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.15)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
});

const hintClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    mt: '1',
});

const dropdownClass = css({
    position: 'absolute',
    left: '0',
    right: '0',
    top: '100%',
    mt: '1',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'surface',
    border: { base: '1px solid rgba(224,123,83,0.3)', _dark: '1px solid rgba(224,123,83,0.25)' },
    borderRadius: 'lg',
    boxShadow: { base: '0 8px 24px rgba(0,0,0,0.12)', _dark: '0 8px 24px rgba(0,0,0,0.35)' },
    p: '1',
    zIndex: '50',
});

const separatorClass = css({
    px: '2.5',
    py: '1.5',
    fontSize: '10px',
    fontWeight: '600',
    color: 'text.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderTop: { base: '1px solid rgba(224,123,83,0.15)', _dark: '1px solid rgba(224,123,83,0.2)' },
    mt: '1',
});

const itemClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    py: '2',
    px: '2.5',
    borderRadius: 'md',
    cursor: 'pointer',
    fontSize: 'sm',
    color: 'text',
    transition: 'background-color 0.1s ease',
    _hover: { backgroundColor: { base: 'rgba(224,123,83,0.08)', _dark: 'rgba(224,123,83,0.13)' } },
});

const ingredientNameClass = css({ fontWeight: '500' });

const ingredientAmountClass = css({
    fontSize: 'xs',
    color: 'text.muted',
    fontWeight: '500',
});

const addBadgeClass = css({
    fontSize: '11px',
    fontWeight: '600',
    color: 'brand.primary',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    px: '1.5',
    py: '0.5',
    borderRadius: 'md',
});

const fractionGroupClass = css({
    display: 'flex',
    gap: '1',
    alignItems: 'center',
});

const fractionBtnClass = css({
    fontSize: '13px',
    fontWeight: '700',
    color: 'brand.primary',
    backgroundColor: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' },
    border: {
        base: '1.5px solid rgba(224,123,83,0.25)',
        _dark: '1.5px solid rgba(224,123,83,0.3)',
    },
    borderRadius: 'md',
    px: '1.5',
    py: '0.5',
    cursor: 'pointer',
    lineHeight: '1',
    transition: 'all 0.1s ease',
    _hover: {
        backgroundColor: { base: 'rgba(224,123,83,0.2)', _dark: 'rgba(224,123,83,0.25)' },
        borderColor: 'brand.primary',
    },
});
