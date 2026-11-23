'use client';

import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import { SEASON_LABELS, TIME_SLOT_LABELS, type Season } from '@app/lib/fits-now/labels';
import { isSeasonalFilterSetHighlighted } from '@app/lib/fits-now/season';
import type { WeekPlanFilter } from '@shared/recipe-filters';
import { isThemeActive, type ThemeChip } from '@shared/theme-clusters/release';

import { css } from 'styled-system/css';

export function getFilterSetLabel(fs: FilterSetWithRelations): string {
    if (fs.displayLabel) return fs.displayLabel;
    if (fs.label) return fs.label;
    if (fs.timeSlot && fs.season) {
        const slot = (TIME_SLOT_LABELS as Record<string, string>)[fs.timeSlot] ?? fs.timeSlot;
        const season = (SEASON_LABELS as Record<string, string>)[fs.season] ?? fs.season;
        return `${slot} (${season})`;
    }
    if (fs.slug) return fs.slug;
    return 'Filter';
}

const rowClass = css({
    display: 'flex',
    gap: '2',
    overflowX: 'auto',
    pb: '1',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
});

const chipBaseClass = css({
    borderRadius: 'full',
    px: '3',
    py: '1.5',
    fontSize: 'xs',
    fontWeight: '600',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    _hover: { borderColor: 'accent' },
});

const chipActiveClass = css({
    borderColor: 'accent',
    background: 'accent',
    color: 'white',
});

const chipHighlightedClass = css({
    borderColor: 'accent',
    background: 'surface',
    color: 'accent',
});

const chipInactiveClass = css({
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
});

type FilterSetChipBarProps = {
    filterSets: FilterSetWithRelations[];
    activeFilterSetId?: string;
    /** Season of the current date; matching `TIME_SEASON` chips are highlighted. */
    currentSeason?: Season;
    onToggle: (filterSet: FilterSetWithRelations) => void;
    /** Released theme clusters (KUC-111), shown after the FilterSets */
    themes?: ThemeChip[];
    /** Current tag/category filters, to mark active themes */
    filters?: { tags?: string[]; categories?: string[] };
    onThemeToggle?: (theme: ThemeChip) => void;
    /** Week plan quick filters (KUC-131); only for logged-in users with a planned week */
    weekPlan?: {
        active?: WeekPlanFilter;
        onToggle: (mode: WeekPlanFilter) => void;
    };
};

const WEEK_PLAN_PILLS: { mode: WeekPlanFilter; label: string; title: string }[] = [
    {
        mode: 'with',
        label: 'Mit Zutaten aus meinem Wochenplan',
        title: 'Rezepte, die Hauptzutaten deiner geplanten Woche weiterverwenden',
    },
    {
        mode: 'without',
        label: 'Ohne Hauptzutaten aus meinem Wochenplan',
        title: 'Mehr Abwechslung: die Hauptzutat kommt in deiner Woche noch nicht vor',
    },
];

/** Horizontally scrollable FilterSet chips between the search header and the results. */
export function FilterSetChipBar({
    filterSets,
    activeFilterSetId,
    currentSeason,
    onToggle,
    themes = [],
    filters = {},
    onThemeToggle,
    weekPlan,
}: FilterSetChipBarProps) {
    if (filterSets.length === 0 && themes.length === 0 && !weekPlan) return null;

    return (
        <div role="group" aria-label="Schnell-Filter" className={rowClass}>
            {weekPlan &&
                WEEK_PLAN_PILLS.map((pill) => {
                    const isActive = weekPlan.active === pill.mode;
                    return (
                        <button
                            key={pill.mode}
                            type="button"
                            aria-pressed={isActive}
                            title={pill.title}
                            onClick={() => weekPlan.onToggle(pill.mode)}
                            className={`${chipBaseClass} ${isActive ? chipActiveClass : chipInactiveClass}`}
                        >
                            {pill.label}
                        </button>
                    );
                })}
            {filterSets.map((fs) => {
                const isActive = activeFilterSetId === fs.id;
                const isHighlighted =
                    !isActive &&
                    !!currentSeason &&
                    isSeasonalFilterSetHighlighted(fs, currentSeason);
                return (
                    <button
                        key={fs.id}
                        type="button"
                        aria-pressed={isActive}
                        title={isHighlighted ? 'Passt zur aktuellen Jahreszeit' : undefined}
                        onClick={() => onToggle(fs)}
                        className={`${chipBaseClass} ${
                            isActive
                                ? chipActiveClass
                                : isHighlighted
                                  ? chipHighlightedClass
                                  : chipInactiveClass
                        }`}
                    >
                        {getFilterSetLabel(fs)}
                    </button>
                );
            })}
            {onThemeToggle &&
                themes.map((theme) => {
                    const isActive = isThemeActive(filters, theme);
                    return (
                        <button
                            key={theme.key}
                            type="button"
                            aria-pressed={isActive}
                            title="Thema"
                            onClick={() => onThemeToggle(theme)}
                            className={`${chipBaseClass} ${isActive ? chipActiveClass : chipInactiveClass}`}
                        >
                            {theme.label}
                        </button>
                    );
                })}
        </div>
    );
}
