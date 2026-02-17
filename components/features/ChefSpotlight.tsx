"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";
import { Badge } from "../atoms/Badge";

export function ChefSpotlight() {
  return (
    <div
      className={css({
        borderRadius: "2xl",
        border: "1px solid",
        borderColor: "rgba(224,123,83,0.2)",
        p: "5",
        mb: "5",
        background: "linear-gradient(135deg, #fff5f0 0%, #fff9f7 50%, #fffcf8 100%)",
        position: "relative",
        overflow: "hidden",
      })}
    >
      <div
        className={css({
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "100px",
          height: "100px",
          borderRadius: "full",
          background: "linear-gradient(135deg, rgba(248,181,0,0.3), rgba(224,123,83,0.2))",
          filter: "blur(20px)",
        })}
      />

      <div
        className={css({
          mb: "3",
          position: "relative",
          display: "inline-flex",
          background: "linear-gradient(135deg, #f8b500 0%, #e07b53 100%)",
          borderRadius: "full",
          padding: "2px 12px",
        })}
      >
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "600",
            color: "white",
          })}
        >
          ⭐ Chef des Monats
        </span>
      </div>

      <div className={flex({ gap: "3", align: "center", mb: "3", position: "relative" })}>
        <div
          className={css({
            position: "relative",
            width: "64px",
            height: "64px",
            borderRadius: "full",
            overflow: "hidden",
            border: "3px solid",
            borderColor: "#f8b500",
            boxShadow: "0 4px 15px rgba(248,181,0,0.4)",
          })}
        >
          <Image
            src="https://images.unsplash.com/photo-1583394293214-28ez8ac94e4a?w=200&q=80"
            alt="Chef des Monats"
            fill
            className={css({ objectFit: "cover" })}
          />
        </div>
        <div>
          <Heading as="h4" size="sm" className={css({ color: "#e07b53" })}>
            Julia Weber
          </Heading>
          <Text size="sm" color="muted">
            127 Rezepte · {"⭐".repeat(5)}
          </Text>
        </div>
      </div>

      <Text
        size="sm"
        className={css({
          mb: "3",
          fontStyle: "italic",
          color: "#636e72",
          position: "relative",
        })}
      >
        &ldquo;Ich liebe es, traditionelle Gerichte mit modernen Akzenten zu
        verbinden. Mein Fokus liegt auf saisonalen Zutaten und
        nachhaltiger Küche.&rdquo;
      </Text>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "2",
          position: "relative",
        })}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={css({
              position: "relative",
              aspectRatio: "1",
              borderRadius: "lg",
              overflow: "hidden",
              border: "2px solid",
              borderColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            })}
          >
            <Image
              src={`https://images.unsplash.com/photo-${
                i === 1
                  ? "1495521821757-a1efb6729352"
                  : i === 2
                    ? "1476224203421-9ac1ecb1efc2"
                    : "1467003909585-63c6385e3d9a"
              }?w=150&q=80`}
              alt={`Rezept ${i}`}
              fill
              className={css({ objectFit: "cover" })}
            />
            <div
              className={css({
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, transparent 50%, rgba(224,123,83,0.8))",
                opacity: 0,
                _hover: {
                  opacity: 1,
                },
                transition: "opacity 200ms ease",
                display: "grid",
                placeItems: "center",
              })}
            >
              <span className={css({ color: "white", fontSize: "lg" })}>👁️</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
