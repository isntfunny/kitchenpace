'use client';

import { useMemo } from 'react';

import {
    addDays,
    firstAdvent,
    easterSunday,
    resolvePeriodDates,
} from '@app/lib/fits-now/date-resolver';

import { css } from 'styled-system/css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateConfigState {
    resolveType: 'FIXED' | 'RELATIVE_EASTER' | 'RELATIVE_ADVENT';
    startMonth: number | null;
    startDay: number | null;
    endMonth: number | null;
    endDay: number | null;
    startOffsetDays: number | null;
    endOffsetDays: number | null;
    leadDays: number;
    trailDays: number;
}

interface DateConfigFormProps extends DateConfigState {
    onChange: (config: DateConfigState) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESOLVE_TYPE_OPTIONS: { value: DateConfigState['resolveType']; label: string }[] = [
    { value: 'FIXED', label: 'Festes Datum' },
    { value: 'RELATIVE_EASTER', label: 'Relativ zu Ostern' },
    { value: 'RELATIVE_ADVENT', label: 'Relativ zum 1. Advent' },
];

const MONTH_NAMES = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
];

const PREVIEW_YEAR = 2026;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGermanDate(date: Date): string {
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    return `${day}. ${month}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateConfigForm({
    resolveType,
    startMonth,
    startDay,
    endMonth,
    endDay,
    startOffsetDays,
    endOffsetDays,
    leadDays,
    trailDays,
    onChange,
}: DateConfigFormProps) {
    const update = (partial: Partial<DateConfigState>) => {
        onChange({
            resolveType,
            startMonth,
            startDay,
            endMonth,
            endDay,
            startOffsetDays,
            endOffsetDays,
            leadDays,
            trailDays,
            ...partial,
        });
    };

    // Live preview computation
    const preview = useMemo(() => {
        try {
            const canResolve =
                resolveType === 'FIXED'
                    ? startMonth !== null &&
                      startDay !== null &&
                      endMonth !== null &&
                      endDay !== null
                    : startOffsetDays !== null && endOffsetDays !== null;

            if (!canResolve) return null;

            const core = resolvePeriodDates(
                {
                    resolveType,
                    startMonth,
                    startDay,
                    endMonth,
                    endDay,
                    startOffsetDays,
                    endOffsetDays,
                },
                PREVIEW_YEAR,
            );

            const displayStart = leadDays > 0 ? addDays(core.start, -leadDays) : core.start;
            const displayEnd = trailDays > 0 ? addDays(core.end, trailDays) : core.end;

            return {
                coreStart: formatGermanDate(core.start),
                coreEnd: formatGermanDate(core.end),
                displayStart: formatGermanDate(displayStart),
                displayEnd: formatGermanDate(displayEnd),
                hasLead: leadDays > 0,
                hasTrail: trailDays > 0,
            };
        } catch {
            return null;
        }
    }, [
        resolveType,
        startMonth,
        startDay,
        endMonth,
        endDay,
        startOffsetDays,
        endOffsetDays,
        leadDays,
        trailDays,
    ]);

    // Anchor preview
    const anchorPreview = useMemo(() => {
        if (resolveType === 'FIXED') return null;
        const anchor =
            resolveType === 'RELATIVE_EASTER'
                ? easterSunday(PREVIEW_YEAR)
                : firstAdvent(PREVIEW_YEAR);
        return `${formatGermanDate(anchor)} ${PREVIEW_YEAR}`;
    }, [resolveType]);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}>
            {/* 1. Resolve type radio group */}
            <div>
                <label className={labelStyle}>Datumstyp</label>
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: { base: 'column', sm: 'row' },
                        gap: '2',
                    })}
                >
                    {RESOLVE_TYPE_OPTIONS.map((opt) => (
                        <label
                            key={opt.value}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                paddingX: '3',
                                paddingY: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: resolveType === opt.value ? 'accent' : 'border.muted',
                                background:
                                    resolveType === opt.value ? 'accent.soft' : 'transparent',
                                cursor: 'pointer',
                                fontSize: 'sm',
                                fontWeight: '500',
                                color: resolveType === opt.value ? 'accent' : 'foreground.muted',
                                transition: 'all 0.15s ease',
                                _hover: {
                                    borderColor: resolveType === opt.value ? 'accent' : 'border',
                                },
                            })}
                        >
                            <input
                                type="radio"
                                name="resolveType"
                                value={opt.value}
                                checked={resolveType === opt.value}
                                onChange={() =>
                                    update({
                                        resolveType: opt.value,
                                        // Reset irrelevant fields
                                        ...(opt.value === 'FIXED'
                                            ? { startOffsetDays: null, endOffsetDays: null }
                                            : {
                                                  startMonth: null,
                                                  startDay: null,
                                                  endMonth: null,
                                                  endDay: null,
                                              }),
                                    })
                                }
                                className={css({ accentColor: 'accent' })}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
                {anchorPreview && (
                    <p className={hintStyle}>
                        Anker {PREVIEW_YEAR}: {anchorPreview}
                    </p>
                )}
            </div>

            {/* 2. Conditional fields */}
            {resolveType === 'FIXED' ? (
                <div>
                    <label className={labelStyle}>Zeitraum (festes Datum)</label>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                            gap: '3',
                        })}
                    >
                        <div>
                            <span className={fieldLabelStyle}>Start Monat</span>
                            <select
                                value={startMonth ?? ''}
                                onChange={(e) =>
                                    update({
                                        startMonth:
                                            e.target.value === ''
                                                ? null
                                                : parseInt(e.target.value, 10),
                                    })
                                }
                                className={selectStyle}
                            >
                                <option value="">--</option>
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={i} value={i}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className={fieldLabelStyle}>Start Tag</span>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                value={startDay ?? ''}
                                onChange={(e) =>
                                    update({
                                        startDay:
                                            e.target.value === ''
                                                ? null
                                                : parseInt(e.target.value, 10),
                                    })
                                }
                                className={numberInputStyle}
                            />
                        </div>
                        <div>
                            <span className={fieldLabelStyle}>Ende Monat</span>
                            <select
                                value={endMonth ?? ''}
                                onChange={(e) =>
                                    update({
                                        endMonth:
                                            e.target.value === ''
                                                ? null
                                                : parseInt(e.target.value, 10),
                                    })
                                }
                                className={selectStyle}
                            >
                                <option value="">--</option>
                                {MONTH_NAMES.map((name, i) => (
                                    <option key={i} value={i}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className={fieldLabelStyle}>Ende Tag</span>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                value={endDay ?? ''}
                                onChange={(e) =>
                                    update({
                                        endDay:
                                            e.target.value === ''
                                                ? null
                                                : parseInt(e.target.value, 10),
                                    })
                                }
                                className={numberInputStyle}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <label className={labelStyle}>Offset (Tage relativ zum Anker)</label>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '3',
                            maxWidth: '320px',
                        })}
                    >
                        <div>
                            <span className={fieldLabelStyle}>Start-Offset</span>
                            <input
                                type="number"
                                value={startOffsetDays ?? ''}
                                onChange={(e) =>
                                    update({
                                        startOffsetDays:
                                            e.target.value === ''
                                                ? null
                                                : parseInt(e.target.value, 10),
                                    })
                                }
                                placeholder="z.B. -7"
                                className={numberInputStyle}
                            />
                        </div>
                        <div>
                            <span className={fieldLabelStyle}>End-Offset</span>
                            <input
                                type="number"
                                value={endOffsetDays ?? ''}
                                onChange={(e) =>
                                    update({
                                        endOffsetDays:
                                            e.target.value === ''
                                                ? null
                                                : parseInt(e.target.value, 10),
                                    })
                                }
                                placeholder="z.B. 1"
                                className={numberInputStyle}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Lead / Trail days */}
            <div>
                <label className={labelStyle}>Vorlauf / Nachlauf</label>
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '3',
                        maxWidth: '320px',
                    })}
                >
                    <div>
                        <span className={fieldLabelStyle}>Tage vorher anzeigen</span>
                        <input
                            type="number"
                            min={0}
                            value={leadDays}
                            onChange={(e) =>
                                update({ leadDays: Math.max(0, parseInt(e.target.value, 10) || 0) })
                            }
                            className={numberInputStyle}
                        />
                    </div>
                    <div>
                        <span className={fieldLabelStyle}>Tage nachher anzeigen</span>
                        <input
                            type="number"
                            min={0}
                            value={trailDays}
                            onChange={(e) =>
                                update({
                                    trailDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                            }
                            className={numberInputStyle}
                        />
                    </div>
                </div>
            </div>

            {/* 4. Live preview */}
            {preview && (
                <div
                    className={css({
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface.elevated',
                        padding: '3',
                    })}
                >
                    <p
                        className={css({
                            fontSize: 'xs',
                            fontWeight: '600',
                            color: 'foreground.muted',
                            marginBottom: '1',
                        })}
                    >
                        Vorschau {PREVIEW_YEAR}
                    </p>
                    <p className={css({ fontSize: 'sm', color: 'foreground', fontWeight: '500' })}>
                        {preview.coreStart} bis {preview.coreEnd} {PREVIEW_YEAR}
                    </p>
                    {(preview.hasLead || preview.hasTrail) && (
                        <p
                            className={css({
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                marginTop: '1',
                            })}
                        >
                            Anzeigezeitraum: {preview.displayStart} bis {preview.displayEnd}{' '}
                            {PREVIEW_YEAR}
                            {preview.hasLead && ` (${leadDays} Tage Vorlauf)`}
                            {preview.hasTrail && ` (${trailDays} Tage Nachlauf)`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const labelStyle = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: '600',
    color: 'foreground.muted',
    marginBottom: '2',
});

const fieldLabelStyle = css({
    display: 'block',
    fontSize: 'xs',
    color: 'foreground.muted',
    marginBottom: '1',
});

const hintStyle = css({
    fontSize: 'xs',
    color: 'foreground.muted',
    marginTop: '2',
    fontStyle: 'italic',
});

const selectStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    fontSize: 'sm',
    _focus: {
        outline: 'none',
        borderColor: 'accent',
    },
});

const numberInputStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    fontSize: 'sm',
    _focus: {
        outline: 'none',
        borderColor: 'accent',
    },
    _placeholder: {
        color: 'foreground.muted',
        opacity: '0.6',
    },
});
