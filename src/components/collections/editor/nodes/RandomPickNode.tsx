'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { Shuffle } from 'lucide-react';

import { css } from 'styled-system/css';

import { NodeWrapper } from './shared/NodeWrapper';

export const RandomPickExtension = Node.create({
    name: 'randomPick',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            category: { default: '' },
            tags: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-random-pick]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { 'data-random-pick': '', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(RandomPickView);
    },
});

function RandomPickView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
    const { category, tags } = node.attrs;

    return (
        <NodeViewWrapper>
            <NodeWrapper
                icon={Shuffle}
                label="Zufalls-Pick"
                selected={selected}
                onDelete={deleteNode}
            >
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                    <p
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            fontStyle: 'italic',
                            mb: '1',
                        })}
                    >
                        Zeigt ein zufälliges Rezept aus den gewählten Filtern an.
                    </p>
                    <label className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                        Kategorie
                        <input
                            type="text"
                            value={typeof category === 'string' ? category : ''}
                            onChange={(e) => updateAttributes({ category: e.target.value })}
                            placeholder="z.B. Desserts (leer = alle)"
                            className={css({
                                w: '100%',
                                mt: '1',
                                px: '2',
                                py: '1',
                                border: '1px solid',
                                borderColor: 'border',
                                borderRadius: 'md',
                                bg: 'background',
                                fontSize: 'sm',
                                outline: 'none',
                                _focus: { borderColor: 'accent' },
                            })}
                        />
                    </label>
                    <label className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                        Tags (kommagetrennt)
                        <input
                            type="text"
                            value={typeof tags === 'string' ? tags : ''}
                            onChange={(e) => updateAttributes({ tags: e.target.value })}
                            placeholder="z.B. vegan, schnell"
                            className={css({
                                w: '100%',
                                mt: '1',
                                px: '2',
                                py: '1',
                                border: '1px solid',
                                borderColor: 'border',
                                borderRadius: 'md',
                                bg: 'background',
                                fontSize: 'sm',
                                outline: 'none',
                                _focus: { borderColor: 'accent' },
                            })}
                        />
                    </label>
                </div>
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
