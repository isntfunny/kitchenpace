"use client";

import { css } from "styled-system/css";
import * as React from "react";
import { Heading } from "../atoms/Typography";

const trendingTags = [
  { tag: "Schnell", count: 234 },
  { tag: "Vegetarisch", count: 189 },
  { tag: "Meal Prep", count: 156 },
  { tag: "Low Carb", count: 142 },
  { tag: "Frühling", count: 128 },
  { tag: "Gesund", count: 115 },
  { tag: "One Pot", count: 98 },
  { tag: "Nachmittag", count: 87 },
  { tag: "Einfach", count: 76 },
  { tag: "Sommer", count: 65 },
];

export function TrendingTags() {
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
        <Heading as="h3" size="md">
          Trending
        </Heading>
      </div>
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: "2",
        })}
      >
        {trendingTags.map((item) => (
          <button
            key={item.tag}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              px: "3",
              py: "1.5",
              borderRadius: "full",
              fontSize: "sm",
              fontFamily: "body",
              bg: "rgba(224,123,83,0.08)",
              color: "primary",
              border: "1px solid",
              borderColor: "rgba(224,123,83,0.2)",
              cursor: "pointer",
              transition: "all 150ms ease",
              _hover: {
                bg: "rgba(224,123,83,0.15)",
                borderColor: "rgba(224,123,83,0.3)",
              },
            })}
          >
            <span>{item.tag}</span>
            <span
              className={css({
                fontSize: "0.65rem",
                color: "text-muted",
                bg: "rgba(0,0,0,0.05)",
                px: "1.5",
                py: "0.5",
                borderRadius: "full",
              })}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
