"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { flex, grid } from "styled-system/patterns";
import { Heading, Text } from "../atoms/Typography";
import { Badge } from "../atoms/Badge";

export function DailyHighlight() {
  return (
    <section
      className={css({
        py: "12",
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
            borderRadius: "xl",
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
        </div>
        <div>
          <Badge variant="accent">Tageshighlight</Badge>
          <Heading as="h1" size="xl" className={css({ mt: "4" })}>
            Sommerliche Quinoa-Bowl
          </Heading>
          <Text size="lg" color="muted" className={css({ mt: "3" })}>
            Ein erfrischendes und gesundes Gericht, perfekt für warme Sommertage. 
            Mit frischem Gemüse, cremigem Avocado und einem Zitronen-Dressing.
          </Text>
          <div
            className={flex({
              gap: "3",
              mt: "6",
            })}
          >
            <button
              className={css({
                bg: "primary",
                color: "white",
                px: "6",
                py: "3",
                borderRadius: "md",
                fontFamily: "body",
                fontWeight: "500",
                _hover: {
                  bg: "primary-dark",
                },
              })}
            >
              Rezept ansehen
            </button>
            <button
              className={css({
                bg: "transparent",
                color: "text",
                px: "6",
                py: "3",
                borderRadius: "md",
                fontFamily: "body",
                fontWeight: "500",
                border: "1px solid",
                borderColor: "rgba(0,0,0,0.2)",
                _hover: {
                  bg: "light",
                },
              })}
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
