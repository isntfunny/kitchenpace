'use client';

import { Extension } from '@tiptap/core';
import type { Range, Editor } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type {
    SuggestionOptions,
    SuggestionProps,
    SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import {
    CookingPot,
    LayoutList,
    BookOpen,
    Star,
    ListOrdered,
    Shuffle,
    GitBranch,
    Heading1,
    Heading2,
    List,
    Quote,
    Minus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

import { css } from 'styled-system/css';

interface SlashItem {
    title: string;
    icon: LucideIcon;
    nodeType?: string;
    action?: string;
}

const SLASH_ITEMS: SlashItem[] = [
    { title: 'Rezeptkarte', icon: CookingPot, nodeType: 'recipeCard' },
    { title: 'Rezeptkarte mit Text', icon: LayoutList, nodeType: 'recipeCardWithText' },
    { title: 'Rezept-Slider', icon: BookOpen, nodeType: 'recipeSlider' },
    { title: 'Featured Trio', icon: Star, nodeType: 'featuredTrio' },
    { title: 'Top-Liste', icon: ListOrdered, nodeType: 'topList' },
    { title: 'Zufalls-Pick', icon: Shuffle, nodeType: 'randomPick' },
    { title: 'Rezept-Flow', icon: GitBranch, nodeType: 'recipeFlow' },
    { title: 'Überschrift 1', icon: Heading1, action: 'heading1' },
    { title: 'Überschrift 2', icon: Heading2, action: 'heading2' },
    { title: 'Aufzählung', icon: List, action: 'bulletList' },
    { title: 'Nummerierung', icon: ListOrdered, action: 'orderedList' },
    { title: 'Zitat', icon: Quote, action: 'blockquote' },
    { title: 'Trennlinie', icon: Minus, action: 'horizontalRule' },
];

function executeItem(editor: Editor, range: Range, item: SlashItem) {
    if (item.nodeType) {
        editor.chain().focus().deleteRange(range).insertContent({ type: item.nodeType }).run();
    } else if (item.action) {
        const chain = editor.chain().focus().deleteRange(range);
        switch (item.action) {
            case 'heading1':
                chain.toggleHeading({ level: 1 }).run();
                break;
            case 'heading2':
                chain.toggleHeading({ level: 2 }).run();
                break;
            case 'bulletList':
                chain.toggleBulletList().run();
                break;
            case 'orderedList':
                chain.toggleOrderedList().run();
                break;
            case 'blockquote':
                chain.toggleBlockquote().run();
                break;
            case 'horizontalRule':
                chain.setHorizontalRule().run();
                break;
        }
    }
}

interface SlashMenuComponentProps {
    items: SlashItem[];
    command: (item: SlashItem) => void;
    onKeyDownRef: React.RefObject<((event: KeyboardEvent) => boolean) | null>;
}

function SlashMenuComponent({ items, command, onKeyDownRef }: SlashMenuComponentProps) {
    const [rawIndex, setRawIndex] = useState(0);
    const selectedIndex = items.length > 0 ? rawIndex % items.length : 0;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent): boolean => {
            if (event.key === 'ArrowUp') {
                setRawIndex((prev) => (prev - 1 + items.length) % items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setRawIndex((prev) => (prev + 1) % items.length);
                return true;
            }
            if (event.key === 'Enter') {
                const item = items[selectedIndex];
                if (item) command(item);
                return true;
            }
            return false;
        },
        [items, selectedIndex, command],
    );

    useEffect(() => {
        onKeyDownRef.current = handleKeyDown;
    }, [handleKeyDown, onKeyDownRef]);

    if (items.length === 0) return null;

    return (
        <div
            className={css({
                bg: 'surface.elevated',
                border: '1px solid',
                borderColor: 'border',
                borderRadius: 'lg',
                boxShadow: 'md',
                py: '1',
                maxH: '320px',
                overflowY: 'auto',
                w: '240px',
            })}
        >
            {items.map((item, index) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.title}
                        type="button"
                        onClick={() => command(item)}
                        className={css({
                            w: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            px: '3',
                            py: '1.5',
                            fontSize: 'sm',
                            textAlign: 'left',
                            cursor: 'pointer',
                            bg: index === selectedIndex ? 'accent.soft' : 'transparent',
                            color: 'text',
                            _hover: { bg: 'accent.soft' },
                        })}
                    >
                        <Icon
                            size={16}
                            className={css({
                                color: item.nodeType ? 'accent' : 'foreground.muted',
                                flexShrink: 0,
                            })}
                        />
                        <span>{item.title}</span>
                    </button>
                );
            })}
        </div>
    );
}

export const SlashCommandsExtension = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                startOfLine: false,
                items: ({ query }: { query: string }) => {
                    const q = query.toLowerCase();
                    return SLASH_ITEMS.filter((item) => item.title.toLowerCase().includes(q));
                },
                render: () => {
                    let container: HTMLDivElement | null = null;
                    let root: ReturnType<typeof createRoot> | null = null;
                    const keyDownHandlerRef: React.RefObject<
                        ((event: KeyboardEvent) => boolean) | null
                    > = { current: null };

                    return {
                        onStart(props: SuggestionProps<SlashItem>) {
                            container = document.createElement('div');
                            container.style.position = 'absolute';
                            container.style.zIndex = '50';
                            document.body.appendChild(container);

                            root = createRoot(container);
                            root.render(
                                <SlashMenuComponent
                                    items={props.items}
                                    command={(item) => {
                                        props.command(item);
                                    }}
                                    onKeyDownRef={keyDownHandlerRef}
                                />,
                            );

                            updatePosition(container, props.clientRect);
                        },

                        onUpdate(props: SuggestionProps<SlashItem>) {
                            root?.render(
                                <SlashMenuComponent
                                    items={props.items}
                                    command={(item) => {
                                        props.command(item);
                                    }}
                                    onKeyDownRef={keyDownHandlerRef}
                                />,
                            );
                            if (container) updatePosition(container, props.clientRect);
                        },

                        onKeyDown(props: SuggestionKeyDownProps) {
                            if (props.event.key === 'Escape') {
                                cleanup();
                                return true;
                            }
                            return keyDownHandlerRef.current?.(props.event) ?? false;
                        },

                        onExit() {
                            cleanup();
                        },
                    };

                    function updatePosition(
                        el: HTMLDivElement,
                        clientRect: (() => DOMRect | null) | null | undefined,
                    ) {
                        const rect = clientRect?.();
                        if (!rect) return;
                        el.style.left = `${rect.left}px`;
                        el.style.top = `${rect.bottom + 4}px`;
                    }

                    function cleanup() {
                        // Defer unmount to avoid React warnings about sync unmount during render
                        const r = root;
                        const c = container;
                        root = null;
                        container = null;
                        if (r && c) {
                            setTimeout(() => {
                                r.unmount();
                                c.remove();
                            }, 0);
                        }
                    }
                },
                command: ({
                    editor,
                    range,
                    props,
                }: {
                    editor: Editor;
                    range: Range;
                    props: SlashItem;
                }) => {
                    executeItem(editor, range, props);
                },
            } satisfies Partial<SuggestionOptions<SlashItem, SlashItem>>,
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});
