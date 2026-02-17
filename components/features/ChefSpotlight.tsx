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
        bg: "surface",
        borderRadius: "2xl",
        border: "1px solid",
        borderColor: "rgba(0,0,0,0.05)",
        p: "5",
        mb: "5",
      })}
    >
      <div className={css({ mb: "3" })}>
        <Badge variant="accent">Chef des Monats</Badge>
      </div>

      <div className={flex({ gap: "3", align: "center", mb: "3" })}>
        <div
          className={css({
            position: "relative",
            width: "56px",
            height: "56px",
            borderRadius: "full",
            overflow: "hidden",
            border: "2px solid",
            borderColor: "primary",
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
          <Heading as="h4" size="sm">
            Julia Weber
          </Heading>
          <Text size="sm" color="muted">
            127 Rezepte · 4.9★
          </Text>
        </div>
      </div>

      <Text size="sm" color="muted" className={css({ mb: "3" })}>
        &ldquo;Ich liebe es, traditionelle Gerichte mit modernen Akzenten zu
        verbinden. Mein Fokus liegt auf saisonalen Zutaten und
        nachhaltiger Küche.&rdquo;
      </Text>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "2",
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
          </div>
        ))}
      </div>
    </div>
  );
}
