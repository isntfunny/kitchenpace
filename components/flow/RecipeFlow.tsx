"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { css } from "styled-system/css";
import { LANES, type FlowStep, type Lane } from "@/app/recipe/[id]/data";

const nodeWidth = 200;
const nodeHeight = 80;

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

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
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

  return { nodes: layoutedNodes, edges };
};

interface RecipeFlowProps {
  flowSteps: FlowStep[];
  completedSteps?: number[];
  onStepClick?: (step: FlowStep) => void;
}

export function RecipeFlow({ flowSteps, completedSteps = [], onStepClick }: RecipeFlowProps) {
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const nodes: Node[] = flowSteps.map((step) => {
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
        },
      };
    });

    const edges: Edge[] = [];
    flowSteps.forEach((step, index) => {
      if (step.parallelWith && step.parallelWith.length > 0) {
        step.parallelWith.forEach((parallelOrder) => {
          const parallelStep = flowSteps.find((s) => s.order === parallelOrder);
          if (parallelStep) {
            edges.push({
              id: `edge-${parallelOrder}-${step.order}`,
              source: `step-${parallelOrder}`,
              target: `step-${step.order}`,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#888",
              },
              style: { stroke: "#888", strokeWidth: 2 },
              animated: false,
            });
          }
        });
      } else if (index > 0) {
        const prevStep = flowSteps[index - 1];
        if (!prevStep.parallelWith?.includes(step.order)) {
          edges.push({
            id: `edge-${prevStep.order}-${step.order}`,
            source: `step-${prevStep.order}`,
            target: `step-${step.order}`,
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#888",
            },
            style: { stroke: "#888", strokeWidth: 2 },
          });
        }
      }
    });

    return getLayoutedElements(nodes, edges);
  }, [flowSteps, completedSteps]);

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const step = flowSteps.find((s) => s.order === node.data.order);
      if (step) {
        setSelectedStep(step);
        onStepClick?.(step);
      }
    },
    [flowSteps, onStepClick],
  );

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
        };

        return (
          <div
            className={css({
              width: "200px",
              padding: "12px",
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
                  width: "24px",
                  height: "24px",
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
              <span
                className={css({
                  fontSize: "18px",
                })}
              >
                {getStepEmoji(stepData.type)}
              </span>
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
              <div
                className={css({
                  fontSize: "11px",
                  color: "#666",
                  marginTop: "4px",
                })}
              >
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
      className={css({
        width: "100%",
        height: "600px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        backgroundColor: "#fafafa",
      })}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
        <Controls
          className={css({
            borderRadius: "8px",
            overflow: "hidden",
          })}
        />
        <MiniMap
          nodeColor={(node) => (node.data?.isCompleted ? "#4caf50" : "#ddd")}
          maskColor="rgba(0,0,0,0.1)"
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
            <div
              className={css({
                fontSize: "12px",
                color: "#666",
                marginTop: "4px",
              })}
            >
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
              <span
                className={css({
                  fontWeight: "600",
                  fontSize: "16px",
                })}
              >
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
