'use client';

import { Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { publishCollection, updateCollection } from '@app/app/actions/collections';
import type { TiptapJSON } from '@app/lib/collections/types';

import { css } from 'styled-system/css';

import { CollectionBlockEditor } from './editor/CollectionBlockEditor';
import { useCollectionAutoSave } from './useCollectionAutoSave';

interface CollectionEditorProps {
    initialData?: {
        id: string;
        slug: string;
        title: string;
        description: string | null;
        blocks: TiptapJSON | null;
        template: string;
        coverImageKey: string | null;
        categoryIds: string[];
        tagIds: string[];
        published: boolean;
    };
}

export function CollectionEditor({ initialData }: CollectionEditorProps) {
    const router = useRouter();

    const [title, setTitle] = useState(initialData?.title ?? '');
    const [description, setDescription] = useState(initialData?.description ?? '');
    const [blocks, setBlocks] = useState<TiptapJSON | null>(
        (initialData?.blocks as TiptapJSON) ?? null,
    );
    const [template] = useState<string>(initialData?.template ?? 'INLINE');
    const [coverImageKey] = useState<string | null>(initialData?.coverImageKey ?? null);
    const [categoryIds] = useState<string[]>(initialData?.categoryIds ?? []);
    const [tagIds] = useState<string[]>(initialData?.tagIds ?? []);
    const [publishing, setPublishing] = useState(false);

    const autoSave = useCollectionAutoSave({
        title,
        description,
        blocks,
        template,
        coverImageKey,
        categoryIds,
        tagIds,
        isPublished: initialData?.published ?? false,
        initialId: initialData?.id ?? null,
    });

    const isPublished = initialData?.published ?? false;

    const handlePublish = async () => {
        const id = autoSave.autoSavedIdRef.current;
        if (!id) return;
        setPublishing(true);
        try {
            const { slug } = await publishCollection(id);
            router.push(`/collection/${slug}`);
        } catch (error) {
            console.error('[CollectionEditor] Publish failed:', error);
        } finally {
            setPublishing(false);
        }
    };

    const handleUpdate = async () => {
        setPublishing(true);
        try {
            const payload = autoSave.buildPayload();
            const { slug } = await updateCollection(initialData!.id, payload);
            router.push(`/collection/${slug}`);
        } catch (error) {
            console.error('[CollectionEditor] Update failed:', error);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                h: { base: 'auto', md: '100%' },
                minH: 0,
                w: '100%',
            })}
        >
            {/* Header */}
            <div
                className={css({
                    p: '4',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4',
                })}
            >
                <input
                    type="text"
                    placeholder="Sammlungstitel..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={css({
                        flex: 1,
                        fontSize: 'xl',
                        fontWeight: 'bold',
                        border: 'none',
                        outline: 'none',
                        bg: 'transparent',
                    })}
                />
                <span
                    className={css({
                        fontSize: 'xs',
                        color: autoSave.autoSaveStatus === 'error' ? 'red.500' : 'text-muted',
                    })}
                >
                    {isPublished ? null : autoSave.autoSaveLabel}
                </span>
                {isPublished ? (
                    <button
                        onClick={handleUpdate}
                        disabled={publishing}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            px: '4',
                            py: '2',
                            bg: 'primary',
                            color: 'white',
                            borderRadius: 'lg',
                            fontWeight: 'bold',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            _hover: { bg: 'accent.hover' },
                            _disabled: { opacity: 0.5, cursor: 'not-allowed' },
                        })}
                    >
                        <Save size={16} />
                        Aktualisieren
                    </button>
                ) : (
                    <button
                        onClick={handlePublish}
                        disabled={publishing || !autoSave.autoSavedIdRef.current}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            px: '4',
                            py: '2',
                            bg: 'primary',
                            color: 'white',
                            borderRadius: 'lg',
                            fontWeight: 'bold',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            _hover: { bg: 'accent.hover' },
                            _disabled: { opacity: 0.5, cursor: 'not-allowed' },
                        })}
                    >
                        <Send size={16} />
                        Veröffentlichen
                    </button>
                )}
            </div>

            {/* Description */}
            <div
                className={css({
                    px: '4',
                    py: '2',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                })}
            >
                <input
                    type="text"
                    placeholder="Kurzbeschreibung (optional)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={css({
                        w: '100%',
                        fontSize: 'sm',
                        border: 'none',
                        outline: 'none',
                        bg: 'transparent',
                        color: 'text-muted',
                    })}
                />
            </div>

            {/* Block Editor */}
            <CollectionBlockEditor
                initialContent={initialData?.blocks ?? null}
                onUpdate={setBlocks}
            />
        </div>
    );
}
