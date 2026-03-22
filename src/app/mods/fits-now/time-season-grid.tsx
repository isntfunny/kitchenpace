'use client';

import { Fragment, useState } from 'react';

import { css, cx } from 'styled-system/css';

import { TimeSeasonEditor } from './time-season-editor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSeasonFilterSet {
    id: string;
    timeSlot: string | null;
    season: string | null;
    displayLabel: string | null;
    maxTotalTime: number | null;
    tags: { tag: { id: string; name: string } }[];
    categories: { category: { id: string; name: string; slug: string } }[];
    ingredients: { ingredient: { id: string; name: string } }[];
}

interface TimeSeasonGridProps {
    filterSets: TimeSeasonFilterSet[];
    allCategories: { id: string; name: string; slug: string; color: string }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_SLOTS = ['fruehstueck', 'brunch', 'mittag', 'nachmittag', 'abend', 'spaet'];
const TIME_SLOT_LABELS: Record<string, string> = {
    fruehstueck: 'Fruehstueck',
    brunch: 'Brunch',
    mittag: 'Mittag',
    nachmittag: 'Nachm.',
    abend: 'Abend',
    spaet: 'Spaet',
};
const SEASONS = ['*', 'fruehling', 'sommer', 'herbst', 'winter'];
const SEASON_LABELS: Record<string, string> = {
    '*': 'Standard',
    fruehling: 'Fruehl.',
    sommer: 'Sommer',
    herbst: 'Herbst',
    winter: 'Winter',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeSeasonGrid({ filterSets, allCategories }: TimeSeasonGridProps) {
    const [selectedCell, setSelectedCell] = useState<{ timeSlot: string; season: string } | null>(
        null,
    );

    const findSet = (timeSlot: string, season: string) =>
        filterSets.find((fs) => fs.timeSlot === timeSlot && fs.season === season) ?? null;

    const selectedFilterSet = selectedCell
        ? findSet(selectedCell.timeSlot, selectedCell.season)
        : null;

    const criteriaCount = (fs: TimeSeasonFilterSet) =>
        fs.tags.length + fs.categories.length + fs.ingredients.length;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            {/* Grid */}
            <div className={gridStyle}>
                {/* Header row: empty corner + season labels */}
                <div />
                {SEASONS.map((s) => (
                    <div key={s} className={headerCellStyle}>
                        {SEASON_LABELS[s]}
                    </div>
                ))}

                {/* Data rows */}
                {TIME_SLOTS.map((ts) => (
                    <Fragment key={ts}>
                        {/* Row label */}
                        <div className={rowLabelStyle}>{TIME_SLOT_LABELS[ts]}</div>

                        {/* Season cells */}
                        {SEASONS.map((s) => {
                            const fs = findSet(ts, s);
                            const isActive =
                                selectedCell?.timeSlot === ts && selectedCell?.season === s;
                            const hasData = fs !== null;

                            return (
                                <button
                                    key={`${ts}-${s}`}
                                    type="button"
                                    onClick={() =>
                                        setSelectedCell(
                                            isActive ? null : { timeSlot: ts, season: s },
                                        )
                                    }
                                    className={cx(
                                        cellBaseStyle,
                                        isActive
                                            ? cellActiveStyle
                                            : hasData
                                              ? cellDataStyle
                                              : cellEmptyStyle,
                                    )}
                                >
                                    <span className={hasData ? dotActiveStyle : dotInactiveStyle} />
                                    <span className={cellCountStyle}>
                                        {hasData ? criteriaCount(fs) : '\u2014'}
                                    </span>
                                </button>
                            );
                        })}
                    </Fragment>
                ))}
            </div>

            {/* Editor panel */}
            {selectedCell && (
                <TimeSeasonEditor
                    key={`${selectedCell.timeSlot}-${selectedCell.season}`}
                    timeSlot={selectedCell.timeSlot}
                    season={selectedCell.season}
                    filterSet={selectedFilterSet}
                    allCategories={allCategories}
                    onClose={() => setSelectedCell(null)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const gridStyle = css({
    display: 'grid',
    gridTemplateColumns: 'auto repeat(5, 1fr)',
    gap: '1',
});

const headerCellStyle = css({
    textAlign: 'center',
    fontSize: 'xs',
    fontWeight: '600',
    color: 'foreground.muted',
    paddingY: '1.5',
    userSelect: 'none',
});

const rowLabelStyle = css({
    display: 'flex',
    alignItems: 'center',
    fontSize: 'xs',
    fontWeight: '600',
    color: 'foreground.muted',
    paddingRight: '3',
    userSelect: 'none',
    whiteSpace: 'nowrap',
});

const cellBaseStyle = css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5',
    paddingY: '2',
    paddingX: '1',
    borderRadius: 'lg',
    borderWidth: '1.5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

const cellActiveStyle = css({
    borderColor: 'accent',
    background: 'accent.soft',
    outline: '2px solid token(colors.accent)',
    outlineOffset: '1px',
    _hover: { borderColor: 'accent', background: 'accent.soft' },
});

const cellDataStyle = css({
    borderColor: 'border.muted',
    background: 'surface',
    _hover: { borderColor: 'border', background: 'surface.elevated' },
});

const cellEmptyStyle = css({
    borderColor: 'border.muted',
    background: 'transparent',
    _hover: { borderColor: 'border', background: 'surface.elevated' },
});

const dotActiveStyle = css({
    display: 'block',
    width: '8px',
    height: '8px',
    borderRadius: 'full',
    background: 'emerald.500',
});

const dotInactiveStyle = css({
    display: 'block',
    width: '8px',
    height: '8px',
    borderRadius: 'full',
    background: 'foreground.muted',
    opacity: '0.3',
});

const cellCountStyle = css({
    fontSize: '2xs',
    color: 'foreground.muted',
    lineHeight: '1',
});
