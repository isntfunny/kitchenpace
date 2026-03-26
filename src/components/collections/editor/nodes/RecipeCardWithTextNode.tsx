'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { LayoutList } from 'lucide-react';

import { SmartImage } from '@app/components/atoms/SmartImage';

import { css } from 'styled-system/css';

import { NodeWrapper } from './shared/NodeWrapper';
import { RecipeSearchInline } from './shared/RecipeSearchInline';

export const RecipeCardWithTextExtension = Node.create({
    name: 'recipeCardWithText',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            recipeId: { default: null },
            recipeTitle: { default: null },
            recipeImageKey: { default: null },
            recipeCategory: { default: null },
            text: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-recipe-card-text]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-recipe-card-text': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(RecipeCardWithTextView);
    },
});

function RecipeCardWithTextView({
    node,
    updateAttributes,
    deleteNode,
    selected,
}: ReactNodeViewProps) {
    const { recipeId, recipeTitle, recipeImageKey, recipeCategory, text } = node.attrs;

    if (!recipeId) {
        return (
            <NodeViewWrapper>
                <NodeWrapper
                    icon={LayoutList}
                    label="Rezeptkarte mit Text"
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
                icon={LayoutList}
                label="Rezeptkarte mit Text"
                selected={selected}
                onDelete={deleteNode}
            >
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '3',
                        alignItems: 'start',
                    })}
                >
                    <textarea
                        value={typeof text === 'string' ? text : ''}
                        onChange={(e) => updateAttributes({ text: e.target.value })}
                        placeholder="Beschreibung eingeben…"
                        rows={4}
                        className={css({
                            w: '100%',
                            p: '2',
                            border: '1px solid',
                            borderColor: 'border',
                            borderRadius: 'lg',
                            bg: 'background',
                            fontSize: 'sm',
                            lineHeight: '1.5',
                            resize: 'vertical',
                            outline: 'none',
                            _focus: { borderColor: 'accent' },
                        })}
                    />
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
                                    mt: '1',
                                    _hover: { textDecoration: 'underline' },
                                })}
                            >
                                Ändern
                            </button>
                        </div>
                    </div>
                </div>
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
