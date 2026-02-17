"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { flex, grid } from "styled-system/patterns";
import { Heading, Text } from "../atoms/Typography";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";

export function DailyHighlight() {
  return (
    <section
      className={css({
        py: "12",
      })}
    >
      <div
        className={css({
          borderRadius: "3xl",
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.05)",
          padding: { base: "6", md: "8" },
          background: "surface",
        })}
      >
        <div
          className={grid({
            columns: { base: 1, md: 2 },
            gap: "8",
            alignItems: "center",
          })}
        >
          <div
            className={css({
              position: "relative",
              aspectRatio: "4/3",
              borderRadius: "2xl",
              overflow: "hidden",
            })}
          >
            <Image
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"
              alt="Daily Highlight"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className={css({ objectFit: "cover" })}
            />
            <div
              className={css({
                position: "absolute",
                inset: 0,
                bg: "linear-gradient(180deg, rgba(224,123,83,0.1), rgba(0,0,0,0.6))",
              })}
            />
          </div>
          <div>
            <Badge variant="accent">Tageshighlight</Badge>
            <Heading as="h1" size="lg" className={css({ mt: "4" })}>
              Sommerliche Quinoa-Bowl
            </Heading>
            <Text size="lg" color="muted" className={css({ mt: "3", maxW: "40ch" })}>
              Ein erfrischendes Gericht mit frischem Gemüse, cremiger Avocado und einem
              Zitronen-Dressing – leicht, sonnig und bereit für dein nächstes Picknick.
            </Text>
            <div
              className={flex({
                gap: "3",
                mt: "6",
                flexWrap: "wrap",
              })}
            >
              <Button variant="primary" size="md">
                Rezept ansehen
              </Button>
              <Button variant="ghost" size="md">
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
