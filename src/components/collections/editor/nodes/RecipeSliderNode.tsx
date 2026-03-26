'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { BookOpen, X, Plus } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { FilterPanel } from './shared/FilterPanel';
import { NodeWrapper } from './shared/NodeWrapper';
import { RecipeSearchInline } from './shared/RecipeSearchInline';

export const RecipeSliderExtension = Node.create({
    name: 'recipeSlider',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            recipeIds: { default: [] },
            recipeTitles: { default: [] },
            category: { default: '' },
            tags: { default: '' },
            sort: { default: 'newest' },
            limit: { default: 10 },
            mode: { default: 'manual' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-recipe-slider]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-recipe-slider': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(RecipeSliderView);
    },
});

function RecipeSliderView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
    const { recipeIds, recipeTitles, category, tags, sort, limit, mode } = node.attrs;
    const ids = Array.isArray(recipeIds) ? (recipeIds as string[]) : [];
    const titles = Array.isArray(recipeTitles) ? (recipeTitles as string[]) : [];
    const [showSearch, setShowSearch] = useState(false);

    const isFilter = mode === 'filter';

    return (
        <NodeViewWrapper>
            <NodeWrapper
                icon={BookOpen}
                label="Rezept-Slider"
                selected={selected}
                onDelete={deleteNode}
            >
                <div className={css({ display: 'flex', gap: '2', mb: '3' })}>
                    <button
                        type="button"
                        onClick={() => updateAttributes({ mode: 'manual' })}
                        className={css({
                            px: '3',
                            py: '1',
                            borderRadius: 'md',
                            fontSize: 'xs',
                            fontWeight: '600',
                            cursor: 'pointer',
                            bg: !isFilter ? 'accent.soft' : 'surface.muted',
                            color: !isFilter ? 'accent' : 'foreground.muted',
                        })}
                    >
                        Manuell
                    </button>
                    <button
                        type="button"
                        onClick={() => updateAttributes({ mode: 'filter' })}
                        className={css({
                            px: '3',
                            py: '1',
                            borderRadius: 'md',
                            fontSize: 'xs',
                            fontWeight: '600',
                            cursor: 'pointer',
                            bg: isFilter ? 'accent.soft' : 'surface.muted',
                            color: isFilter ? 'accent' : 'foreground.muted',
                        })}
                    >
                        Filter
                    </button>
                </div>

                {!isFilter && (
                    <div>
                        <div
                            className={css({
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '2',
                                mb: '2',
                            })}
                        >
                            {ids.map((id, i) => (
                                <span
                                    key={id}
                                    className={css({
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '1',
                                        px: '2',
                                        py: '1',
                                        borderRadius: 'md',
                                        bg: 'accent.soft',
                                        fontSize: 'xs',
                                        color: 'text',
                                    })}
                                >
                                    {titles[i] ?? id}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newIds = ids.filter((_, j) => j !== i);
                                            const newTitles = titles.filter((_, j) => j !== i);
                                            updateAttributes({
                                                recipeIds: newIds,
                                                recipeTitles: newTitles,
                                            });
                                        }}
                                        className={css({
                                            cursor: 'pointer',
                                            color: 'foreground.muted',
                                            _hover: { color: 'text' },
                                        })}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            {!showSearch && (
                                <button
                                    type="button"
                                    onClick={() => setShowSearch(true)}
                                    className={css({
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '1',
                                        px: '2',
                                        py: '1',
                                        borderRadius: 'md',
                                        border: '1px dashed',
                                        borderColor: 'border',
                                        fontSize: 'xs',
                                        color: 'foreground.muted',
                                        cursor: 'pointer',
                                        _hover: { borderColor: 'accent', color: 'accent' },
                                    })}
                                >
                                    <Plus size={12} /> Rezept hinzufügen
                                </button>
                            )}
                        </div>
                        {showSearch && (
                            <RecipeSearchInline
                                onSelect={(recipe) => {
                                    if (!ids.includes(recipe.id)) {
                                        updateAttributes({
                                            recipeIds: [...ids, recipe.id],
                                            recipeTitles: [...titles, recipe.title],
                                        });
                                    }
                                    setShowSearch(false);
                                }}
                            />
                        )}
                    </div>
                )}

                {isFilter && (
                    <FilterPanel
                        category={category as string}
                        tags={tags as string}
                        sort={sort as string}
                        limit={limit as number}
                        defaultSort="newest"
                        defaultLimit={10}
                        maxLimit={50}
                        updateAttributes={updateAttributes}
                    />
                )}
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
