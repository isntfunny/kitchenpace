"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";
import { Badge } from "../atoms/Badge";

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

export function HorizontalRecipeScroll({
  recipes,
  title,
}: HorizontalRecipeScrollProps) {
  return (
    <div className={css({ mb: "8" })}>
      <Heading as="h2" size="lg" className={css({ mb: "4" })}>
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
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className={css({
              flex: "0 0 auto",
              width: "200px",
              bg: "surface",
              borderRadius: "xl",
              border: "1px solid",
              borderColor: "rgba(0,0,0,0.06)",
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 150ms ease",
              _hover: {
                transform: "translateY(-2px)",
                borderColor: "primary",
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
            </div>
            <div className={css({ p: "3" })}>
              <Badge>{recipe.category}</Badge>
              <Text
                size="sm"
                className={css({ fontWeight: "600", mt: "1.5", mb: "1" })}
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
                <span>★ {recipe.rating}</span>
                <span>{recipe.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
