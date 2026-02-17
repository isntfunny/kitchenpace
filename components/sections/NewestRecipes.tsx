"use client";

import { css } from "styled-system/css";
import { grid } from "styled-system/patterns";
import { Section } from "../features/Section";
import { RecipeCard } from "../features/RecipeCard";

const newestRecipes = [
  {
    id: "1",
    title: "Mediterraner Salat",
    description: "Frischer Salat mit Feta, Oliven und Tomaten",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
    category: "Beilage",
    rating: 4.8,
    time: "20 Min.",
  },
  {
    id: "2",
    title: "Pasta al Pesto",
    description: "Hausgemachtes Pesto mit Basilikum und Pinienkernen",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80",
    category: "Hauptgericht",
    rating: 4.6,
    time: "25 Min.",
  },
  {
    id: "3",
    title: "Smoothie Bowl",
    description: "Energiegeladene Bowl mit Beeren und Superfoods",
    image: "https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&q=80",
    category: "Frühstück",
    rating: 4.9,
    time: "10 Min.",
  },
  {
    id: "4",
    title: "Grillgemüse",
    description: "Buntes Gemüse vom Grill mit Kräuteröl",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80",
    category: "Beilage",
    rating: 4.5,
    time: "30 Min.",
  },
];

export function NewestRecipes() {
  const actionClass = css({
    fontFamily: "body",
    fontSize: "sm",
    fontWeight: "500",
    color: "primary",
    letterSpacing: "wide",
    _hover: {
      color: "primary-dark",
    },
  });

  return (
    <Section
      title="Neuste Rezepte"
      description="Fein kuratierte Ideen für jede Tageszeit, mit klaren Linien und luftiger Typografie."
      action={
        <a href="#" className={actionClass}>
          Alle anzeigen →
        </a>
      }
    >
      <div
        className={grid({
          columns: { base: 1, sm: 2, md: 4 },
          gap: "6",
        })}
      >
        {newestRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </Section>
  );
}
