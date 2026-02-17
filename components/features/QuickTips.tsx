"use client";

import { css } from "styled-system/css";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

const tips = [
  {
    icon: "⏱️",
    title: "Schnelle Tipps",
    content: "Gekochte Eier schälen: Im Eiswasserbad abschrecken",
    bg: "linear-gradient(135deg, rgba(116, 185, 255, 0.15) 0%, rgba(9, 132, 227, 0.15) 100%)",
    borderColor: "rgba(116, 185, 255, 0.4)",
  },
  {
    icon: "🌿",
    title: "Kräuter-Guide",
    content: "Basilikum niemals im Kühlschrank lagern",
    bg: "linear-gradient(135deg, rgba(0, 184, 148, 0.15) 0%, rgba(0, 206, 201, 0.15) 100%)",
    borderColor: "rgba(0, 184, 148, 0.4)",
  },
  {
    icon: "🧂",
    title: "Würzen",
    content: "Salz erst am Ende zugeben - nicht während des Kochens",
    bg: "linear-gradient(135deg, rgba(253, 203, 110, 0.15) 0%, rgba(248, 181, 0, 0.15) 100%)",
    borderColor: "rgba(253, 203, 110, 0.4)",
  },
];

export function QuickTips() {
  return (
    <div
      className={css({
        borderRadius: "2xl",
        border: "1px solid",
        borderColor: "rgba(0,184,148,0.2)",
        p: "5",
        background: "linear-gradient(180deg, #f0fff9 0%, #f8fffd 100%)",
      })}
    >
      <div className={css({ mb: "4" })}>
        <Heading
          as="h3"
          size="md"
          className={css({
            background: "linear-gradient(90deg, #00b894, #00cec9)",
            backgroundClip: "text",
            color: "transparent",
          })}
        >
          Küchen-Hacks 💡
        </Heading>
      </div>

      <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
        {tips.map((tip, index) => (
          <div
            key={index}
            className={css({
              display: "flex",
              gap: "3",
              p: "3",
              borderRadius: "xl",
              background: tip.bg,
              border: "1px solid",
              borderColor: tip.borderColor,
              _hover: {
                transform: "translateX(4px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              },
              transition: "all 200ms ease",
            })}
          >
            <span className={css({ fontSize: "xl", flexShrink: 0 })}>{tip.icon}</span>
            <div>
              <Text size="sm" className={css({ fontWeight: "600", color: "#2d3436" })}>
                {tip.title}
              </Text>
              <Text size="sm" color="muted">
                {tip.content}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
