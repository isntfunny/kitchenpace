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
    label: "Inspirationen",
    value: "1.200+",
    detail: "handverlesene Rezepte",
    color: "#e07b53",
    bg: "linear-gradient(135deg, rgba(224,123,83,0.15) 0%, rgba(224,123,83,0.05) 100%)",
  },
  {
    label: "Zeitsparer",
    value: "20 Min.",
    detail: "durchschnittliche Vorbereitung",
    color: "#f8b500",
    bg: "linear-gradient(135deg, rgba(248,181,0,0.15) 0%, rgba(248,181,0,0.05) 100%)",
  },
  {
    label: "Community",
    value: "980",
    detail: "aktive Köch:innen",
    color: "#00b894",
    bg: "linear-gradient(135deg, rgba(0,184,148,0.15) 0%, rgba(0,184,148,0.05) 100%)",
  },
];

export function HeroSpotlight() {
  return (
    <section
      className={css({
        position: "relative",
        overflow: "hidden",
        bg: "light",
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
              background: "linear-gradient(135deg, #f8b500 0%, #e07b53 100%)",
              borderRadius: "full",
              padding: "4px 14px",
              fontSize: "xs",
              fontWeight: "600",
              color: "white",
              boxShadow: "0 4px 12px rgba(224,123,83,0.35)",
            })}
          >
            🌟 Neues Erlebnis
          </div>
          <Heading as="h1" size="xl" className={css({ mt: "4", maxW: "48ch" })}>
            KüchenTakt verbindet Wochenrhythmus mit kulinarischer Ästhetik
          </Heading>
          <Text size="lg" color="muted" className={css({ mt: "4", maxW: "46ch" })}>
            Smarte Filter, Tageshighlights und ein Moodboard für deine Küche erlauben dir,
            jede Woche einen neuen Takt festzulegen – mobil, smart und mit ganz viel Gefühl.
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
                  borderRadius: "xl",
                  border: "2px solid",
                  borderColor: `${stat.color}30`,
                  padding: "4",
                  background: stat.bg,
                  _hover: {
                    borderColor: stat.color,
                    transform: "translateY(-2px)",
                    boxShadow: `0 8px 24px ${stat.color}20`,
                  },
                  transition: "all 200ms ease",
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
            border: "1px solid",
            borderColor: "rgba(0,0,0,0.06)",
            minHeight: "320px",
          })}
        >
          <Image
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&q=80"
            alt="Moodboard Hero"
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
              position: "absolute",
              bottom: "4",
              left: "4",
              right: "4",
              color: "white",
            })}
          >
            <div
              className={css({
                display: "inline-flex",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                borderRadius: "full",
                padding: "4px 12px",
                fontSize: "xs",
                fontWeight: "600",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
              })}
            >
              🔥 Tageshighlight
            </div>
            <Text size="lg" className={css({ fontWeight: "600", mt: "2" })}>
              Zitrusrauch & Mandelcrisp
            </Text>
            <Text size="sm" color="primary" className={css({ mt: "1" })}>
              Für laue Abende und lange Gespräche
            </Text>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
