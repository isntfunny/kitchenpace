'use client';

import { css } from 'styled-system/css';

import { SegmentedBar } from './SegmentedBar';

interface TimeAndDifficultySectionProps {
    prepTime: number;
    onPrepTimeChange: (value: number) => void;
    cookTime: number;
    onCookTimeChange: (value: number) => void;
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
        </div>
    );
}

const labelClass = css({
    fontWeight: '600',
    display: 'block',
    mb: '2',
    fontSize: 'sm',
});
