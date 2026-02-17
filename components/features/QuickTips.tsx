"use client";

import { css } from "styled-system/css";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

const tips = [
  {
    icon: "⏱️",
    title: "Schnelle Tipps",
    content: "Gekochte Eier schälen: Im Eiswasserbad abschrecken",
  },
  {
    icon: "🌿",
    title: "Kräuter-Guide",
    content: "Basilikum niemals im Kühlschrank lagern",
  },
  {
    icon: "🧂",
    title: "Würzen",
    content: "Salz erst am Ende zugeben - nicht während des Kochens",
  },
];

export function QuickTips() {
  return (
    <div
      className={css({
        bg: "surface",
        borderRadius: "2xl",
        border: "1px solid",
        borderColor: "rgba(0,0,0,0.05)",
        p: "5",
      })}
    >
      <div className={css({ mb: "3" })}>
        <Heading as="h3" size="md">
          Küchen-Hacks
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
              bg: "rgba(248,181,0,0.06)",
              borderRadius: "xl",
              border: "1px solid",
              borderColor: "rgba(248,181,0,0.15)",
            })}
          >
            <span className={css({ fontSize: "xl" })}>{tip.icon}</span>
            <div>
              <Text size="sm" className={css({ fontWeight: "600" })}>
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
