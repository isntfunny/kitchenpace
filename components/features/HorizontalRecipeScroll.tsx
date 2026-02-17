"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

interface Recipe {
  id: string;
  title: string;
  category: string;
  rating: number;
  time: string;
  image: string;
}

interface HorizontalRecipeScrollProps {
  recipes: Recipe[];
  title: string;
}

const categoryColors: Record<string, string> = {
  Hauptgericht: "#e07b53",
  Beilage: "#00b894",
  Dessert: "#fd79a8",
  Frühstück: "#fdcb6e",
  Getränk: "#74b9ff",
  Vorspeise: "#a29bfe",
  Fingerfood: "#e17055",
  Brunch: "#fab1a0",
};

export function HorizontalRecipeScroll({
  recipes,
  title,
}: HorizontalRecipeScrollProps) {
  return (
    <div className={css({ p: "5", borderRadius: "2xl", bg: "#fffcf9", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
      <Heading
        as="h2"
        size="lg"
        className={css({
          mb: "4",
          color: "text",
        })}
      >
        {title}
      </Heading>

      <div
        className={css({
          display: "flex",
          gap: "4",
          overflowX: "auto",
          pb: "2",
          scrollbarWidth: "thin",
        })}
      >
        {recipes.map((recipe) => {
          const categoryColor = categoryColors[recipe.category] || "#e07b53";
          return (
            <div
              key={recipe.id}
              className={css({
                flex: "0 0 auto",
                width: "200px",
                bg: "surface",
                borderRadius: "xl",
                border: "2px solid",
                borderColor: "rgba(0,0,0,0.06)",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 200ms ease",
                _hover: {
                  transform: "translateY(-4px)",
                  borderColor: categoryColor,
                  boxShadow: `0 12px 28px ${categoryColor}30`,
                },
              })}
            >
              <div
                className={css({
                  position: "relative",
                  aspectRatio: "16/10",
                })}
              >
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  fill
                  className={css({ objectFit: "cover" })}
                />
                <div
                  className={css({
                    position: "absolute",
                    top: "2",
                    left: "2",
                    background: categoryColor,
                    color: "white",
                    padding: "2px 10px",
                    borderRadius: "full",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "wide",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  })}
                >
                  {recipe.category}
                </div>
              </div>
              <div className={css({ p: "3" })}>
                <Text
                  size="sm"
                  className={css({ fontWeight: "600", mb: "1" })}
                >
                  {recipe.title}
                </Text>
                <div
                  className={css({
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: "text-muted",
                  })}
                >
                  <span className={css({ color: "#f8b500" })}>
                    {"★".repeat(Math.floor(recipe.rating))}
                    {"☆".repeat(5 - Math.floor(recipe.rating))}
                  </span>
                  <span>{recipe.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
