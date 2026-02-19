"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  Node,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { css } from "styled-system/css";
import { LANES, type FlowStep, type Lane } from "@/app/recipe/[id]/data";

const nodeWidth = 220;
const nodeHeight = 90;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dagreGraph: any = new (dagre as any).graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLaneById = (id: string): Lane | undefined => LANES.find((lane) => lane.id === id);

const getStepEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    vorbereitung: "🥗",
    kochen: "🍳",
    backen: "🥖",
    warten: "⏱️",
    wuerzen: "🧂",
    zusammenfuehren: "🔗",
    servieren: "✨",
  };
  return emojis[type] || "📝";
};

const getLayoutedElements = (nodes: Node[], direction = "TB") => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return layoutedNodes;
};

function RecipeFlowInner({ flowSteps, completedSteps = [] }: { flowSteps: FlowStep[]; completedSteps?: number[] }) {
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const nodes = useMemo(() => {
    const baseNodes: Node[] = flowSteps.map((step) => {
      const lane = getLaneById(step.laneId);
      const isCompleted = completedSteps.includes(step.order);

      return {
        id: `step-${step.order}`,
        type: "recipeNode",
        position: { x: 0, y: 0 },
        data: {
          label: step.description,
          type: step.type,
          duration: step.duration,
          lane: lane?.label || step.laneId,
          laneColor: lane?.color || "#f5f5f5",
          isCompleted,
          order: step.order,
          onClick: () => {
            setSelectedStep(step);
          },
        },
      };
    });

    return getLayoutedElements(baseNodes);
  }, [flowSteps, completedSteps]);

  const edges = useMemo(() => {
    const flowEdges: { id: string; source: string; target: string }[] = [];
    
    flowSteps.forEach((step, index) => {
      if (step.parallelWith && step.parallelWith.length > 0) {
        step.parallelWith.forEach((parallelOrder) => {
          const parallelStep = flowSteps.find((s) => s.order === parallelOrder);
          if (parallelStep) {
            flowEdges.push({
              id: `edge-${parallelOrder}-${step.order}`,
              source: `step-${parallelOrder}`,
              target: `step-${step.order}`,
            });
          }
        });
      } else if (index > 0) {
        const prevStep = flowSteps[index - 1];
        if (!prevStep.parallelWith?.includes(step.order)) {
          flowEdges.push({
            id: `edge-${prevStep.order}-${step.order}`,
            source: `step-${prevStep.order}`,
            target: `step-${step.order}`,
          });
        }
      }
    });

    return flowEdges;
  }, [flowSteps]);

  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 0 });
    }, 100);
  }, [fitView, flowSteps]);

  const nodeTypes = useMemo(
    () => ({
      recipeNode: ({ data }: { data: Record<string, unknown> }) => {
        const stepData = data as {
          label: string;
          type: string;
          duration?: number;
          lane: string;
          laneColor: string;
          isCompleted: boolean;
          order: number;
          onClick: () => void;
        };

        return (
          <div
            onClick={stepData.onClick}
            className={css({
              width: "220px",
              padding: "14px",
              borderRadius: "12px",
              backgroundColor: stepData.isCompleted ? "#e8f5e9" : stepData.laneColor,
              border: stepData.isCompleted ? "2px solid #4caf50" : "2px solid #ddd",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              _hover: {
                transform: "scale(1.02)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              })}
            >
              <span
                className={css({
                  width: "26px",
                  height: "26px",
                  borderRadius: "full",
                  backgroundColor: stepData.isCompleted ? "#4caf50" : "#666",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "600",
                })}
              >
                {stepData.isCompleted ? "✓" : stepData.order}
              </span>
              <span className={css({ fontSize: "20px" })}>{getStepEmoji(stepData.type)}</span>
            </div>
            <div
              className={css({
                fontSize: "13px",
                fontWeight: "500",
                lineHeight: "1.3",
                color: "#333",
              })}
            >
              {stepData.label}
            </div>
            {stepData.duration && (
              <div className={css({ fontSize: "11px", color: "#666", marginTop: "4px" })}>
                ⏱️ {stepData.duration} Min.
              </div>
            )}
          </div>
        );
      },
    }),
    [],
  );

  return (
    <div
      ref={reactFlowRef}
      className={css({
        width: "100%",
        minHeight: "500px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        backgroundColor: "#fafafa",
      })}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#888" },
          style: { stroke: "#888", strokeWidth: 2 },
        }))}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
        <Controls
          className={css({
            borderRadius: "8px",
            overflow: "hidden",
          })}
        />
        <Panel position="top-left">
          <div
            className={css({
              backgroundColor: "white",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              fontSize: "14px",
            })}
          >
            <strong>🗺️ Koch-Flow</strong>
            <div className={css({ fontSize: "12px", color: "#666", marginTop: "4px" })}>
              Klicke auf einen Schritt für Details
            </div>
          </div>
        </Panel>
        <Panel position="top-right">
          <div
            className={css({
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              maxWidth: "300px",
            })}
          >
            {LANES.map((lane) => (
              <div
                key={lane.id}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "white",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                })}
              >
                <div
                  className={css({
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    backgroundColor: lane.color,
                  })}
                />
                {lane.label}
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>

      {selectedStep && (
        <div
          className={css({
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            maxWidth: "400px",
            zIndex: 100,
          })}
        >
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            })}
          >
            <div className={css({ display: "flex", alignItems: "center", gap: "8px" })}>
              <span className={css({ fontSize: "20px" })}>{getStepEmoji(selectedStep.type)}</span>
              <span className={css({ fontWeight: "600", fontSize: "16px" })}>
                Schritt {selectedStep.order}
              </span>
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className={css({
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#999",
              })}
            >
              ×
            </button>
          </div>
          <p className={css({ color: "#333", lineHeight: "1.5" })}>{selectedStep.description}</p>
          {selectedStep.duration && (
            <div className={css({ marginTop: "8px", color: "#666", fontSize: "14px" })}>
              ⏱️ Dauer: ca. {selectedStep.duration} Minuten
            </div>
          )}
          <div className={css({ marginTop: "8px", fontSize: "12px", color: "#999" })}>
            📍 {LANES.find((l) => l.id === selectedStep.laneId)?.label}
          </div>
        </div>
      )}
    </div>
  );
}

interface RecipeFlowProps {
  flowSteps: FlowStep[];
  completedSteps?: number[];
}

export function RecipeFlow({ flowSteps, completedSteps = [] }: RecipeFlowProps) {
  return (
    <ReactFlowProvider>
      <RecipeFlowInner flowSteps={flowSteps} completedSteps={completedSteps} />
    </ReactFlowProvider>
  );
}
