'use client';

import type { DateResolveType } from '@prisma/client';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { resolvePeriodDates } from '@app/lib/fits-now/date-resolver';

import { css } from 'styled-system/css';

import { PeriodEditor } from './period-editor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FoodPeriodRow {
    id: string;
    slug: string | null;
    label: string | null;
    description: string | null;
    override: boolean;
    resolveType: DateResolveType | null;
    startMonth: number | null;
    startDay: number | null;
    endMonth: number | null;
    endDay: number | null;
    startOffsetDays: number | null;
    endOffsetDays: number | null;
    leadDays: number;
    trailDays: number;
    maxTotalTime: number | null;
    sortOrder: number;
    tags: { tag: { id: string; name: string } }[];
    categories: { category: { id: string; name: string; slug: string; color: string } }[];
    ingredients: { ingredient: { id: string; name: string } }[];
}

interface PeriodsListProps {
    filterSets: FoodPeriodRow[];
    allCategories: { id: string; name: string; slug: string; color: string }[];
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const PREVIEW_YEAR = 2026;

const MONTH_ABBR = [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez',
];

function formatShortDate(date: Date): string {
    return `${date.getDate()}. ${MONTH_ABBR[date.getMonth()]}`;
}

function computeDatePreview(period: FoodPeriodRow): string | null {
    if (!period.resolveType) return null;
    try {
        const core = resolvePeriodDates(
            {
                resolveType: period.resolveType,
                startMonth: period.startMonth,
                startDay: period.startDay,
                endMonth: period.endMonth,
                endDay: period.endDay,
                startOffsetDays: period.startOffsetDays,
                endOffsetDays: period.endOffsetDays,
            },
            PREVIEW_YEAR,
        );
        return `${formatShortDate(core.start)} – ${formatShortDate(core.end)}`;
    } catch {
        return null;
    }
}

function anchorLabel(resolveType: DateResolveType | null): string | null {
    if (resolveType === 'RELATIVE_EASTER') return 'Ostern';
    if (resolveType === 'RELATIVE_ADVENT') return '1. Advent';
    return null;
}

function filterCountLabel(period: FoodPeriodRow): string {
    const parts: string[] = [];
    const tagCount = period.tags.length;
    const catCount = period.categories.length;
    const ingCount = period.ingredients.length;
    if (tagCount > 0) parts.push(`${tagCount} Tag${tagCount !== 1 ? 's' : ''}`);
    if (catCount > 0) parts.push(`${catCount} Kat.`);
    if (ingCount > 0) parts.push(`${ingCount} Zut.`);
    return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeriodsList({ filterSets, allCategories }: PeriodsListProps) {
    const [showEditor, setShowEditor] = useState(false);
    const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

    const editingPeriod =
        editingPeriodId !== null
            ? (filterSets.find((p) => p.id === editingPeriodId) ?? null)
            : null;

    const openNew = () => {
        setEditingPeriodId(null);
        setShowEditor(true);
    };

    const openEdit = (id: string) => {
        setEditingPeriodId(id);
        setShowEditor(true);
    };

    const closeEditor = useCallback(() => {
        setShowEditor(false);
        setEditingPeriodId(null);
    }, []);

    return (
        <>
            {/* Header row with add button */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginBottom: '3',
                })}
            >
                <button type="button" onClick={openNew} className={addButtonStyle}>
                    <Plus size={16} />
                    Neue Periode
                </button>
            </div>

            {/* Period cards */}
            {filterSets.length === 0 ? (
                <p
                    className={css({
                        color: 'foreground.muted',
                        fontSize: 'sm',
                        textAlign: 'center',
                        paddingY: '8',
                    })}
                >
                    Keine kulinarischen Perioden konfiguriert.
                </p>
            ) : (
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                    {filterSets.map((period) => {
                        const datePreview = computeDatePreview(period);
                        const anchor = anchorLabel(period.resolveType);
                        const counts = filterCountLabel(period);
                        const hasLeadTrail = period.leadDays > 0 || period.trailDays > 0;

                        return (
                            <div key={period.id} className={cardStyle}>
                                {/* Left: info */}
                                <div className={css({ flex: '1', minWidth: '0' })}>
                                    {/* Label + slug row */}
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: '2',
                                            flexWrap: 'wrap',
                                        })}
                                    >
                                        <span
                                            className={css({
                                                fontWeight: '600',
                                                fontSize: 'sm',
                                                color: 'foreground',
                                            })}
                                        >
                                            {period.label || '(ohne Label)'}
                                        </span>
                                        {period.slug && (
                                            <span
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'foreground.muted',
                                                    fontFamily: 'mono',
                                                })}
                                            >
                                                {period.slug}
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta row */}
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            marginTop: '1.5',
                                            flexWrap: 'wrap',
                                        })}
                                    >
                                        {/* Override/Boost badge */}
                                        <span
                                            className={period.override ? overrideBadge : boostBadge}
                                        >
                                            {period.override ? 'Override' : 'Boost'}
                                        </span>

                                        {/* Date preview */}
                                        {datePreview && (
                                            <span
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'foreground.muted',
                                                })}
                                            >
                                                {datePreview}
                                                {anchor && (
                                                    <span
                                                        className={css({
                                                            marginLeft: '1',
                                                            opacity: '0.7',
                                                        })}
                                                    >
                                                        ({anchor}{' '}
                                                        {period.startOffsetDays != null
                                                            ? `${period.startOffsetDays >= 0 ? '+' : ''}${period.startOffsetDays}`
                                                            : ''}
                                                        /
                                                        {period.endOffsetDays != null
                                                            ? `${period.endOffsetDays >= 0 ? '+' : ''}${period.endOffsetDays}`
                                                            : ''}
                                                        )
                                                    </span>
                                                )}
                                            </span>
                                        )}

                                        {/* Filter counts */}
                                        {counts && (
                                            <span
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'foreground.muted',
                                                })}
                                            >
                                                {counts}
                                            </span>
                                        )}

                                        {/* Lead/trail info */}
                                        {hasLeadTrail && (
                                            <span
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'foreground.muted',
                                                    opacity: '0.7',
                                                })}
                                            >
                                                +{period.leadDays} / +{period.trailDays} Tage
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: edit button */}
                                <button
                                    type="button"
                                    onClick={() => openEdit(period.id)}
                                    className={editButtonStyle}
                                >
                                    Bearbeiten
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Editor modal */}
            {showEditor && (
                <PeriodEditor
                    period={editingPeriod}
                    allCategories={allCategories}
                    onClose={closeEditor}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const addButtonStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    background: 'accent',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        opacity: '0.9',
    },
});

const cardStyle = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    paddingX: '4',
    paddingY: '3',
    borderRadius: 'xl',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'border',
        background: 'surface.elevated',
    },
});

const overrideBadge = css({
    display: 'inline-flex',
    alignItems: 'center',
    paddingX: '2',
    paddingY: '0.5',
    borderRadius: 'full',
    background: 'accent.soft',
    color: 'accent',
    fontSize: 'xs',
    fontWeight: '600',
});

const boostBadge = css({
    display: 'inline-flex',
    alignItems: 'center',
    paddingX: '2',
    paddingY: '0.5',
    borderRadius: 'full',
    background: 'surface.elevated',
    color: 'foreground.muted',
    fontSize: 'xs',
    fontWeight: '600',
    borderWidth: '1px',
    borderColor: 'border.muted',
});

const editButtonStyle = css({
    flexShrink: 0,
    paddingX: '3',
    paddingY: '1.5',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'transparent',
    color: 'foreground.muted',
    fontSize: 'xs',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: {
        borderColor: 'accent',
        color: 'accent',
        background: 'accent.soft',
    },
});
