import { useEffect, useRef, useState } from 'react';

import {
    analyzeRecipeText,
    type AIAnalysisResult,
    type ApplySelection,
} from '@app/lib/importer/ai-text-analysis';

export type Phase = 'input' | 'processing' | 'review' | 'done' | 'error';

const DEFAULT_APPLY: ApplySelection = {
    title: true,
    description: true,
    category: true,
    tags: true,
    prepTime: true,
    cookTime: true,
    servings: true,
    difficulty: true,
    ingredients: true,
};

interface UseAiConversionOptions {
    onResult?: (result: AIAnalysisResult, apply: ApplySelection) => void;
    onClose: () => void;
}

export function useAiConversion({ onResult, onClose }: UseAiConversionOptions) {
    const [text, setText] = useState('');
    const [phase, setPhase] = useState<Phase>('input');
    const [stepIndex, setStepIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AIAnalysisResult | null>(null);
    const [apply, setApply] = useState<ApplySelection>(DEFAULT_APPLY);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    function runSteps(idx: number) {
        // Inline import to avoid circular — PROCESSING_STEPS length is 5
        if (idx >= 5) {
            return;
        }
        setStepIndex(idx);
        timerRef.current = setTimeout(() => runSteps(idx + 1), 800);
    }

    async function startConversion() {
        if (!text.trim()) return;

        setPhase('processing');
        setStepIndex(0);
        setError(null);

        // Start animation
        runSteps(0);

        try {
            const analysisResult = await analyzeRecipeText(text.trim());

            if (analysisResult.success) {
                setResult(analysisResult.data);
                setApply(DEFAULT_APPLY);
                setPhase('review');
            } else {
                setError(analysisResult.error?.message || 'Analyse fehlgeschlagen');
                setPhase('error');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
            setPhase('error');
        }
    }

    function handleConfirmReview() {
        if (!result) return;
        onResult?.(result, apply);
        setPhase('done');
    }

    function handleClose() {
        if (timerRef.current) clearTimeout(timerRef.current);
        setPhase('input');
        setStepIndex(0);
        setText('');
        setError(null);
        setResult(null);
        setApply(DEFAULT_APPLY);
        onClose();
    }

    function handleFlowOnly() {
        if (!result) return;
        onResult?.(result, {
            title: false,
            description: false,
            category: false,
            tags: false,
            prepTime: false,
            cookTime: false,
            servings: false,
            difficulty: false,
            ingredients: false,
        });
        setPhase('done');
    }

    function toggleApply(field: keyof ApplySelection) {
        setApply((prev) => ({ ...prev, [field]: !prev[field] }));
    }

    return {
        text,
        setText,
        phase,
        setPhase,
        stepIndex,
        error,
        result,
        apply,
        startConversion,
        handleConfirmReview,
        handleClose,
        handleFlowOnly,
        toggleApply,
    };
}
