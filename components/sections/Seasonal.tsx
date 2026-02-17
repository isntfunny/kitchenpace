"use client";

import { grid } from "styled-system/patterns";
import { Section } from "../features/Section";
import { RecipeCard } from "../features/RecipeCard";

const seasonalRecipes = [
  {
    id: "s1",
    title: "Spargelrisotto",
    description: "Cremiges Risotto mit frischem Spargel",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80",
    category: "Hauptgericht",
    rating: 4.7,
    time: "40 Min.",
  },
  {
    id: "s2",
    title: "Erdbeertorte",
    description: "Leichte Torte mit frischen Erdbeeren",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80",
    category: "Dessert",
    rating: 4.9,
    time: "60 Min.",
  },
  {
    id: "s3",
    title: "Grüner Spargel",
    description: "Gegrillter Spargel mit Hollandaise",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
    category: "Beilage",
    rating: 4.6,
    time: "25 Min.",
  },
  {
    id: "s4",
    title: "Rhabarberkompott",
    description: "Süß-saures Kompott mit Vanille",
    image: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=400&q=80",
    category: "Dessert",
    rating: 4.5,
    time: "20 Min.",
  },
];

export function Seasonal() {
  return (
    <Section
      title="Saisonal"
      action={
        <a
          href="#"
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "0.875rem",
            color: "#e07b53",
          }}
        >
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
        {seasonalRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </Section>
  );
}
