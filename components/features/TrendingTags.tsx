"use client";

import { css } from "styled-system/css";
import * as React from "react";
import { Heading } from "../atoms/Typography";

const trendingTags = [
  { tag: "Schnell", count: 234, color: "#e07b53" },
  { tag: "Vegetarisch", count: 189, color: "#00b894" },
  { tag: "Meal Prep", count: 156, color: "#0984e3" },
  { tag: "Low Carb", count: 142, color: "#6c5ce7" },
  { tag: "Frühling", count: 128, color: "#fdcb6e" },
  { tag: "Gesund", count: 115, color: "#00cec9" },
  { tag: "One Pot", count: 98, color: "#e17055" },
  { tag: "Nachmittag", count: 87, color: "#fd79a8" },
  { tag: "Einfach", count: 76, color: "#a29bfe" },
  { tag: "Sommer", count: 65, color: "#fab1a0" },
];

export function TrendingTags() {
  return (
    <div>
      <div className={css({ mb: "3" })}>
        <Heading
          as="h3"
          size="md"
          className={css({
            color: "primary",
          })}
        >
          Trending 🔥
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
              fontWeight: "500",
              bg: "transparent",
              color: "text",
              border: "1px solid",
              borderColor: "rgba(0,0,0,0.1)",
              cursor: "pointer",
              _hover: {
                bg: item.color,
                color: "white",
                borderColor: item.color,
              },
              transition: "all 150ms ease",
            })}
          >
            <span>{item.tag}</span>
            <span
              className={css({
                fontSize: "0.65rem",
                bg: "rgba(0,0,0,0.1)",
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
