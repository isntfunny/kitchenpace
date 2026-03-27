'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { Star, X } from 'lucide-react';

import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';

import { NodeWrapper } from './shared/NodeWrapper';
import { RecipeSearchInline } from './shared/RecipeSearchInline';

export const FeaturedTrioExtension = Node.create({
    name: 'featuredTrio',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            recipeIds: { default: [] },
            recipeTitles: { default: [] },
            recipeImageKeys: { default: [] },
            recipeCategories: { default: [] },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-featured-trio]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-featured-trio': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(FeaturedTrioView);
    },
});

function FeaturedTrioView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
    const ids = Array.isArray(node.attrs.recipeIds)
        ? (node.attrs.recipeIds as (string | null)[])
        : [];
    const titles = Array.isArray(node.attrs.recipeTitles)
        ? (node.attrs.recipeTitles as (string | null)[])
        : [];
    const imageKeys = Array.isArray(node.attrs.recipeImageKeys)
        ? (node.attrs.recipeImageKeys as (string | null)[])
        : [];
    const categories = Array.isArray(node.attrs.recipeCategories)
        ? (node.attrs.recipeCategories as (string | null)[])
        : [];

    const setSlot = (
        index: number,
        recipe: { id: string; title: string; imageKey: string | null; category: string },
    ) => {
        const newIds = [...ids];
        const newTitles = [...titles];
        const newImageKeys = [...imageKeys];
        const newCategories = [...categories];
        newIds[index] = recipe.id;
        newTitles[index] = recipe.title;
        newImageKeys[index] = recipe.imageKey;
        newCategories[index] = recipe.category;
        updateAttributes({
            recipeIds: newIds,
            recipeTitles: newTitles,
            recipeImageKeys: newImageKeys,
            recipeCategories: newCategories,
        });
    };

    const clearSlot = (index: number) => {
        const newIds = [...ids];
        const newTitles = [...titles];
        const newImageKeys = [...imageKeys];
        const newCategories = [...categories];
        newIds[index] = null;
        newTitles[index] = null;
        newImageKeys[index] = null;
        newCategories[index] = null;
        updateAttributes({
            recipeIds: newIds,
            recipeTitles: newTitles,
            recipeImageKeys: newImageKeys,
            recipeCategories: newCategories,
        });
    };

    return (
        <NodeViewWrapper>
            <NodeWrapper
                icon={Star}
                label="Featured Trio"
                selected={selected}
                onDelete={deleteNode}
            >
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '3',
                    })}
                >
                    {[0, 1, 2].map((slotIndex) => {
                        const recipeId = ids[slotIndex];
                        const title = titles[slotIndex];
                        const imageKey = imageKeys[slotIndex];
                        const category = categories[slotIndex];

                        if (!recipeId) {
                            // Empty slot — show search
                            return (
                                <div
                                    key={slotIndex}
                                    className={css({
                                        border: '2px dashed',
                                        borderColor: 'border',
                                        borderRadius: 'lg',
                                        p: '3',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minH: '140px',
                                        bg: 'surface.muted',
                                    })}
                                >
                                    <div
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'foreground.muted',
                                            mb: '2',
                                            textAlign: 'center',
                                        })}
                                    >
                                        Slot {slotIndex + 1}
                                    </div>
                                    <RecipeSearchInline
                                        placeholder="Rezept wählen…"
                                        onSelect={(recipe) => setSlot(slotIndex, recipe)}
                                    />
                                </div>
                            );
                        }

                        // Filled slot — show recipe preview
                        return (
                            <div
                                key={slotIndex}
                                className={css({
                                    border: '1px solid',
                                    borderColor: 'border',
                                    borderRadius: 'lg',
                                    overflow: 'hidden',
                                    bg: 'surface',
                                    position: 'relative',
                                })}
                            >
                                {/* Thumbnail */}
                                <div
                                    className={css({
                                        aspectRatio: '16/9',
                                        bg: 'surface.muted',
                                        position: 'relative',
                                    })}
                                >
                                    <SmartImage
                                        imageKey={imageKey}
                                        alt={title ?? ''}
                                        aspect="16:9"
                                        sizes="200px"
                                        fill
                                    />
                                    {/* Remove button */}
                                    <button
                                        type="button"
                                        onClick={() => clearSlot(slotIndex)}
                                        className={css({
                                            position: 'absolute',
                                            top: '1',
                                            right: '1',
                                            p: '1',
                                            borderRadius: 'full',
                                            bg: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            _hover: { bg: 'rgba(0,0,0,0.7)' },
                                        })}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                {/* Info */}
                                <div className={css({ p: '2' })}>
                                    <div
                                        className={css({
                                            fontSize: 'xs',
                                            fontWeight: '600',
                                            color: 'text',
                                            lineClamp: '1',
                                        })}
                                    >
                                        {title}
                                    </div>
                                    {category && (
                                        <div
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            {category}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
