'use client';

import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';

import {
    rulerBlockClass,
    rulerBlockDurClass,
    rulerBlockFootClass,
    rulerBlockNameClass,
    rulerBlockNameUntimedClass,
    rulerBlockUntimedClass,
    rulerHeaderClass,
    rulerParallelClass,
    rulerRowClass,
    rulerUnknownDurClass,
    rulerWrapClass,
} from './lane-wizard-styles';
import type { LaneGrid } from './types';

/* ══════════════════════════════════════════════════════════════
   TimeRuler — Gantt-style time overview bar
   ══════════════════════════════════════════════════════════════ */

type SegEntry = {
    id: string;
    dur: number;
    label: string;
    color: string;
    parallelCount: number;
};

export function TimeRuler({ grid }: { grid: LaneGrid }) {
    const segData: SegEntry[] = [];

    for (const seg of grid.segments) {
        // Skip structural start/servieren-only segments — they're milestones, not steps
        const realSteps = seg.lanes.flat().filter((s) => !s.continuation);
        if (realSteps.every((s) => s.type === 'start' || s.type === 'servieren')) continue;

        const laneDurs = seg.lanes.map((lane) =>
            lane.filter((s) => !s.continuation).reduce((acc, s) => acc + (s.duration ?? 0), 0),
        );
        const maxDur = Math.max(0, ...laneDurs);

        if (maxDur > 0) {
            const critIdx = laneDurs.indexOf(maxDur);
            const critStep = seg.lanes[critIdx]?.find((s) => !s.continuation && s.duration);
            const parallelCount = seg.lanes.filter(
                (_, i) => i !== critIdx && laneDurs[i] > 0,
            ).length;
            segData.push({
                id: seg.id,
                dur: maxDur,
                label: critStep?.label ?? '',
                color: critStep ? STEP_CONFIGS[critStep.type].accent : '#e07b53',
                parallelCount,
            });
        } else {
            const first = realSteps[0];
            const parallelCount =
                seg.lanes.filter((lane) => lane.filter((s) => !s.continuation).length > 0).length -
                1;
            segData.push({
                id: seg.id,
                dur: 0,
                label: first?.label ?? '',
                color: first ? STEP_CONFIGS[first.type].accent : '#aaa',
                parallelCount: Math.max(0, parallelCount),
            });
        }
    }

    const timedTotal = segData.reduce((a, d) => a + d.dur, 0);
    if (timedTotal === 0) return null;

    return (
        <div className={rulerWrapClass}>
            {/* Header */}
            <div className={rulerHeaderClass}>
                <span>Zeitplan</span>
                <span>
                    {timedTotal} Min.{' '}
                    {segData.some((d) => d.dur === 0) && (
                        <span style={{ opacity: 0.55 }}>+ unbekannte Schritte</span>
                    )}
                </span>
            </div>

            {/* Gantt-style blocks */}
            <div className={rulerRowClass}>
                {segData.map((d) => {
                    const isTimed = d.dur > 0;
                    const narrow = isTimed && (d.dur / timedTotal) * 100 < 14;
                    return (
                        <div
                            key={d.id}
                            className={isTimed ? rulerBlockClass : rulerBlockUntimedClass}
                            style={
                                isTimed
                                    ? { flex: d.dur, background: d.color }
                                    : { borderColor: `${d.color}60` }
                            }
                            title={
                                isTimed
                                    ? `${d.label} · ${d.dur} Min.`
                                    : `${d.label} · Keine Zeit eingetragen`
                            }
                        >
                            {!narrow && (
                                <span
                                    className={
                                        isTimed ? rulerBlockNameClass : rulerBlockNameUntimedClass
                                    }
                                >
                                    {d.label}
                                </span>
                            )}
                            <div className={rulerBlockFootClass}>
                                {isTimed ? (
                                    <>
                                        <span className={rulerBlockDurClass}>{d.dur}m</span>
                                        {d.parallelCount > 0 && (
                                            <span className={rulerParallelClass}>
                                                +{d.parallelCount}∥
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className={rulerUnknownDurClass}>?</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
