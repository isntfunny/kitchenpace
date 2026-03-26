'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { CookingPot } from 'lucide-react';

import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';

import { NodeWrapper } from './shared/NodeWrapper';
import { RecipeSearchInline } from './shared/RecipeSearchInline';

export const RecipeCardExtension = Node.create({
    name: 'recipeCard',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            recipeId: { default: null },
            recipeTitle: { default: null },
            recipeImageKey: { default: null },
            recipeCategory: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-recipe-card]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-recipe-card': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(RecipeCardView);
    },
});

function RecipeCardView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
    const { recipeId, recipeTitle, recipeImageKey, recipeCategory } = node.attrs;

    if (!recipeId) {
        return (
            <NodeViewWrapper>
                <NodeWrapper
                    icon={CookingPot}
                    label="Rezeptkarte"
                    selected={selected}
                    onDelete={deleteNode}
                >
                    <RecipeSearchInline
                        onSelect={(recipe) =>
                            updateAttributes({
                                recipeId: recipe.id,
                                recipeTitle: recipe.title,
                                recipeImageKey: recipe.imageKey,
                                recipeCategory: recipe.category,
                            })
                        }
                    />
                </NodeWrapper>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <NodeWrapper
                icon={CookingPot}
                label="Rezeptkarte"
                selected={selected}
                onDelete={deleteNode}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                    <div
                        className={css({
                            w: '48px',
                            h: '48px',
                            borderRadius: 'lg',
                            overflow: 'hidden',
                            flexShrink: 0,
                            bg: 'surface.muted',
                        })}
                    >
                        <SmartImage
                            imageKey={recipeImageKey}
                            alt={recipeTitle ?? ''}
                            aspect="1:1"
                            sizes="48px"
                        />
                    </div>
                    <div className={css({ flex: 1, minW: 0 })}>
                        <div
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            })}
                        >
                            {recipeTitle}
                        </div>
                        {recipeCategory && (
                            <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                {recipeCategory}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            updateAttributes({
                                recipeId: null,
                                recipeTitle: null,
                                recipeImageKey: null,
                                recipeCategory: null,
                            })
                        }
                        className={css({
                            fontSize: 'xs',
                            color: 'accent',
                            cursor: 'pointer',
                            _hover: { textDecoration: 'underline' },
                        })}
                    >
                        Ändern
                    </button>
                </div>
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
