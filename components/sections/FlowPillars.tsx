"use client";

import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

const pillars = [
  {
    title: "Parallele Schritte",
    description:
      "Sieh auf einen Blick, welche Schritte gleichzeitig laufen können – ohne lange Listen durchzulesen.",
    icon: "⏲️",
    color: "#e07b53",
  },
  {
    title: "Klar strukturiert",
    description:
      "Jeder Schritt hat seinen Platz. Du behältst den Überblick, auch wenn mehrere Töpfe auf dem Herd stehen.",
    icon: "📋",
    color: "#6c5ce7",
  },
  {
    title: "Einfach verständlich",
    description:
      "Keine komplizierten Erklärungen. Du siehst sofort, was als nächstes zu tun ist.",
    icon: "✨",
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
        <Heading as="h2" size="lg" className={css({ mt: "3" })}>
          So einfach geht's
        </Heading>
        <Text size="sm" color="muted" className={css({ mt: "2", maxW: "48ch" })}>
          Rezepte, die zeigen statt erklären.
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
