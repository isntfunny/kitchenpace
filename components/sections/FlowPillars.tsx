"use client";

import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

const pillars = [
  {
    title: "6 Flow-Spuren",
    description:
      "Vorbereitung, Kochen, Backen, Warten, Würzen, Servieren – jede Phase bekommt ihren eigenen Raum.",
    icon: "🛤️",
    color: "#e07b53",
  },
  {
    title: "Unendlich verzweigt",
    description:
      "Parallele Pfade, die sich treffen. Alle Wege führen zum perfekten Teller – garantiert.",
    icon: "🔀",
    color: "#6c5ce7",
  },
  {
    title: "Ein Klick, fertig",
    description:
      "Auto-Layout ordnet alles – smart, schnell, schön. Du fokussierst dich aufs Kochen.",
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
          ✨ Das Herzstück
        </div>
        <Heading as="h2" size="lg" className={css({ mt: "3" })}>
          Rezepte, die atmen
        </Heading>
        <Text size="sm" color="muted" className={css({ mt: "2", maxW: "48ch" })}>
          Vergiss Listen. Willkommen im Flow – wo jeder Schritt sichtbar wird und Kochen zur Choreografie.
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
