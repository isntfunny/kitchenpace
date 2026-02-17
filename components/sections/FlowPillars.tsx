"use client";

import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

const pillars = [
  {
    title: "Palette der Woche",
    description:
      "Wähle ein Farbthema, das deine Rezepte und deine Küche miteinander verzahnt. Darin spiegeln wir Zutaten, Texturen und Licht.",
    icon: "🎨",
    color: "#e07b53",
    bg: "linear-gradient(135deg, rgba(224,123,83,0.12) 0%, rgba(224,123,83,0.04) 100%)",
  },
  {
    title: "Moodboard Stories",
    description:
      "Sammle kurze Texturen, Zutaten und Aromen, die deine Gäste auf eine Reise mitnehmen – perfekt für mobile Moodboards.",
    icon: "📚",
    color: "#6c5ce7",
    bg: "linear-gradient(135deg, rgba(108,92,231,0.12) 0%, rgba(108,92,231,0.04) 100%)",
  },
  {
    title: "Saisonale Akzente",
    description:
      "Hinterlege jede Woche eine neue Zutat, um saisonale Nuancen in Farbe, Geschmack und Story zu feiern.",
    icon: "🌱",
    color: "#00b894",
    bg: "linear-gradient(135deg, rgba(0,184,148,0.12) 0%, rgba(0,184,148,0.04) 100%)",
  },
];

export function FlowPillars() {
  return (
    <section
      className={css({
        borderRadius: "3xl",
        border: "1px solid",
        borderColor: "rgba(0,0,0,0.04)",
        padding: { base: "6", md: "8" },
        background: "white",
      })}
    >
      <div>
        <div
          className={css({
            display: "inline-flex",
            background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
            borderRadius: "full",
            padding: "4px 14px",
            fontSize: "xs",
            fontWeight: "600",
            color: "white",
            marginBottom: "3",
          })}
        >
          ✨ Design Konzept
        </div>
        <Heading as="h2" size="lg" className={css({ mt: "3" })}>
          Mobiles Storytelling, klar verpackt
        </Heading>
        <Text size="sm" color="muted" className={css({ mt: "2", maxW: "48ch" })}>
          Der erste Eindruck erzeugt Kontext. Wir bauen eine klare, mobile-sensible Struktur, die mit Farbe,
          Rhythmus und Raum arbeitet, ohne in klassische Card-Layouts zu verfallen.
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
              borderRadius: "2xl",
              padding: "5",
              background: pillar.bg,
              border: "2px solid",
              borderColor: `${pillar.color}25`,
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              gap: "3",
              _hover: {
                borderColor: pillar.color,
                transform: "translateY(-4px)",
                boxShadow: `0 12px 32px ${pillar.color}25`,
              },
              transition: "all 250ms ease",
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
                background: "white",
                border: "2px solid",
                borderColor: pillar.color,
                boxShadow: `0 4px 12px ${pillar.color}30`,
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
