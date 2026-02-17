"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { flex, grid } from "styled-system/patterns";
import { Heading, Text } from "../atoms/Typography";
import { Button } from "../atoms/Button";

export function DailyHighlight() {
  return (
    <section
      className={css({
        py: "8",
      })}
    >
      <div
        className={css({
          borderRadius: "3xl",
          border: "2px solid",
          borderColor: "rgba(248,181,0,0.3)",
          padding: { base: "5", md: "7" },
          background: "linear-gradient(135deg, #fff9f0 0%, #fff5e6 50%, #fff9f7 100%)",
          position: "relative",
          overflow: "hidden",
        })}
      >
        <div
          className={css({
            position: "absolute",
            top: "-50%",
            right: "-10%",
            width: "300px",
            height: "300px",
            borderRadius: "full",
            background: "linear-gradient(135deg, rgba(248,181,0,0.2), rgba(224,123,83,0.1))",
            filter: "blur(60px)",
            pointerEvents: "none",
          })}
        />
        <div
          className={grid({
            columns: { base: 1, md: 2 },
            gap: "8",
            alignItems: "center",
            position: "relative",
          })}
        >
          <div
            className={css({
              position: "relative",
              aspectRatio: "4/3",
              borderRadius: "2xl",
              overflow: "hidden",
              border: "3px solid",
              borderColor: "white",
              boxShadow: "0 12px 40px rgba(224,123,83,0.25)",
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
                bg: "linear-gradient(180deg, transparent 40%, rgba(224,123,83,0.8))",
              })}
            />
            <div
              className={css({
                position: "absolute",
                bottom: "4",
                left: "4",
                display: "inline-flex",
                background: "linear-gradient(135deg, #f8b500 0%, #e07b53 100%)",
                borderRadius: "full",
                padding: "6px 16px",
                fontSize: "sm",
                fontWeight: "700",
                color: "white",
                boxShadow: "0 4px 12px rgba(224,123,83,0.4)",
              })}
            >
              🔥 Tageshighlight
            </div>
          </div>
          <div>
            <Heading
              as="h1"
              size="lg"
              className={css({
                color: "text",
              })}
            >
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
                🔖 Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
