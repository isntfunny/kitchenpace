'use client';

import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import { SEASON_LABELS, TIME_SLOT_LABELS, type Season } from '@app/lib/fits-now/labels';
import { isSeasonalFilterSetHighlighted } from '@app/lib/fits-now/season';

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
};

/** Horizontally scrollable FilterSet chips between the search header and the results. */
export function FilterSetChipBar({
    filterSets,
    activeFilterSetId,
    currentSeason,
    onToggle,
}: FilterSetChipBarProps) {
    if (filterSets.length === 0) return null;

    return (
        <div role="group" aria-label="Schnell-Filter" className={rowClass}>
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
        </div>
    );
}
