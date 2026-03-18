import type { StepType } from '@app/components/flow/editor/editorTypes';

/** A single step inside a lane cell */
export interface LaneStep {
    id: string;
    type: StepType;
    label: string;
    description: string;
    duration?: number;
    ingredientIds?: string[];
    /** Visual filler — inherits colour from source step above. Not interactive. */
    continuation?: boolean;
}

/**
 * A segment = a contiguous section of the grid with a fixed number of lanes.
 * Each split/merge creates a new segment.
 * lanes[laneIndex][stepIndex] = step
 */
export interface LaneSegment {
    id: string;
    lanes: LaneStep[][];
    /**
     * Width of each lane in fractional column units.
     * Always present. Sum = effective column count at this segment.
     * e.g. [3] = full-width lane in 3-column context
     * e.g. [1,1,1] = 3 equal lanes
     * e.g. [2,1] = merge of 2 columns + 1 continuation
     */
    columnSpans: number[];
}

/** The entire grid — a sequence of segments */
export interface LaneGrid {
    segments: LaneSegment[];
}

/* ── Stored (DB) shapes — mirrors runtime types exactly,
      except `continuation` is never persisted               ── */

/** What gets written to the DB — `continuation` stripped */
export type LaneStepStored = Omit<LaneStep, 'continuation'>;

export interface LaneSegmentStored {
    id: string;
    lanes: LaneStepStored[][];
    columnSpans: number[];
}

export interface LaneGridStored {
    segments: LaneSegmentStored[];
}

/* ── Reducer actions ─────────────────────────────────────── */

export type LaneAction =
    | { type: 'ADD_STEP'; segmentId: string; laneIndex: number; step: LaneStep }
    | { type: 'DELETE_STEP'; segmentId: string; laneIndex: number; stepId: string }
    | { type: 'SPLIT'; afterSegmentId: string; laneCount: number; splitAtIndex?: number }
    | { type: 'MERGE'; afterSegmentId: string; laneIndices: number[]; mergeStep: LaneStep }
    | { type: 'ADD_LANE'; segmentId: string; atIndex?: number }
    | { type: 'UPDATE_STEP'; stepId: string; updates: Partial<LaneStep> }
    | { type: 'SET_GRID'; grid: LaneGrid };

/* ── Timer state ─────────────────────────────────────────── */

export type { TimerState } from '../../viewer/viewerTypes';

/* ── Component mode ──────────────────────────────────────── */

export type LaneMode = 'edit' | 'view';
