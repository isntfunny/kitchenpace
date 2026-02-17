"use client";

import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Badge } from "../atoms/Badge";
import { Heading, Text } from "../atoms/Typography";

const pillars = [
  {
    title: "Palette der Woche",
    description:
      "Wähle ein Farbthema, das deine Rezepte und deine Küche miteinander verzahnt. Darin spiegeln wir Zutaten, Texturen und Licht. ",
    icon: "🎨",
  },
  {
    title: "Moodboard Stories",
    description:
      "Sammle kurze Texturen, Zutaten und Aromen, die deine Gäste auf eine Reise mitnehmen – perfekt für mobile Moodboards.",
    icon: "📚",
  },
  {
    title: "Saisonale Akzente",
    description:
      "Hinterlege jede Woche eine neue Zutat, um saisonale Nuancen in Farbe, Geschmack und Story zu feiern.",
    icon: "🌱",
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
        <Badge variant="outline">Design Konzept</Badge>
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
              background: "var(--panda-light, #faf9f7)",
              border: "1px solid",
              borderColor: "rgba(0,0,0,0.03)",
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              gap: "3",
            })}
          >
            <span
              className={css({
                width: "48px",
                height: "48px",
                borderRadius: "full",
                display: "grid",
                placeItems: "center",
                fontSize: "xl",
                border: "1px solid",
                borderColor: "rgba(224,123,83,0.4)",
              })}
            >
              {pillar.icon}
            </span>
            <Heading as="h3" size="md">
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
