'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { FlowEdgeInput, FlowNodeInput } from './recipeFormTypes';
import { createRecipe, updateRecipe } from './recipeMutations';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type { AutoSaveStatus };

export interface AutoSaveDeps {
    title: string;
    description: string;
    imageKey: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    selectedTags: string[];
    ingredients: {
        id: string;
        name: string;
        amount: string;
        unit: string;
        notes: string;
        isOptional: boolean;
    }[];
    flowNodesRef: React.RefObject<FlowNodeInput[]>;
    flowEdgesRef: React.RefObject<FlowEdgeInput[]>;
    authorId: string;
    isAdmin: boolean;
    isPublished: boolean;
    tutorialActiveRef: React.RefObject<boolean>;
    initialId: string | null;
    setImageKey: (key: string) => void;
}

export interface AutoSaveResult {
    autoSavedIdRef: React.RefObject<string | null>;
    savedRecipeId: string | undefined;
    autoSaveStatus: AutoSaveStatus;
    autoSaveLabel: string | null;
    buildPayload: (status: 'DRAFT' | 'PUBLISHED') => {
        title: string;
        description: string;
        imageKey: string | undefined;
        servings: number;
        prepTime: number;
        cookTime: number;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
        categoryIds: string[];
        tagIds: string[];
        ingredients: {
            ingredientId: string;
            ingredientName: string;
            amount: string;
            unit: string;
            notes: string | undefined;
            isOptional: boolean;
        }[];
        flowNodes: FlowNodeInput[];
        flowEdges: FlowEdgeInput[];
        status: 'DRAFT' | 'PUBLISHED';
    };
}

export function useRecipeAutoSave(deps: AutoSaveDeps): AutoSaveResult {
    const {
        title,
        description,
        imageKey,
        servings,
        prepTime,
        cookTime,
        difficulty,
        categoryIds,
        selectedTags,
        ingredients,
        flowNodesRef,
        flowEdgesRef,
        authorId,
        isAdmin,
        isPublished,
        tutorialActiveRef,
        initialId,
        setImageKey,
    } = deps;

    const autoSavedIdRef = useRef<string | null>(initialId);
    const [savedRecipeId, setSavedRecipeId] = useState<string | undefined>(initialId ?? undefined);
    const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
    const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [tutorialPaused, setTutorialPaused] = useState(false);

    // Build the payload for save/update -- reads current state at call time
    const buildPayload = useCallback(
        (status: 'DRAFT' | 'PUBLISHED') => ({
            title: title.trim(),
            description: description.trim(),
            imageKey: imageKey || undefined,
            servings,
            prepTime,
            cookTime,
            difficulty,
            categoryIds,
            tagIds: selectedTags,
            ingredients: ingredients.map((ing) => ({
                ingredientId: ing.id,
                ingredientName: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                notes: ing.notes || undefined,
                isOptional: ing.isOptional,
            })),
            flowNodes: flowNodesRef.current,
            flowEdges: flowEdgesRef.current,
            status,
        }),
        [
            title,
            description,
            imageKey,
            servings,
            prepTime,
            cookTime,
            difficulty,
            categoryIds,
            selectedTags,
            ingredients,
            flowNodesRef,
            flowEdgesRef,
        ],
    );

    const buildPayloadRef = useRef(buildPayload);
    useEffect(() => {
        buildPayloadRef.current = buildPayload;
    });

    const performAutoSave = useCallback(async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        setAutoSaveStatus('saving');
        try {
            const payload = buildPayloadRef.current('DRAFT');

            if (autoSavedIdRef.current) {
                const result = await updateRecipe(
                    autoSavedIdRef.current,
                    payload,
                    authorId,
                    isAdmin,
                );
                if (result.imageKey && result.imageKey !== payload.imageKey) {
                    setImageKey(result.imageKey);
                }
            } else {
                const recipe = await createRecipe(payload, authorId);
                autoSavedIdRef.current = recipe.id;
                setSavedRecipeId(recipe.id);
                window.history.replaceState({}, '', `/recipe/${recipe.id}/edit`);
            }

            setAutoSaveStatus('saved');
            setAutoSavedAt(new Date());
        } catch {
            setAutoSaveStatus('error');
        }
    }, [title, authorId, isAdmin, setImageKey]);

    const performAutoSaveRef = useRef(performAutoSave);
    useEffect(() => {
        performAutoSaveRef.current = performAutoSave;
    });

    useEffect(() => {
        setTutorialPaused(!!tutorialActiveRef.current);
        if (tutorialActiveRef.current || isPublished || !title.trim()) {
            setAutoSaveStatus('idle');
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            return;
        }

        setAutoSaveStatus('idle');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => performAutoSaveRef.current(), 2500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [
        isPublished,
        tutorialActiveRef,
        title,
        description,
        imageKey,
        servings,
        prepTime,
        cookTime,
        difficulty,
        categoryIds,
        selectedTags,
        ingredients,
    ]);

    // Auto-save status label
    const autoSaveLabel = (() => {
        if (tutorialPaused) return 'Auto-Save ist während des Tutorials pausiert';
        if (isPublished) return 'Automatisches Speichern ist nur für Entwürfe verfügbar';
        if (!title.trim()) return null;
        if (autoSaveStatus === 'saving') return 'Wird gespeichert…';
        if (autoSaveStatus === 'error') return 'Fehler beim Speichern';
        if (autoSaveStatus === 'saved' && autoSavedAt) {
            return `Entwurf gespeichert ${autoSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        }
        return null;
    })();

    return {
        autoSavedIdRef,
        savedRecipeId,
        autoSaveStatus,
        autoSaveLabel,
        buildPayload,
    };
}
