'use client';

import {
    FlowEditorContext,
    type FlowEditorContextValue,
} from '@app/components/flow/editor/FlowEditorContext';
import { NodeEditPanel } from '@app/components/flow/editor/NodeEditPanel';

import type { EditingStep } from './LaneGrid';
import type { LaneAction } from './types';

/* ══════════════════════════════════════════════════════════════
   LaneEditPanel — wraps NodeEditPanel with a no-op FlowEditorContext
   ══════════════════════════════════════════════════════════════ */

/** Minimal no-op context so NodeEditPanel can render without a full FlowEditor */
const NOOP_FLOW_CTX: FlowEditorContextValue = {
    availableIngredients: [],
    onSelectNode: () => {},
    onDeleteNode: () => {},
    nodeOutgoingEdges: new Map<string, number>(),
    nodeIncomingEdges: new Map<string, number>(),
    onAddNodeAfter: () => {},
    validation: {
        scope: 'editor',
        isValid: true,
        errors: [],
        blockingIssues: [],
        warningIssues: [],
        summary: null,
        counts: { total: 0, blocking: 0, warnings: 0 },
    },
    validationIssuesByNode: new Map(),
};

interface LaneEditPanelProps {
    editingStep: EditingStep;
    dispatch: React.Dispatch<LaneAction>;
    onClose: () => void;
}

export function LaneEditPanel({ editingStep, dispatch, onClose }: LaneEditPanelProps) {
    return (
        <FlowEditorContext.Provider value={NOOP_FLOW_CTX}>
            <NodeEditPanel
                key={editingStep.step.id}
                nodeId={editingStep.step.id}
                data={{
                    stepType: editingStep.step.type,
                    label: editingStep.step.label,
                    description: editingStep.step.description,
                    duration: editingStep.step.duration,
                }}
                availableIngredients={[]}
                onSave={(updates) => {
                    dispatch({
                        type: 'UPDATE_STEP',
                        stepId: editingStep.step.id,
                        updates: {
                            ...(updates.stepType && { type: updates.stepType }),
                            ...(updates.label !== undefined && { label: updates.label }),
                            ...(updates.description !== undefined && {
                                description: updates.description,
                            }),
                            duration: updates.duration,
                        },
                    });
                    onClose();
                }}
                onClose={onClose}
                canDelete={
                    editingStep.step.type !== 'start' && editingStep.step.type !== 'servieren'
                }
                onDelete={() => {
                    dispatch({
                        type: 'DELETE_STEP',
                        segmentId: editingStep.segmentId,
                        laneIndex: editingStep.laneIndex,
                        stepId: editingStep.step.id,
                    });
                    onClose();
                }}
            />
        </FlowEditorContext.Provider>
    );
}
