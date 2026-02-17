"use client";

import { css } from "styled-system/css";
import * as React from "react";

export interface RecipeTab {
  id: string;
  title: string;
  emoji: string;
}

interface RecipeTabsProps {
  initialPinned?: RecipeTab[];
  initialRecent?: RecipeTab[];
}

export function RecipeTabs({ 
  initialPinned = [], 
  initialRecent = [] 
}: RecipeTabsProps) {
  const [pinned, setPinned] = React.useState<RecipeTab[]>(initialPinned);
  const [recent, setRecent] = React.useState<RecipeTab[]>(initialRecent);

  const pinRecipe = (recipe: RecipeTab) => {
    if (pinned.length >= 3) return;
    if (pinned.find(r => r.id === recipe.id)) return;
    setPinned([...pinned, recipe]);
    setRecent(recent.filter(r => r.id !== recipe.id));
  };

  const unpinRecipe = (recipeId: string) => {
    const recipe = pinned.find(r => r.id === recipeId);
    setPinned(pinned.filter(r => r.id !== recipeId));
    if (recipe) {
      setRecent([recipe, ...recent.slice(0, 4)]);
    }
  };

  const addToRecent = (recipe: RecipeTab) => {
    setRecent([recipe, ...recent.filter(r => r.id !== recipe.id)].slice(0, 5));
  };

  return (
    <div
      className={css({
        maxW: "1400px",
        marginX: "auto",
        width: "100%",
        px: { base: "4", md: "6" },
        py: "2",
        display: "flex",
        alignItems: "center",
        gap: "3",
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkitScrollbar": {
          display: "none",
        },
      })}
    >
      <span
        className={css({
          fontSize: "xs",
          fontWeight: "600",
          color: "text-muted",
          textTransform: "uppercase",
          letterSpacing: "wide",
          flexShrink: 0,
        })}
      >
        Zuletzt
      </span>

      {pinned.map((recipe) => (
        <button
          key={recipe.id}
          onClick={() => unpinRecipe(recipe.id)}
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "2",
            px: "3",
            py: "1.5",
            borderRadius: "full",
            bg: "rgba(248,181,0,0.15)",
            border: "1px solid",
            borderColor: "rgba(248,181,0,0.3)",
            fontSize: "sm",
            fontWeight: "500",
            color: "text",
            flexShrink: 0,
            cursor: "pointer",
            transition: "all 150ms ease",
            _hover: {
              bg: "rgba(248,181,0,0.25)",
              borderColor: "#f8b500",
            },
          })}
        >
          <span>{recipe.emoji}</span>
          <span className={css({ whiteSpace: "nowrap" })}>{recipe.title}</span>
          <span
            className={css({
              fontSize: "xs",
              color: "text-muted",
              marginLeft: "1",
            })}
          >
            ×
          </span>
        </button>
      ))}

      {pinned.length > 0 && recent.length > 0 && (
        <div
          className={css({
            width: "1px",
            height: "20px",
            bg: "rgba(0,0,0,0.1)",
            flexShrink: 0,
          })}
        />
      )}

      {recent.map((recipe) => (
        <button
          key={recipe.id}
          onClick={() => pinRecipe(recipe)}
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "2",
            px: "3",
            py: "1.5",
            borderRadius: "full",
            fontSize: "sm",
            fontWeight: "400",
            color: "text-muted",
            flexShrink: 0,
            cursor: "pointer",
            transition: "all 150ms ease",
            bg: "transparent",
            border: "none",
            _hover: {
              color: "text",
              bg: "rgba(0,0,0,0.03)",
            },
          })}
        >
          <span>{recipe.emoji}</span>
          <span className={css({ whiteSpace: "nowrap" })}>{recipe.title}</span>
          <span
            className={css({
              fontSize: "xs",
              color: "text-muted",
              marginLeft: "1",
              opacity: 0,
              transition: "opacity 150ms ease",
            })}
          >
            📌
          </span>
        </button>
      ))}
    </div>
  );
}
