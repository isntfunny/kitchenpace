"use client";

import { useMemo, useState } from "react";
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
}

function StepCard({ step, isCompleted, isActive, isJustCompleted, hasParallelLink, onToggleComplete, onClick }: StepCardProps) {
  const lane = LANES.find((l) => l.id === step.laneId);

  return (
    <div
      onClick={onClick}
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
          marginTop: hasParallelLink ? "6px" : "0",
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
          display: "flex",
          gap: "20px",
          alignItems: "start",
          position: "relative",
          overflowX: "auto",
          paddingBottom: "16px",
          scrollSnapType: "x mandatory",
          "@media (min-width: 768px)": {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            overflowX: "visible",
          },
        })}
      >
        {lanesWithSteps.map((lane) => (
          <div
            key={lane.id}
            className={css({
              backgroundColor: "white",
              borderRadius: "16px",
              border: "1px solid #eee",
              padding: "14px",
              minHeight: "100%",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              position: "relative",
              minWidth: "260px",
              flexShrink: 0,
              scrollSnapAlign: "start",
            })}
          >
            <div
              className={css({
                position: "absolute",
                top: "54px",
                bottom: "18px",
                left: "18px",
                width: "2px",
                background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.02))",
              })}
            />
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              })}
            >
              <div
                className={css({
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#333",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                })}
              >
                {lane.label}
              </div>
              <div
                className={css({
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  backgroundColor: lane.color,
                })}
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "12px", position: "relative" })}>
              {lane.steps.map((step) => (
                <StepCard
                  key={step.order}
                  step={step}
                  isCompleted={completed.includes(step.order)}
                  isActive={step.order === activeStep}
                  isJustCompleted={step.order === lastCompleted}
                  hasParallelLink={parallelOrders.has(step.order)}
                  onToggleComplete={() => toggleComplete(step.order)}
                  onClick={() => setSelectedStep(step)}
                />
              ))}
            </div>
          </div>
        ))}
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
