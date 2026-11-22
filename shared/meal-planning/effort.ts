import { clamp01 } from './scoring';

const DIFFICULTY_EFFORT = { EASY: 0, MEDIUM: 0.5, HARD: 1 } as const;

/**
 * Effort of a recipe, 0..1 (rounded to 2 decimals): mean of the number of steps, the total
 * time and the difficulty. `stepCount` is the number of flow nodes including the start node,
 * so the start is not counted as a step. Same formula as `effort` in the probe script.
 */
export function effortOf(r: {
    stepCount: number;
    totalTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}): number {
    const steps = clamp01(Math.max(0, r.stepCount - 1) / 15);
    const time = clamp01(r.totalTime / 120);
    const difficulty = DIFFICULTY_EFFORT[r.difficulty] ?? 0.5;
    return Math.round(((steps + time + difficulty) / 3) * 100) / 100;
}
