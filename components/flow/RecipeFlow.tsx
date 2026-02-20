"use client";

import { useMemo, useState, useRef, useLayoutEffect, useCallback } from "react";
import { css } from "styled-system/css";
import { LANES, type FlowStep } from "@/app/recipe/[id]/data";

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

interface StepCardProps {
  step: FlowStep;
  isCompleted: boolean;
  isActive: boolean;
  isJustCompleted: boolean;
  onToggleComplete: () => void;
  onClick: () => void;
  cardRef?: (element: HTMLDivElement | null) => void;
}

function StepCard({ step, isCompleted, isActive, isJustCompleted, onToggleComplete, onClick, cardRef }: StepCardProps) {
  const lane = LANES.find((l) => l.id === step.laneId);

  return (
    <div
      onClick={onClick}
      ref={cardRef}
      className={css({
        padding: "16px",
        borderRadius: "16px",
        backgroundColor: isCompleted ? "#f0f9f0" : lane?.color || "#f5f5f5",
        border: isActive
          ? "2px solid #2196f3"
          : isCompleted
            ? "2px solid #4caf50"
            : "2px solid transparent",
        boxShadow: isActive
          ? "0 4px 20px rgba(33, 150, 243, 0.25)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        _hover: {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        },
        position: "relative",
        overflow: "hidden",
        animation: isJustCompleted ? "cardComplete 600ms ease-out" : "none",
        zIndex: 2,
      })}
    >
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: "10px" })}>
          <span className={css({ fontSize: "22px" })}>{getStepEmoji(step.type)}</span>
          <span
            className={css({
              fontSize: "12px",
              fontWeight: "600",
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            })}
          >
            {lane?.label || step.laneId}
          </span>
        </div>
        {step.duration && (
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: "#888",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: "4px 10px",
              borderRadius: "20px",
            })}
          >
            <span>⏱️</span>
            <span>{step.duration} Min.</span>
          </div>
        )}
      </div>

      <div
        className={css({
          fontSize: "14px",
          fontWeight: "500",
          color: isCompleted ? "#666" : "#333",
          lineHeight: "1.5",
          textDecoration: isCompleted ? "line-through" : "none",
        })}
      >
        {step.description}
      </div>

      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "12px",
        })}
      >
        {isActive && (
          <div
            className={css({
              fontSize: "12px",
              color: "#2196f3",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            })}
          >
            <span
              className={css({
                width: "8px",
                height: "8px",
                borderRadius: "full",
                backgroundColor: "#2196f3",
                animation: "pulse 1.5s infinite",
              })}
            />
            Klicke für Details
          </div>
        )}
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleComplete();
          }}
          className={css({
            marginLeft: "auto",
            padding: "6px 10px",
            borderRadius: "999px",
            border: isCompleted ? "none" : "1px solid #ddd",
            backgroundColor: isCompleted ? "#4caf50" : "white",
            color: isCompleted ? "white" : "#666",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
            _hover: {
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            },
          })}
        >
          {isCompleted ? "✓ Erledigt" : "Als erledigt"}
        </button>
      </div>
      <div
        className={css({
          position: "absolute",
          inset: "0",
          pointerEvents: "none",
          opacity: isJustCompleted ? 1 : 0,
          background: "linear-gradient(120deg, rgba(76,175,80,0.15), rgba(76,175,80,0))",
          animation: isJustCompleted ? "completeGlow 600ms ease-out" : "none",
        })}
      />
    </div>
  );
}

interface PositionedStep {
  step: FlowStep;
  row: number;
  column: number;
}

interface StepDetailModalProps {
  step: FlowStep;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onClose: () => void;
}

function StepDetailModal({ step, isCompleted, onToggleComplete, onClose }: StepDetailModalProps) {
  const lane = LANES.find((l) => l.id === step.laneId);
  
  return (
    <div
      className={css({
        position: "fixed",
        inset: "0",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      })}
      onClick={onClose}
    >
      <div
        className={css({
          backgroundColor: "white",
          borderRadius: "20px",
          padding: "24px",
          maxWidth: "450px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        })}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
          })}
        >
          <div className={css({ display: "flex", alignItems: "center", gap: "12px" })}>
            <span className={css({ fontSize: "36px" })}>{getStepEmoji(step.type)}</span>
            <div>
              <div
                className={css({
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#666",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                })}
              >
                {lane?.label}
              </div>
              <div
                className={css({
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#333",
                })}
              >
                Schritt {step.order}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={css({
              background: "none",
              border: "none",
              fontSize: "28px",
              cursor: "pointer",
              color: "#999",
              lineHeight: "1",
              _hover: { color: "#333" },
            })}
          >
            ×
          </button>
        </div>
        
        <p
          className={css({
            fontSize: "16px",
            lineHeight: "1.7",
            color: "#333",
            marginBottom: "20px",
          })}
        >
          {step.description}
        </p>
        
        <div
          className={css({
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "24px",
          })}
        >
          {step.duration && (
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#f5f5f5",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "14px",
                color: "#666",
              })}
            >
              <span>⏱️</span>
              <span>ca. {step.duration} Minuten</span>
            </div>
          )}
          {step.type && (
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#f5f5f5",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "14px",
                color: "#666",
              })}
            >
              <span>🏷️</span>
              <span style={{ textTransform: 'capitalize' }}>{step.type}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onToggleComplete}
          className={css({
            width: "100%",
            padding: "14px 20px",
            borderRadius: "12px",
            border: "none",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backgroundColor: isCompleted ? "#f5f5f5" : "#4caf50",
            color: isCompleted ? "#666" : "white",
            _hover: {
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            },
          })}
        >
          {isCompleted ? "✓ Bereits erledigt - Rückgängig machen" : "✓ Als erledigt markieren"}
        </button>
      </div>
    </div>
  );
}

export function RecipeFlow({ 
  flowSteps, 
  completedSteps = [],
}: { 
  flowSteps: FlowStep[]; 
  completedSteps?: number[];
}) {
  const [completed, setCompleted] = useState<number[]>(completedSteps);
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  const [lastCompleted, setLastCompleted] = useState<number | null>(null);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [nodeRects, setNodeRects] = useState<Record<number, { x: number; y: number; width: number; height: number }>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef(new Map<number, HTMLDivElement>());

  const flowEdges = useMemo(() => {
    const edges: { source: number; target: number }[] = [];
    flowSteps.forEach((step) => {
      step.parallelWith?.forEach((prev) => {
        edges.push({ source: prev, target: step.order });
      });
      step.nextSteps?.forEach((next) => {
        edges.push({ source: step.order, target: next });
      });
    });
    return edges;
  }, [flowSteps]);

  const { positionedSteps, totalColumns } = useMemo(() => {
    const orderedSteps = [...flowSteps].sort((a, b) => a.order - b.order);
    if (orderedSteps.length === 0) return { positionedSteps: [], totalColumns: 1 };

    const firstStep = orderedSteps[0];
    const lastStep = orderedSteps[orderedSteps.length - 1];

    const intermediateSteps = orderedSteps.slice(1, -1);
    const laneIds = [...new Set(intermediateSteps.map((s) => s.laneId))];
    const laneToColumn = new Map(laneIds.map((laneId, index) => [laneId, index + 1]));

    const totalColumns = Math.max(3, laneIds.length + 2);
    const centerColumn = Math.ceil(totalColumns / 2);

    const positioned: PositionedStep[] = orderedSteps.map((step, index) => {
      let column: number;
      
      if (step.order === firstStep.order || step.order === lastStep.order) {
        column = centerColumn;
      } else {
        column = (laneToColumn.get(step.laneId) ?? 1);
        if (totalColumns > 3) {
          column = column;
        }
      }

      return {
        step,
        row: index + 1,
        column,
      };
    });

    return { positionedSteps: positioned, totalColumns };
  }, [flowSteps]);

  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const nextRects: Record<number, { x: number; y: number; width: number; height: number }> = {};
    
    stepRefs.current.forEach((el, order) => {
      const rect = el.getBoundingClientRect();
      nextRects[order] = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      };
    });
    
    setNodeRects(nextRects);
    setContainerSize({ width: container.scrollWidth, height: container.scrollHeight });
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateLayout, flowSteps, isCookingMode]);

  const toggleComplete = (order: number) => {
    setCompleted((prev) => {
      const next = prev.includes(order) ? prev.filter((o) => o !== order) : [...prev, order];
      if (!prev.includes(order)) {
        setLastCompleted(order);
        setTimeout(() => setLastCompleted(null), 700);
      }
      return next;
    });
  };

  const getActiveStep = () => {
    const firstIncomplete = flowSteps.find((step) => !completed.includes(step.order));
    return firstIncomplete?.order ?? null;
  };

  const activeStep = getActiveStep();

  const containerStyles = isCookingMode
    ? css({
        position: "fixed",
        inset: "0",
        zIndex: 999,
        backgroundColor: "#fafafa",
        padding: "24px",
        overflow: "auto",
      })
    : css({
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px",
      });

  return (
    <div className={containerStyles}>
      <style jsx global>{`
        @keyframes cardComplete {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        @keyframes completeGlow {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
      
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          padding: "16px 20px",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          flexWrap: "wrap",
          gap: "12px",
        })}
      >
        <div>
          <div className={css({ fontSize: "18px", fontWeight: "700", color: "#333" })}>
            🗺️ Koch-Flow
          </div>
          <div className={css({ fontSize: "13px", color: "#666", marginTop: "2px" })}>
            {completed.length} von {flowSteps.length} Schritten erledigt
          </div>
        </div>
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "12px",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "8px",
            })}
          >
            <div
              className={css({
                width: "100px",
                height: "8px",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
              })}
            >
              <div
                className={css({
                  height: "100%",
                  backgroundColor: "#4caf50",
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                })}
                style={{ width: `${(completed.length / flowSteps.length) * 100}%` }}
              />
            </div>
            <span className={css({ fontSize: "14px", fontWeight: "600", color: "#4caf50" })}>
              {Math.round((completed.length / flowSteps.length) * 100)}%
            </span>
          </div>
          <button
            onClick={() => setIsCookingMode(!isCookingMode)}
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              borderRadius: "10px",
              border: isCookingMode ? "2px solid #4caf50" : "1px solid #ddd",
              backgroundColor: isCookingMode ? "#e8f5e9" : "white",
              color: isCookingMode ? "#2e7d32" : "#666",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              _hover: {
                transform: "translateY(-1px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              },
            })}
          >
            {isCookingMode ? "✕ Schließen" : "🍳 Kochmodus"}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={css({
          paddingBottom: "16px",
          position: "relative",
        })}
      >
        {containerSize.width > 0 && (
          <svg
            width={containerSize.width}
            height={containerSize.height}
            className={css({
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
              zIndex: 0,
            })}
            viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
          >
            {flowEdges.map((edge: { source: number; target: number }, index: number) => {
              const source = nodeRects[edge.source];
              const target = nodeRects[edge.target];
              if (!source || !target) return null;
              
              const startX = source.x + source.width / 2;
              const startY = source.y + source.height;
              const endX = target.x + target.width / 2;
              const endY = target.y;
              const midY = startY + (endY - startY) / 2;
              const path = `M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`;
              
              return (
                <path
                  key={`${edge.source}-${edge.target}-${index}`}
                  d={path}
                  fill="none"
                  stroke="rgba(122,165,107,0.6)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        )}

        <div
          className={css({
            display: "grid",
            gap: "24px",
            position: "relative",
            zIndex: 1,
          })}
          style={{
            gridTemplateColumns: `repeat(${totalColumns}, minmax(180px, 1fr))`,
            gridAutoRows: "minmax(120px, auto)",
          }}
        >
          {positionedSteps.map((record) => (
            <div
              key={record.step.order}
              style={{ gridColumn: record.column, gridRow: record.row }}
            >
              <StepCard
                step={record.step}
                isCompleted={completed.includes(record.step.order)}
                isActive={record.step.order === activeStep}
                isJustCompleted={record.step.order === lastCompleted}
                onToggleComplete={() => toggleComplete(record.step.order)}
                onClick={() => setSelectedStep(record.step)}
                cardRef={(el) => {
                  if (el) {
                    stepRefs.current.set(record.step.order, el);
                  } else {
                    stepRefs.current.delete(record.step.order);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {completed.length === flowSteps.length && flowSteps.length > 0 && (
        <div
          className={css({
            marginTop: "24px",
            padding: "24px",
            backgroundColor: "#e8f5e9",
            borderRadius: "16px",
            textAlign: "center",
            border: "2px solid #4caf50",
          })}
        >
          <div className={css({ fontSize: "36px", marginBottom: "8px" })}>🎉</div>
          <div className={css({ fontSize: "20px", fontWeight: "700", color: "#2e7d32" })}>
            Fertig!
          </div>
          <div className={css({ fontSize: "14px", color: "#666", marginTop: "4px" })}>
            Du hast alle Schritte gemeistert. Guten Appetit!
          </div>
        </div>
      )}

      {selectedStep && (
        <StepDetailModal
          step={selectedStep}
          isCompleted={completed.includes(selectedStep.order)}
          onToggleComplete={() => toggleComplete(selectedStep.order)}
          onClose={() => setSelectedStep(null)}
        />
      )}
    </div>
  );
}
