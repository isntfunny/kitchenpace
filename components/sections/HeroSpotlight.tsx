"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Button } from "../atoms/Button";
import { Heading, Text } from "../atoms/Typography";
import { WeeklyPlanDialog } from "../features/WeeklyPlanDialog";

const stats = [
  {
    label: "Spuren",
    value: "6",
    detail: "definierte Kochphasen",
    color: "#e07b53",
  },
  {
    label: "Parallel",
    value: "∞",
    detail: "Verzweigungen möglich",
    color: "#f8b500",
  },
  {
    label: "Validiert",
    value: "100%",
    detail: "automatische Prüfung",
    color: "#00b894",
  },
];

export function HeroSpotlight() {
  return (
    <section
      className={css({
        position: "relative",
        overflow: "hidden",
        px: { base: "4", md: "10" },
        py: { base: "10", md: "14" },
      })}
    >
      <div className={css({ maxWidth: "1200px", marginX: "auto" })}>
        <div
          className={grid({
            columns: { base: 1, lg: 2 },
            gap: "10",
            alignItems: "center",
            position: "relative",
          })}
        >
        <div>
          <div
            className={css({
              display: "inline-flex",
              bg: "#e07b53",
              borderRadius: "full",
              padding: "4px 14px",
              fontSize: "xs",
              fontWeight: "600",
              color: "white",
            })}
          >
            🌟 Innovatives Konzept
          </div>
          <Heading as="h1" size="xl" className={css({ mt: "4", maxW: "48ch" })}>
            KUC – Koch Umströmungs Control
          </Heading>
          <Text size="lg" color="muted" className={css({ mt: "4", maxW: "46ch" })}>
            Verzweigte Rezeptflüsse mit parallelen Spuren. Visualisiere Vorbereitung, Kochen, Backen und mehr als eigene Bahnen – mit automatischem Layout und Validierung.
          </Text>
          <div
            className={css({
              display: "flex",
              flexWrap: "wrap",
              gap: "3",
              mt: "6",
            })}
          >
            <Button variant="primary" size="lg">
              Inspiration starten
            </Button>
            <WeeklyPlanDialog />
          </div>
          <div
            className={grid({
              columns: { base: 1, md: 3 },
              gap: "3",
              mt: "6",
            })}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={css({
                  padding: "4",
                  _hover: {
                    transform: "translateY(-2px)",
                  },
                  transition: "transform 200ms ease",
                })}
              >
                <Text size="sm" className={css({ color: stat.color, fontWeight: "600" })}>
                  {stat.label}
                </Text>
                <Text
                  size="lg"
                  className={css({
                    fontWeight: "700",
                    color: stat.color,
                    mt: "1",
                  })}
                >
                  {stat.value}
                </Text>
                <Text size="sm" color="muted">
                  {stat.detail}
                </Text>
              </div>
            ))}
          </div>
        </div>
        <div
          className={css({
            position: "relative",
            borderRadius: "3xl",
            overflow: "hidden",
            minHeight: "320px",
          })}
        >
          <Image
            src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1000&q=80"
            alt="KUC Recipe Flow Editor"
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className={css({ objectFit: "cover" })}
          />
          <div
            className={css({
              position: "absolute",
              inset: 0,
              bg: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)",
            })}
          />
              <div
                className={css({
                  _hover: {
                    transform: "translateY(-2px)",
                  },
                  transition: "transform 200ms ease",
                })}
              >
            <div
              className={css({
                display: "inline-flex",
                bg: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                borderRadius: "full",
                padding: "4px 12px",
                fontSize: "xs",
                fontWeight: "600",
                color: "white",
              })}
            >
              🔥 KUC Editor
            </div>
            <Text size="lg" className={css({ fontWeight: "600", mt: "2" })}>
              Verzweigung & Parallelansicht
            </Text>
            <Text size="sm" color="primary" className={css({ mt: "1" })}>
              Spuren für jede Kochphase
            </Text>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
