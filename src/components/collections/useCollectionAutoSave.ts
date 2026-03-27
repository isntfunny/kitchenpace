'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createCollection, updateCollection } from '@app/app/actions/collections';
import type { CollectionMutationInput, TiptapJSON } from '@app/lib/collections/types';

interface AutoSaveDeps {
    title: string;
    description: string;
    blocks: TiptapJSON | null;
    template: string;
    coverImageKey: string | null;
    categoryIds: string[];
    tagIds: string[];
    isPublished: boolean;
    initialId: string | null;
}

export interface CollectionAutoSaveResult {
    autoSavedIdRef: React.RefObject<string | null>;
    autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
    autoSaveLabel: string | null;
    buildPayload: () => CollectionMutationInput;
}

function sanitizeSerializableValue(value: unknown): unknown {
    if (value == null) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeSerializableValue(item) ?? null);
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
            const sanitized = sanitizeSerializableValue(entry);
            return sanitized === undefined ? [] : [[key, sanitized] as const];
        });
        return Object.fromEntries(entries);
    }
    return undefined;
}

function sanitizeBlocks(blocks: TiptapJSON | null): TiptapJSON | null {
    const sanitized = sanitizeSerializableValue(blocks);
    return sanitized && typeof sanitized === 'object' ? (sanitized as TiptapJSON) : null;
}

export function useCollectionAutoSave(deps: AutoSaveDeps): CollectionAutoSaveResult {
    const {
        title,
        description,
        blocks,
        template,
        coverImageKey,
        categoryIds,
        tagIds,
        isPublished,
        initialId,
    } = deps;

    const autoSavedIdRef = useRef<string | null>(initialId);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
        'idle',
    );
    const [autoSaveLabel, setAutoSaveLabel] = useState<string | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const buildPayload = useCallback((): CollectionMutationInput => {
        return {
            title: title.trim(),
            description: description.trim() || undefined,
            blocks: sanitizeBlocks(blocks),
            template,
            coverImageKey: coverImageKey ?? undefined,
            categoryIds: [...categoryIds],
            tagIds: [...tagIds],
        };
    }, [title, description, blocks, template, coverImageKey, categoryIds, tagIds]);

    const performAutoSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle || isPublished) return;

        setAutoSaveStatus('saving');
        setAutoSaveLabel('Wird gespeichert\u2026');

        try {
            const payload = buildPayload();

            if (autoSavedIdRef.current) {
                await updateCollection(autoSavedIdRef.current, payload);
            } else {
                const result = await createCollection(payload);
                autoSavedIdRef.current = result.id;
                window.history.replaceState({}, '', `/collection/${result.slug}/edit`);
            }

            setAutoSaveStatus('saved');
            const time = new Date().toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
            });
            setAutoSaveLabel(`Entwurf gespeichert ${time}`);
        } catch (error) {
            setAutoSaveStatus('error');
            const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
            if (message.startsWith('CONTENT_REJECTED:')) {
                setAutoSaveLabel(message.replace('CONTENT_REJECTED: ', ''));
            } else {
                setAutoSaveLabel('Fehler beim Speichern');
            }
        }
    }, [title, isPublished, buildPayload]);

    const performAutoSaveRef = useRef(performAutoSave);
    useEffect(() => {
        performAutoSaveRef.current = performAutoSave;
    }, [performAutoSave]);

    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => performAutoSaveRef.current(), 2500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [title, description, blocks, template, coverImageKey, categoryIds, tagIds]);

    return { autoSavedIdRef, autoSaveStatus, autoSaveLabel, buildPayload };
}
