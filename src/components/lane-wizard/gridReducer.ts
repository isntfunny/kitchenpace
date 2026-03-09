import type { LaneAction, LaneGrid, LaneGridStored, LaneSegment, LaneStep } from './types';

let _idCounter = 100;
export function uid() {
    return `lw-${++_idCounter}-${Date.now().toString(36)}`;
}

/* ══════════════════════════════════════════════════════════════
   Column helpers
   ══════════════════════════════════════════════════════════════ */

/** Sum of a segment's columnSpans = its effective column count */
function colSum(seg: LaneSegment): number {
    return seg.columnSpans.reduce((a, b) => a + b, 0);
}

/** Effective column count inherited from the predecessor (or 1 if first) */
function inheritedCols(segments: LaneSegment[], idx: number): number {
    if (idx <= 0) return segments.length > 0 ? colSum(segments[0]) : 1;
    return colSum(segments[idx - 1]);
}

/**
 * Distribute N columns across M lanes as evenly as possible.
 * e.g. distribute(3, 2) → [2, 1]
 * e.g. distribute(3, 3) → [1, 1, 1]
 */
function distribute(totalCols: number, laneCount: number): number[] {
    const base = Math.floor(totalCols / laneCount);
    const remainder = totalCols % laneCount;
    return Array.from({ length: laneCount }, (_, i) =>
        base + (i < remainder ? 1 : 0),
    );
}

/**
 * Scale column spans so their sum reaches a new target.
 * Uses the largest remainder method for proportional integer distribution.
 * e.g. scaleSpans([1,1], 3) → [2,1]  (not [1,2])
 */
function scaleSpans(spans: number[], target: number): number[] {
    const sum = spans.reduce((a, b) => a + b, 0);
    if (sum === target) return spans;
    if (target % sum === 0) return spans.map((s) => s * (target / sum));

    const scaled = spans.map((s) => (s / sum) * target);
    const result = scaled.map((s) => Math.floor(s));
    let remaining = target - result.reduce((a, b) => a + b, 0);

    // Distribute remainder to lanes with the largest fractional parts
    spans
        .map((_, i) => ({ i, frac: scaled[i] - result[i] }))
        .sort((a, b) => b.frac - a.frac)
        .forEach(({ i }) => { if (remaining > 0) { result[i]++; remaining--; } });

    return result.map((v) => Math.max(1, v));
}

/**
 * After a segment changes its effective column count, propagate
 * to all neighbours so the grid stays consistent.
 */
function propagate(segments: LaneSegment[], changedIdx: number, newEffective: number): void {
    // Downward
    for (let i = changedIdx + 1; i < segments.length; i++) {
        const s = segments[i];
        const sum = colSum(s);
        if (sum >= newEffective) break;
        segments[i] = s.lanes.length === 1
            ? { ...s, columnSpans: [newEffective] }
            : { ...s, columnSpans: scaleSpans(s.columnSpans, newEffective) };
    }
    // Upward
    for (let i = changedIdx - 1; i >= 0; i--) {
        const s = segments[i];
        const sum = colSum(s);
        if (sum >= newEffective) break;
        segments[i] = s.lanes.length === 1
            ? { ...s, columnSpans: [newEffective] }
            : { ...s, columnSpans: scaleSpans(s.columnSpans, newEffective) };
    }
}

/**
 * Normalize a LaneGrid so every segment has explicit columnSpans.
 * Used on initial data that may not have columnSpans set (migration safety).
 */
export function normalizeLaneGrid(grid: LaneGrid): LaneGrid {
    let running = 0;
    const segments = grid.segments.map((seg) => {
        // Runtime guard: columnSpans is required in the type but may be absent in legacy data
        if ((seg as Partial<typeof seg>).columnSpans) {
            const sum = seg.columnSpans.reduce((a, b) => a + b, 0);
            running = Math.max(running, sum);
            return seg;
        }
        const laneCount = seg.lanes.length;
        if (laneCount === 1) {
            const cols = Math.max(running, 1);
            running = cols;
            return { ...seg, columnSpans: [cols] };
        }
        const effective = Math.max(running, laneCount);
        running = effective;
        return { ...seg, columnSpans: distribute(effective, laneCount) };
    });
    return { ...grid, segments };
}

/* ══════════════════════════════════════════════════════════════
   Serialization (DB ↔ runtime)
   ══════════════════════════════════════════════════════════════ */

/**
 * Strip continuation fillers before writing to the DB.
 * Continuations are visual-only in-session state — they are NOT reconstructed
 * on deserialization. Empty lanes (after stripping) show a StepTypePicker in
 * edit mode, which is the correct behaviour after reloading a partial merge.
 */
export function serializeLaneGrid(grid: LaneGrid): LaneGridStored {
    return {
        segments: grid.segments.map((seg) => ({
            ...seg,
            lanes: seg.lanes.map((lane) =>
                lane.filter((s) => !s.continuation).map(({ continuation: _, ...step }) => step),
            ),
        })),
    };
}

/**
 * Load a stored grid back into the runtime format.
 * Delegates to normalizeLaneGrid so legacy data without columnSpans is handled.
 */
export function deserializeLaneGrid(stored: LaneGridStored): LaneGrid {
    return normalizeLaneGrid(stored as LaneGrid);
}

/* ══════════════════════════════════════════════════════════════
   Reducer
   ══════════════════════════════════════════════════════════════ */

export function gridReducer(state: LaneGrid, action: LaneAction): LaneGrid {
    switch (action.type) {
        case 'ADD_STEP':
            return addStep(state, action.segmentId, action.laneIndex, action.step);
        case 'DELETE_STEP':
            return deleteStep(state, action.segmentId, action.laneIndex, action.stepId);
        case 'SPLIT':
            return split(state, action.afterSegmentId, action.laneCount, action.splitAtIndex);
        case 'MERGE':
            return merge(state, action.afterSegmentId, action.laneIndices, action.mergeStep);
        case 'ADD_LANE':
            return addLane(state, action.segmentId, action.atIndex);
        case 'UPDATE_STEP':
            return updateStep(state, action.stepId, action.updates);
        default:
            return state;
    }
}

/* ── Operations ── */

function addStep(state: LaneGrid, segmentId: string, laneIndex: number, step: LaneStep): LaneGrid {
    return {
        ...state,
        segments: state.segments.map((seg) => {
            if (seg.id !== segmentId) return seg;
            return {
                ...seg,
                lanes: seg.lanes.map((lane, i) =>
                    i === laneIndex ? [...lane, step] : lane,
                ),
            };
        }),
    };
}

function deleteStep(state: LaneGrid, segmentId: string, laneIndex: number, stepId: string): LaneGrid {
    const updated = {
        ...state,
        segments: state.segments.map((seg) => {
            if (seg.id !== segmentId) return seg;
            return {
                ...seg,
                lanes: seg.lanes.map((lane, i) =>
                    i === laneIndex ? lane.filter((s) => s.id !== stepId) : lane,
                ),
            };
        }),
    };
    return {
        ...updated,
        segments: updated.segments.filter((seg) => seg.lanes.some((lane) => lane.length > 0)),
    };
}

function split(
    state: LaneGrid,
    afterSegmentId: string,
    laneCount: number,
    splitAtIndex?: number,
): LaneGrid {
    const idx = state.segments.findIndex((s) => s.id === afterSegmentId);
    if (idx === -1) return state;

    const parentSeg = state.segments[idx];
    const parentEffective = colSum(parentSeg);

    // Splitting a single-lane segment always produces equal lanes (fresh start).
    // Only preserve the inherited column count when splitting an existing multi-lane segment.
    const effective = parentSeg.lanes.length === 1
        ? laneCount
        : Math.max(parentEffective, laneCount);
    const spans = distribute(effective, laneCount);

    // Generate lanes for the new segment.
    // When splitting a specific lane in a multi-lane segment, non-split lanes
    // get continuation fillers (same pattern as partial merge) so they don't
    // show an empty StepTypePicker. The two halves of the split lane are fresh.
    const lanes: LaneStep[][] = Array.from({ length: laneCount }, (_, newIdx) => {
        const isMultiLaneSplit = splitAtIndex !== undefined && parentSeg.lanes.length > 1;
        if (!isMultiLaneSplit || newIdx === splitAtIndex || newIdx === splitAtIndex + 1) {
            return [];
        }
        // Continuation of the corresponding unsplit parent lane
        const parentLaneIdx = newIdx < splitAtIndex ? newIdx : newIdx - 1;
        const sourceLane = parentSeg.lanes[parentLaneIdx];
        const lastStep = sourceLane[sourceLane.length - 1];
        return [{ id: uid(), type: lastStep?.type ?? 'warten', label: lastStep?.label ?? '', description: '', continuation: true }];
    });

    const newSeg: LaneSegment = {
        id: uid(),
        lanes,
        columnSpans: spans,
    };

    const segs = [...state.segments];
    segs.splice(idx + 1, 0, newSeg);

    if (effective > parentEffective) {
        // Propagate the new effective width to neighbours.
        // For the immediate parent (idx), if we know which lane was split,
        // inject the extra column at that exact position rather than using
        // scaleSpans (which can't know the split position when all spans are equal).
        if (splitAtIndex !== undefined && parentSeg.lanes.length > 1) {
            const delta = effective - parentEffective;
            const newParentSpans = [...parentSeg.columnSpans];
            newParentSpans[splitAtIndex] = (newParentSpans[splitAtIndex] ?? 1) + delta;
            segs[idx] = { ...parentSeg, columnSpans: newParentSpans };
            // Propagate from the updated parent so ancestors (idx-1, idx-2…) are
            // also widened. The downward walk hits the new seg (already correct) immediately.
            propagate(segs, idx, effective);
        } else {
            propagate(segs, idx + 1, effective);
        }
    }

    return { ...state, segments: segs };
}

function merge(
    state: LaneGrid,
    afterSegmentId: string,
    laneIndices: number[],
    mergeStep: LaneStep,
): LaneGrid {
    if (laneIndices.length === 0) return state;

    const idx = state.segments.findIndex((s) => s.id === afterSegmentId);
    if (idx === -1) return state;

    const currentSeg = state.segments[idx];
    const effective = colSum(currentSeg);

    if (laneIndices.length >= currentSeg.lanes.length) {
        /* Full merge → 1 lane spanning all columns */
        const newSeg: LaneSegment = {
            id: uid(),
            lanes: [[mergeStep]],
            columnSpans: [effective],
        };
        const segs = [...state.segments];
        segs.splice(idx + 1, 0, newSeg);
        return { ...state, segments: segs };
    }

    /* Partial merge — sum merged lanes' spans, continuation for the rest.
     * Assumes laneIndices are contiguous (the MergeOverlay should enforce this).
     * Non-contiguous selections produce correct column math but visually odd placement
     * (the continuation of a skipped lane shifts to the merged step's right edge). */
    const mergedSet = new Set(laneIndices);
    const firstMerged = Math.min(...laneIndices);
    let mergeSpanSum = 0;
    for (const i of laneIndices) mergeSpanSum += currentSeg.columnSpans[i];

    const newLanes: LaneStep[][] = [];
    const newSpans: number[] = [];

    for (let i = 0; i < currentSeg.lanes.length; i++) {
        if (i === firstMerged) {
            newLanes.push([mergeStep]);
            newSpans.push(mergeSpanSum);
        } else if (!mergedSet.has(i)) {
            const sourceLane = currentSeg.lanes[i];
            const lastStep = sourceLane[sourceLane.length - 1];
            newLanes.push([{
                id: uid(),
                type: lastStep?.type ?? 'warten',
                label: lastStep?.label ?? '',
                description: '',
                continuation: true,
            }]);
            newSpans.push(currentSeg.columnSpans[i]);
        }
    }

    const newSeg: LaneSegment = { id: uid(), lanes: newLanes, columnSpans: newSpans };
    const segs = [...state.segments];
    segs.splice(idx + 1, 0, newSeg);
    return { ...state, segments: segs };
}

function addLane(state: LaneGrid, segmentId: string, atIndex?: number): LaneGrid {
    const segIdx = state.segments.findIndex((s) => s.id === segmentId);
    if (segIdx === -1) return state;

    const seg = state.segments[segIdx];
    const currentEffective = colSum(seg);
    const inherited = inheritedCols(state.segments, segIdx);
    const effective = Math.max(currentEffective, inherited);
    const insertIdx = atIndex ?? seg.lanes.length;

    let newSpans: number[];

    if (seg.lanes.length === 1 && effective >= 2) {
        /* Splitting a full-width lane within inherited column context */
        newSpans = insertIdx === 0
            ? [1, effective - 1]
            : [effective - 1, 1];
    } else {
        /* Multi-lane: new lane takes 1 column from its neighbour */
        const old = [...seg.columnSpans];
        const donor = insertIdx === 0 ? 0 : insertIdx - 1;
        if (old[donor] > 1) {
            old[donor] -= 1;
            old.splice(insertIdx, 0, 1);
            newSpans = old;
        } else {
            /* No room — increase column count by 1 */
            old.splice(insertIdx, 0, 1);
            newSpans = old;
        }
    }

    const newLanes = [...seg.lanes];
    newLanes.splice(insertIdx, 0, []);

    const segs = [...state.segments];
    segs[segIdx] = { ...seg, lanes: newLanes, columnSpans: newSpans };

    const newEffective = newSpans.reduce((a, b) => a + b, 0);
    if (newEffective > effective) {
        propagate(segs, segIdx, newEffective);
    }

    return { ...state, segments: segs };
}

function updateStep(state: LaneGrid, stepId: string, updates: Partial<LaneStep>): LaneGrid {
    return {
        ...state,
        segments: state.segments.map((seg) => ({
            ...seg,
            lanes: seg.lanes.map((lane) =>
                lane.map((step) =>
                    step.id === stepId ? { ...step, ...updates } : step,
                ),
            ),
        })),
    };
}
