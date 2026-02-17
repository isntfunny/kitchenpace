"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import * as React from "react";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Heading, Text } from "../atoms/Typography";
import { WeeklyPlanDialog } from "../features/WeeklyPlanDialog";

const stats = [
  { label: "Inspirationen", value: "1.200+", detail: "handverlesene Rezepte" },
  { label: "Zeitsparer", value: "20 Min.", detail: "durchschnittliche Vorbereitung" },
  { label: "Community", value: "980", detail: "aktive Köch:innen diesen Monat" },
];

export function HeroSpotlight() {
  return (
    <section
      className={css({
        position: "relative",
        overflow: "hidden",
        bg: "light",
        borderRadius: "3xl",
        px: { base: "4", md: "10" },
        py: { base: "10", md: "14" },
        mt: "6",
      })}
    >
      <div
        className={css({
          position: "absolute",
          insetX: "-10%",
          top: "-30%",
          height: "360px",
          borderRadius: "full",
          bg: "linear-gradient(120deg, rgba(224,123,83,0.35), transparent 60%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        })}
      />
      <div
        className={css({
          position: "absolute",
          insetY: "-15%",
          right: "-20%",
          width: "420px",
          borderRadius: "full",
          bg: "linear-gradient(180deg, rgba(248,181,0,0.35), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        })}
      />
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
          <Badge variant="accent">Neues Erlebnis</Badge>
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
                  border: "1px solid",
                  borderColor: "rgba(0,0,0,0.04)",
                  padding: "4",
                  bg: "surface",
                })}
              >
                <Text size="sm" color="muted">
                  {stat.label}
                </Text>
                <Text size="lg" className={css({ fontWeight: "700" })}>
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
            <Badge variant="outline">Tageshighlight</Badge>
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
