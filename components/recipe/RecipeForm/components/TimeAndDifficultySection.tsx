'use client';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

interface TimeAndDifficultySectionProps {
    prepTime: number;
    onPrepTimeChange: (value: number) => void;
    cookTime: number;
    onCookTimeChange: (value: number) => void;
    servings: number;
    onServingsChange: (value: number) => void;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    onDifficultyChange: (value: 'EASY' | 'MEDIUM' | 'HARD') => void;
}

export function TimeAndDifficultySection({
    prepTime,
    onPrepTimeChange,
    cookTime,
    onCookTimeChange,
    servings,
    onServingsChange,
    difficulty,
    onDifficultyChange,
}: TimeAndDifficultySectionProps) {
    const inputClass = css({
        width: '100%',
        padding: '3',
        borderRadius: 'xl',
        border: '1px solid rgba(224,123,83,0.4)',
        fontSize: 'md',
        outline: 'none',
        _focus: {
            borderColor: '#e07b53',
        },
    });

    const labelClass = css({
        fontWeight: '600',
        display: 'block',
        mb: '2',
        fontSize: 'sm',
    });

    return (
        <div
            className={grid({
                columns: { base: 2, md: 4 },
                gap: '4',
            })}
        >
            <div>
                <label className={labelClass}>Vorbereitung (Min)</label>
                <input
                    type="number"
                    min={0}
                    value={prepTime}
                    onChange={(e) => onPrepTimeChange(Number(e.target.value))}
                    className={inputClass}
                />
            </div>
            <div>
                <label className={labelClass}>Kochen (Min)</label>
                <input
                    type="number"
                    min={0}
                    value={cookTime}
                    onChange={(e) => onCookTimeChange(Number(e.target.value))}
                    className={inputClass}
                />
            </div>
            <div>
                <label className={labelClass}>Portionen</label>
                <input
                    type="number"
                    min={1}
                    value={servings}
                    onChange={(e) => onServingsChange(Number(e.target.value))}
                    className={inputClass}
                />
            </div>
            <div>
                <label className={labelClass}>Schwierigkeit</label>
                <select
                    value={difficulty}
                    onChange={(e) => onDifficultyChange(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                    className={css({
                        width: '100%',
                        padding: '3',
                        borderRadius: 'xl',
                        border: '1px solid rgba(224,123,83,0.4)',
                        fontSize: 'md',
                        outline: 'none',
                        bg: 'white',
                        _focus: {
                            borderColor: '#e07b53',
                        },
                    })}
                >
                    <option value="EASY">Einfach</option>
                    <option value="MEDIUM">Mittel</option>
                    <option value="HARD">Schwer</option>
                </select>
            </div>
        </div>
    );
}
