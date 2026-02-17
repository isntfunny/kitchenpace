"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { Heading, Text } from "../atoms/Typography";

export function DailyHighlight() {
  return (
    <section
      className={css({
        py: "4",
      })}
    >
      <div
        className={css({
          borderRadius: "2xl",
          overflow: "hidden",
        })}
      >
        <div
          className={css({
            position: "relative",
            aspectRatio: "16/9",
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
              bottom: "4",
              left: "4",
              display: "inline-flex",
              bg: "#e07b53",
              borderRadius: "full",
              padding: "4px 12px",
              fontSize: "xs",
              fontWeight: "600",
              color: "white",
            })}
          >
            🔥 Tageshighlight
          </div>
        </div>
        <div className={css({ mt: "4" })}>
          <Heading
            as="h2"
            size="lg"
            className={css({
              color: "text",
            })}
          >
            Sommerliche Quinoa-Bowl
          </Heading>
          <Text size="md" color="muted" className={css({ mt: "2", maxW: "40ch" })}>
            Ein erfrischendes Gericht mit frischem Gemüse, cremiger Avocado und einem
            Zitronen-Dressing – leicht, sonnig und bereit für dein nächstes Picknick.
          </Text>
        </div>
      </div>
    </section>
  );
}
