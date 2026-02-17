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
    <div
      className={css({
        mb: "5",
      })}
    >
      <div className={css({ mb: "4" })}>
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
          gap: "2.5",
        })}
      >
        {trendingTags.map((item) => (
          <button
            key={item.tag}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              px: "3.5",
              py: "2",
              borderRadius: "full",
              fontSize: "sm",
              fontFamily: "body",
              fontWeight: "500",
              bg: "white",
              color: "text",
              border: "2px solid",
              borderColor: `${item.color}40`,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              _hover: {
                bg: item.color,
                color: "white",
                borderColor: item.color,
                transform: "translateY(-2px)",
                boxShadow: `0 6px 16px ${item.color}50`,
              },
              transition: "all 200ms ease",
            })}
          >
            <span>{item.tag}</span>
            <span
              className={css({
                fontSize: "0.65rem",
                bg: "rgba(0,0,0,0.08)",
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
