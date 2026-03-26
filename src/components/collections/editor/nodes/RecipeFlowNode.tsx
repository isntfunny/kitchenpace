'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { GitBranch } from 'lucide-react';

import { css } from 'styled-system/css';

import { NodeWrapper } from './shared/NodeWrapper';
import { RecipeSearchInline } from './shared/RecipeSearchInline';

export const RecipeFlowExtension = Node.create({
    name: 'recipeFlow',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            recipeId: { default: null },
            recipeTitle: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-recipe-flow]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-recipe-flow': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(RecipeFlowView);
    },
});

function RecipeFlowView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
    const { recipeId, recipeTitle } = node.attrs;

    if (!recipeId) {
        return (
            <NodeViewWrapper>
                <NodeWrapper
                    icon={GitBranch}
                    label="Rezept-Flow"
                    selected={selected}
                    onDelete={deleteNode}
                >
                    <RecipeSearchInline
                        onSelect={(recipe) =>
                            updateAttributes({
                                recipeId: recipe.id,
                                recipeTitle: recipe.title,
                            })
                        }
                        placeholder="Rezept für Flow-Ansicht suchen…"
                    />
                </NodeWrapper>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <NodeWrapper
                icon={GitBranch}
                label="Rezept-Flow"
                selected={selected}
                onDelete={deleteNode}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                    <GitBranch size={20} className={css({ color: 'accent', flexShrink: 0 })} />
                    <div className={css({ flex: 1, minW: 0 })}>
                        <div
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'text',
                            })}
                        >
                            Flow-Ansicht von &ldquo;{recipeTitle}&rdquo;
                        </div>
                        <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Zeigt den interaktiven Rezept-Flow an
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateAttributes({ recipeId: null, recipeTitle: null })}
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
