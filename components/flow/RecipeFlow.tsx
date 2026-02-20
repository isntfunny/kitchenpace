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
  hasParallelLink: boolean;
  onToggleComplete: () => void;
  onClick: () => void;
  cardRef?: (element: HTMLDivElement | null) => void;
}

function StepCard({ step, isCompleted, isActive, isJustCompleted, hasParallelLink, onToggleComplete, onClick, cardRef }: StepCardProps) {
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
      })}
    >
      {hasParallelLink && (
        <div
          className={css({
            position: "absolute",
            top: "0",
            left: "16px",
            right: "16px",
            height: "6px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#7aa56b",
          })}
        >
          <span
            className={css({
              width: "6px",
              height: "6px",
              borderRadius: "full",
              backgroundColor: "#7aa56b",
            })}
          />
          <div
            className={css({
              flex: "1",
              borderTop: "2px dashed #a5c99c",
              opacity: 0.7,
            })}
          />
          <span
            className={css({
              width: "6px",
              height: "6px",
              borderRadius: "full",
              backgroundColor: "#7aa56b",
            })}
          />
        </div>
      )}
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          marginTop: hasParallelLink ? "12px" : "0",
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
  hasTopConnector: boolean;
  hasBottomConnector: boolean;
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
  const [activeLaneIndex, setActiveLaneIndex] = useState(0);
  const [nodeRects, setNodeRects] = useState<Record<number, { x: number; y: number; width: number; height: number }>>({});
  const [scrollSize, setScrollSize] = useState({ width: 0, height: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef(new Map<number, HTMLDivElement>());
  const mergeEdges = useMemo(() => {
    const edges: { source: number; target: number }[] = [];
    flowSteps.forEach((step) => {
      step.parallelWith?.forEach((prev) => {
        edges.push({ source: prev, target: step.order });
      });
    });
    return edges;
  }, [flowSteps]);
  const updateLayout = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const nextRects: Record<number, { x: number; y: number; width: number; height: number }> = {};
    stepRefs.current.forEach((el, order) => {
      const rect = el.getBoundingClientRect();
      nextRects[order] = {
        x: rect.left - containerRect.left + container.scrollLeft,
        y: rect.top - containerRect.top + container.scrollTop,
        width: rect.width,
        height: rect.height,
      };
    });
    setNodeRects(nextRects);
    setScrollSize({ width: container.scrollWidth, height: container.scrollHeight });
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateLayout, flowSteps]);

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
  const lanesWithSteps = LANES.map((lane) => ({
    ...lane,
    steps: flowSteps.filter((step) => step.laneId === lane.id).sort((a, b) => a.order - b.order),
  })).filter((lane) => lane.steps.length > 0);
  const parallelOrders = useMemo(() => {
    const linked = new Set<number>();
    flowSteps.forEach((step) => {
      if (step.parallelWith && step.parallelWith.length > 0) {
        linked.add(step.order);
        step.parallelWith.forEach((order) => linked.add(order));
      }
    });
    return linked;
  }, [flowSteps]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const laneWidth = 280;
      const newIndex = Math.round(scrollLeft / laneWidth);
      setActiveLaneIndex(Math.min(newIndex, lanesWithSteps.length - 1));
    }
  };

  const scrollToLane = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: index * 280, behavior: "smooth" });
    }
  };

  const laneIndexMap = new Map(lanesWithSteps.map((lane, index) => [lane.id, index]));
  const orderedSteps = [...flowSteps].sort((a, b) => a.order - b.order);

  const positionedSteps: PositionedStep[] = orderedSteps.map((step, idx) => ({
    step,
    row: idx + 1,
    column: (laneIndexMap.get(step.laneId) ?? 0) + 1,
    hasTopConnector: false,
    hasBottomConnector: false,
  }));

  const laneToPositioned = new Map<string, PositionedStep[]>();
  positionedSteps.forEach((record) => {
    if (!laneToPositioned.has(record.step.laneId)) {
      laneToPositioned.set(record.step.laneId, []);
    }
    laneToPositioned.get(record.step.laneId)?.push(record);
  });

  laneToPositioned.forEach((list) => {
    list.forEach((record, index) => {
      record.hasTopConnector = index > 0;
      record.hasBottomConnector = index < list.length - 1;
    });
  });

  return (
    <div
      className={css({
        width: "100%",
        maxWidth: "700px",
        margin: "0 auto",
        padding: "24px",
      })}
    >
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
            gap: "8px",
          })}
        >
          <div
            className={css({
              width: "120px",
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
      </div>

      <div
        className={css({
          paddingBottom: "16px",
          position: "relative",
        })}
      >
        <div
          ref={scrollRef}
          onScroll={() => {
            handleScroll();
            updateLayout();
          }}
          className={css({
            overflowX: "auto",
            position: "relative",
          })}
        >
          {scrollSize.width > 0 && (
            <svg
              width={scrollSize.width}
              height={scrollSize.height}
              className={css({
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                zIndex: 0,
              })}
              viewBox={`0 0 ${scrollSize.width} ${scrollSize.height}`}
            >
              {mergeEdges.map((edge, index) => {
                const source = nodeRects[edge.source];
                const target = nodeRects[edge.target];
                if (!source || !target) {
                  return null;
                }
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
                    stroke="rgba(122,165,107,0.8)"
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
              gridAutoRows: "minmax(160px, auto)",
              position: "relative",
              zIndex: 1,
            })}
            style={{
              gridTemplateColumns: `repeat(${lanesWithSteps.length}, minmax(240px, 1fr))`,
              minWidth: lanesWithSteps.length > 1 ? `${lanesWithSteps.length * 260}px` : "auto",
            }}
          >
            {positionedSteps.map((record) => (
              <div
                key={record.step.order}
                className={css({ position: "relative" })}
                style={{ gridColumn: record.column, gridRow: record.row + 1 }}
              >
                {record.hasTopConnector && (
                  <div
                    className={css({
                      position: "absolute",
                      top: "-24px",
                      left: "calc(50% - 1px)",
                      width: "2px",
                      height: "24px",
                      backgroundColor: "#cfd8dc",
                      zIndex: 0,
                    })}
                  />
                )}
                <StepCard
                  step={record.step}
                  isCompleted={completed.includes(record.step.order)}
                  isActive={record.step.order === activeStep}
                  isJustCompleted={record.step.order === lastCompleted}
                  hasParallelLink={parallelOrders.has(record.step.order)}
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
                {record.hasBottomConnector && (
                  <div
                    className={css({
                      position: "absolute",
                      bottom: "-24px",
                      left: "calc(50% - 1px)",
                      width: "2px",
                      height: "24px",
                      backgroundColor: "#cfd8dc",
                      zIndex: 0,
                    })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {lanesWithSteps.length > 1 && (
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginTop: "8px",
            "@media (min-width: 768px)": {
              display: "none",
            },
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "8px",
            })}
          >
            {lanesWithSteps.map((lane, index) => (
              <button
                key={lane.id}
                onClick={() => scrollToLane(index)}
                className={css({
                  width: index === activeLaneIndex ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: index === activeLaneIndex ? "#4caf50" : "#ddd",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                })}
              />
            ))}
          </div>
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "300px",
              padding: "0 20px",
            })}
          >
            <button
              onClick={() => scrollToLane(Math.max(0, activeLaneIndex - 1))}
              disabled={activeLaneIndex === 0}
              className={css({
                width: "32px",
                height: "32px",
                borderRadius: "full",
                border: "none",
                backgroundColor: activeLaneIndex === 0 ? "#f5f5f5" : "white",
                color: activeLaneIndex === 0 ? "#ccc" : "#666",
                fontSize: "16px",
                cursor: activeLaneIndex === 0 ? "default" : "pointer",
                boxShadow: activeLaneIndex === 0 ? "none" : "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
                _hover: activeLaneIndex === 0 ? {} : { transform: "scale(1.1)" },
              })}
            >
              ←
            </button>
              <span
                className={css({
                  fontSize: "12px",
                  color: "#888",
                  fontWeight: "500",
                })}
              >
                Flow {activeLaneIndex + 1}
              </span>
            <button
              onClick={() => scrollToLane(Math.min(lanesWithSteps.length - 1, activeLaneIndex + 1))}
              disabled={activeLaneIndex === lanesWithSteps.length - 1}
              className={css({
                width: "32px",
                height: "32px",
                borderRadius: "full",
                border: "none",
                backgroundColor: activeLaneIndex === lanesWithSteps.length - 1 ? "#f5f5f5" : "white",
                color: activeLaneIndex === lanesWithSteps.length - 1 ? "#ccc" : "#666",
                fontSize: "16px",
                cursor: activeLaneIndex === lanesWithSteps.length - 1 ? "default" : "pointer",
                boxShadow: activeLaneIndex === lanesWithSteps.length - 1 ? "none" : "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
                _hover: activeLaneIndex === lanesWithSteps.length - 1 ? {} : { transform: "scale(1.1)" },
              })}
            >
              →
            </button>
          </div>
        </div>
      )}

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
