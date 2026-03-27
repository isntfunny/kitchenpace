'use client';

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { Shuffle } from 'lucide-react';

import { css } from 'styled-system/css';

import { FilterPanel } from './shared/FilterPanel';
import { NodeWrapper } from './shared/NodeWrapper';

export const RandomPickExtension = Node.create({
    name: 'randomPick',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            category: { default: '' },
            categoryLabel: { default: '' },
            tags: { default: '' },
            tagLabels: { default: [] },
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
    const { category, categoryLabel, tags, tagLabels } = node.attrs;

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
                    <FilterPanel
                        category={category}
                        categoryLabel={categoryLabel}
                        tags={tags}
                        tagLabels={tagLabels}
                        sort="newest"
                        limit={1}
                        defaultSort="newest"
                        defaultLimit={1}
                        maxLimit={1}
                        categoryPlaceholder="Kategorie suchen…"
                        showSortLimit={false}
                        updateAttributes={updateAttributes}
                    />
                </div>
            </NodeWrapper>
        </NodeViewWrapper>
    );
}
