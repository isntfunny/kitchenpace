'use client';

import { Placeholder } from '@tiptap/extensions';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import type { TiptapJSON } from '@app/lib/collections/types';

import { css } from 'styled-system/css';

import { EditorToolbar } from './EditorToolbar';
import { FeaturedTrioExtension } from './nodes/FeaturedTrioNode';
import { RandomPickExtension } from './nodes/RandomPickNode';
import { RecipeCardExtension } from './nodes/RecipeCardNode';
import { RecipeCardWithTextExtension } from './nodes/RecipeCardWithTextNode';
import { RecipeFlowExtension } from './nodes/RecipeFlowNode';
import { RecipeSliderExtension } from './nodes/RecipeSliderNode';
import { TopListExtension } from './nodes/TopListNode';
import { SlashCommandsExtension } from './SlashCommandMenu';

interface CollectionBlockEditorProps {
    initialContent?: TiptapJSON | null;
    onUpdate: (json: TiptapJSON) => void;
}

export function CollectionBlockEditor({ initialContent, onUpdate }: CollectionBlockEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Placeholder.configure({ placeholder: 'Tippe / um einen Block einzufügen…' }),
            RecipeCardExtension,
            RecipeCardWithTextExtension,
            RecipeSliderExtension,
            FeaturedTrioExtension,
            TopListExtension,
            RandomPickExtension,
            RecipeFlowExtension,
            SlashCommandsExtension,
        ],
        content: initialContent ?? undefined,
        onUpdate: ({ editor: ed }) => {
            onUpdate(ed.getJSON() as TiptapJSON);
        },
        editorProps: {
            attributes: {
                class: css({
                    outline: 'none',
                    minH: '300px',
                    px: '4',
                    py: '3',
                    fontSize: 'base',
                    lineHeight: '1.8',
                    color: 'text',
                    '& h1': { fontSize: '2xl', fontWeight: 'bold', mt: '6', mb: '2' },
                    '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: '5', mb: '2' },
                    '& h3': { fontSize: 'lg', fontWeight: 'bold', mt: '4', mb: '2' },
                    '& p': { mb: '3' },
                    '& ul, & ol': { pl: '6', mb: '3' },
                    '& blockquote': {
                        borderLeft: '3px solid',
                        borderColor: 'accent',
                        pl: '4',
                        color: 'foreground.muted',
                        fontStyle: 'italic',
                        my: '4',
                    },
                    '& a': { color: 'accent', textDecoration: 'underline' },
                    '& hr': { borderColor: 'border', my: '6' },
                }),
            },
        },
    });

    const handleInsertBlock = () => {
        if (!editor) return;
        editor.chain().focus().insertContent('/').run();
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', flex: 1, minH: 0 })}>
            <div className={css({ flex: 1, overflow: 'auto', p: '4' })}>
                <div
                    className={css({
                        bg: 'surface.elevated',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'xl',
                        boxShadow: 'shadow.medium',
                        minH: '400px',
                        overflow: 'hidden',
                    })}
                >
                    <EditorToolbar editor={editor} onInsertBlock={handleInsertBlock} />
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
