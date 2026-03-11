'use client';

import { css } from 'styled-system/css';

import { SegmentedBar } from './SegmentedBar';

interface TimeAndDifficultySectionProps {
    prepTime: number;
    onPrepTimeChange: (value: number) => void;
    cookTime: number;
    onCookTimeChange: (value: number) => void;
    calories?: number;
    onCaloriesChange?: (value: number | undefined) => void;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    onDifficultyChange: (value: 'EASY' | 'MEDIUM' | 'HARD') => void;
}

const TIME_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90] as const;
const TIME_LABELS = TIME_PRESETS.map(String);

const DIFFICULTY_OPTIONS = [
    { value: 'EASY' as const, label: 'Einfach' },
    { value: 'MEDIUM' as const, label: 'Mittel' },
    { value: 'HARD' as const, label: 'Schwer' },
];
const DIFFICULTY_LABELS = DIFFICULTY_OPTIONS.map((o) => o.label);

export function TimeAndDifficultySection({
    prepTime,
    onPrepTimeChange,
    cookTime,
    onCookTimeChange,
    calories,
    onCaloriesChange,
    difficulty,
    onDifficultyChange,
}: TimeAndDifficultySectionProps) {
    const prepIdx = TIME_PRESETS.indexOf(prepTime as (typeof TIME_PRESETS)[number]);
    const cookIdx = TIME_PRESETS.indexOf(cookTime as (typeof TIME_PRESETS)[number]);
    const diffIdx = DIFFICULTY_OPTIONS.findIndex((o) => o.value === difficulty);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}>
            <div>
                <span className={labelClass}>Vorbereitung (Min)</span>
                <SegmentedBar
                    items={TIME_LABELS}
                    activeIndex={prepIdx}
                    onSelect={(i) => onPrepTimeChange(prepIdx === i ? 0 : TIME_PRESETS[i])}
                    trackingName="prep_time"
                    customInput={{
                        value: prepTime,
                        onChange: onPrepTimeChange,
                        placeholder: 'z.B. 120',
                        suffix: 'Min',
                    }}
                />
            </div>
            <div>
                <span className={labelClass}>Kochen (Min)</span>
                <SegmentedBar
                    items={TIME_LABELS}
                    activeIndex={cookIdx}
                    onSelect={(i) => onCookTimeChange(cookIdx === i ? 0 : TIME_PRESETS[i])}
                    trackingName="cook_time"
                    customInput={{
                        value: cookTime,
                        onChange: onCookTimeChange,
                        placeholder: 'z.B. 120',
                        suffix: 'Min',
                    }}
                />
            </div>
            <div>
                <span className={labelClass}>Schwierigkeit</span>
                <SegmentedBar
                    items={DIFFICULTY_LABELS}
                    activeIndex={diffIdx}
                    onSelect={(i) => onDifficultyChange(DIFFICULTY_OPTIONS[i].value)}
                    trackingName="difficulty"
                />
            </div>
            {onCaloriesChange && (
                <div>
                    <span className={labelClass}>Kalorien (kcal, optional)</span>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                        <input
                            type="number"
                            min={0}
                            value={calories ?? ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                onCaloriesChange(v === '' ? undefined : Number(v));
                            }}
                            placeholder="z.B. 450"
                            className={caloriesInputClass}
                        />
                        <span
                            className={css({
                                fontSize: 'sm',
                                color: 'text.muted',
                                flexShrink: '0',
                            })}
                        >
                            kcal / Portion
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelClass = css({
    fontWeight: '600',
    display: 'block',
    mb: '2',
    fontSize: 'sm',
});

const caloriesInputClass = css({
    w: '100px',
    px: '3',
    py: '2',
    fontSize: 'sm',
    borderRadius: 'md',
    border: '1.5px solid',
    borderColor: 'rgba(0,0,0,0.12)',
    outline: 'none',
    fontFamily: 'body',
    _focus: { borderColor: 'brand.primary' },
    _dark: { borderColor: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.05)', color: 'white' },
});
