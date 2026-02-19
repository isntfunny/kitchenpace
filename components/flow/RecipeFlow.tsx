"use client";

import { useState } from "react";
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
  isLast: boolean;
  onToggleComplete: () => void;
  onClick: () => void;
}

function StepCard({ step, isCompleted, isActive, isLast, onToggleComplete, onClick }: StepCardProps) {
  const lane = LANES.find((l) => l.id === step.laneId);
  
  return (
    <div className={css({ display: "flex", gap: "16px" })}>
      <div className={css({ display: "flex", flexDirection: "column", alignItems: "center" })}>
        <button
          onClick={onToggleComplete}
          className={css({
            width: "40px",
            height: "40px",
            borderRadius: "full",
            border: isCompleted ? "none" : "2px solid #ddd",
            backgroundColor: isCompleted ? "#4caf50" : "white",
            color: isCompleted ? "white" : "#999",
            fontSize: "18px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            _hover: {
              transform: "scale(1.1)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            },
          })}
        >
          {isCompleted ? "✓" : step.order}
        </button>
        
        {!isLast && (
          <div
            className={css({
              width: "2px",
              flex: "1",
              minHeight: "40px",
              backgroundColor: isCompleted ? "#4caf50" : "#e0e0e0",
              marginTop: "8px",
              transition: "background-color 0.3s ease",
            })}
          />
        )}
      </div>
      
      <div
        onClick={onClick}
        className={css({
          flex: "1",
          marginBottom: isLast ? "0" : "24px",
        })}
      >
        <div
          className={css({
            padding: "16px 20px",
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
              transform: "translateX(4px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            },
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            })}
          >
            <div className={css({ display: "flex", alignItems: "center", gap: "10px" })}>
              <span className={css({ fontSize: "24px" })}>{getStepEmoji(step.type)}</span>
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
                  fontSize: "13px",
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
              fontSize: "15px",
              fontWeight: "500",
              color: isCompleted ? "#666" : "#333",
              lineHeight: "1.5",
              textDecoration: isCompleted ? "line-through" : "none",
            })}
          >
            {step.description}
          </div>
          
          {isActive && (
            <div
              className={css({
                marginTop: "12px",
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
        </div>
      </div>
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

  const toggleComplete = (order: number) => {
    setCompleted((prev) => 
      prev.includes(order) 
        ? prev.filter((o) => o !== order)
        : [...prev, order]
    );
  };

  const getActiveStep = () => {
    const firstIncomplete = flowSteps.find((step) => !completed.includes(step.order));
    return firstIncomplete?.order ?? null;
  };

  const activeStep = getActiveStep();

  return (
    <div
      className={css({
        width: "100%",
        maxWidth: "700px",
        margin: "0 auto",
        padding: "24px",
      })}
    >
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
          position: "relative",
          paddingLeft: "8px",
        })}
      >
        {flowSteps.map((step, index) => (
          <StepCard
            key={step.order}
            step={step}
            isCompleted={completed.includes(step.order)}
            isActive={step.order === activeStep}
            isLast={index === flowSteps.length - 1}
            onToggleComplete={() => toggleComplete(step.order)}
            onClick={() => setSelectedStep(step)}
          />
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
