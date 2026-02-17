"use client";

import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

const pillars = [
  {
    title: "Spurensystem",
    description:
      "6 definierte Kochphasen: Vorbereitung, Kochen, Backen, Warten, Würzen, Servieren. Jede Spur hat ihre eigene Y-Position.",
    icon: "🛤️",
    color: "#e07b53",
  },
  {
    title: "Verzweigung & Parallelität",
    description:
      "Erstelle parallele Pfade mit Verzweigungen. Das System validiert automatisch, dass alle Wege zum Servieren führen.",
    icon: "🔀",
    color: "#6c5ce7",
  },
  {
    title: "Auto-Layout",
    description:
      "Dagre-basierte automatische Anordnung. Ein Klick genügt, um alle Schritte optimal in den Spuren zu verteilen.",
    icon: "⚡",
    color: "#00b894",
  },
];

export function FlowPillars() {
  return (
    <section
      className={css({
        padding: { base: "6", md: "8" },
        borderRadius: "2xl",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      })}
    >
      <div>
        <div
          className={css({
            display: "inline-flex",
            bg: "#6c5ce7",
            borderRadius: "full",
            padding: "4px 14px",
            fontSize: "xs",
            fontWeight: "600",
            color: "white",
            marginBottom: "3",
          })}
        >
          ✨ KUC Konzept
        </div>
        <Heading as="h2" size="lg" className={css({ mt: "3" })}>
          Rezeptflüsse neu gedacht
        </Heading>
        <Text size="sm" color="muted" className={css({ mt: "2", maxW: "48ch" })}>
          Der KUC Editor visualisiert Rezepte als verzweigte Flüsse mit parallelen Spuren.
          Keine linearen Listen mehr – sondern ein interaktives Diagramm deiner Kochschritte.
        </Text>
      </div>
      <div
        className={grid({
          columns: { base: 1, md: 3 },
          gap: "4",
          mt: "6",
        })}
      >
        {pillars.map((pillar) => (
          <div
            key={pillar.title}
            className={css({
              padding: "5",
              minHeight: "180px",
              display: "flex",
              flexDirection: "column",
              gap: "3",
              _hover: {
                transform: "translateY(-4px)",
              },
              transition: "transform 250ms ease",
            })}
          >
            <span
              className={css({
                width: "52px",
                height: "52px",
                borderRadius: "full",
                display: "grid",
                placeItems: "center",
                fontSize: "xl",
                background: pillar.color,
                color: "white",
              })}
            >
              {pillar.icon}
            </span>
            <Heading as="h3" size="md" className={css({ color: pillar.color })}>
              {pillar.title}
            </Heading>
            <Text size="sm" color="muted">
              {pillar.description}
            </Text>
          </div>
        ))}
      </div>
    </section>
  );
}
