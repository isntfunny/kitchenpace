'use client';

import type { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    Link,
    List,
    ListOrdered,
    Quote,
    Plus,
} from 'lucide-react';

import { css } from 'styled-system/css';

interface EditorToolbarProps {
    editor: Editor | null;
    onInsertBlock: () => void;
}

export function EditorToolbar({ editor, onInsertBlock }: EditorToolbarProps) {
    if (!editor) return null;

    const btnClass = (active: boolean) =>
        css({
            p: '1.5',
            borderRadius: 'md',
            cursor: 'pointer',
            bg: active ? 'accent.soft' : 'transparent',
            color: active ? 'accent' : 'foreground.muted',
            _hover: { bg: 'surface.muted' },
        });

    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1',
                px: '3',
                py: '2',
                borderBottom: '1px solid',
                borderColor: 'border',
                bg: 'surface.muted',
                flexWrap: 'wrap',
            })}
        >
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={btnClass(editor.isActive('bold'))}
            >
                <Bold size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={btnClass(editor.isActive('italic'))}
            >
                <Italic size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={btnClass(editor.isActive('heading', { level: 1 }))}
            >
                <Heading1 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={btnClass(editor.isActive('heading', { level: 2 }))}
            >
                <Heading2 size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={btnClass(editor.isActive('bulletList'))}
            >
                <List size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={btnClass(editor.isActive('orderedList'))}
            >
                <ListOrdered size={16} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={btnClass(editor.isActive('blockquote'))}
            >
                <Quote size={16} />
            </button>
            <button
                type="button"
                onClick={() => {
                    const url = window.prompt('URL:');
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                className={btnClass(editor.isActive('link'))}
            >
                <Link size={16} />
            </button>

            <div
                className={css({
                    borderLeft: '1px solid',
                    borderColor: 'border',
                    h: '20px',
                    mx: '1',
                })}
            />

            <button
                type="button"
                onClick={onInsertBlock}
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1',
                    px: '2',
                    py: '1',
                    borderRadius: 'md',
                    fontSize: 'xs',
                    fontWeight: '600',
                    bg: 'primary',
                    color: 'white',
                    cursor: 'pointer',
                    _hover: { bg: 'accent.hover' },
                })}
            >
                <Plus size={14} /> Block einfügen
            </button>
        </div>
    );
}
