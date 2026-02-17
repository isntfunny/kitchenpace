"use client";

import { useState } from "react";
import { grid } from "styled-system/patterns";
import { Section } from "../features/Section";
import { RecipeCard } from "../features/RecipeCard";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../features/Select";

const timeOptions = [
  { value: "frueh", label: "Frühstück" },
  { value: "mittag", label: "Mittagessen" },
  { value: "abend", label: "Abendessen" },
  { value: "brunch", label: "Brunch" },
  { value: "fingerfood", label: "Fingerfood" },
];

const mockRecipes: Record<string, Array<{
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  time: string;
}>> = {
  frueh: [
    {
      id: "f1",
      title: "Pancakes mit Ahornsirup",
      description: "Fluffige amerikanische Pancakes",
      image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80",
      category: "Frühstück",
      rating: 4.7,
      time: "20 Min.",
    },
    {
      id: "f2",
      title: "Avocado Toast",
      description: "Knuspriges Brot mit cremiger Avocado",
      image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&q=80",
      category: "Frühstück",
      rating: 4.5,
      time: "10 Min.",
    },
  ],
  mittag: [
    {
      id: "m1",
      title: "Caesar Salad",
      description: "Klassischer Caesar mit Hähnchen",
      image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&q=80",
      category: "Hauptgericht",
      rating: 4.6,
      time: "15 Min.",
    },
    {
      id: "m2",
      title: "Lachs Bowl",
      description: "Gesunde Bowl mit geräuchertem Lachs",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
      category: "Hauptgericht",
      rating: 4.8,
      time: "20 Min.",
    },
  ],
  abend: [
    {
      id: "a1",
      title: "Kürbissuppe",
      description: "Cremige Suppe mit Ingwer",
      image: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&q=80",
      category: "Hauptgericht",
      rating: 4.7,
      time: "35 Min.",
    },
    {
      id: "a2",
      title: "Gnocchi mit Pesto",
      description: "Hausgemachte Gnocchi mit Basilikum",
      image: "https://images.unsplash.com/photo-1551183053-bf91b1dca034?w=400&q=80",
      category: "Hauptgericht",
      rating: 4.9,
      time: "45 Min.",
    },
  ],
  brunch: [
    {
      id: "b1",
      title: "Shakshuka",
      description: "Orientalische Eier in Tomatensauce",
      image: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=400&q=80",
      category: "Brunch",
      rating: 4.8,
      time: "30 Min.",
    },
    {
      id: "b2",
      title: "French Toast",
      description: "Süßer Toast mit Beeren",
      image: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80",
      category: "Brunch",
      rating: 4.6,
      time: "15 Min.",
    },
  ],
  fingerfood: [
    {
      id: "fi1",
      title: "Mini Tacos",
      description: "Kleine Tacos mit verschiedenen Füllungen",
      image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80",
      category: "Fingerfood",
      rating: 4.7,
      time: "25 Min.",
    },
    {
      id: "fi2",
      title: "Bruschetta",
      description: "Knuspriges Brot mit Tomaten-Topping",
      image: "https://images.unsplash.com/photo-1572695157365-5e9c4292882c?w=400&q=80",
      category: "Fingerfood",
      rating: 4.5,
      time: "15 Min.",
    },
  ],
};

export function FitsNow() {
  const [selectedTime, setSelectedTime] = useState("frueh");

  const recipes = mockRecipes[selectedTime] || mockRecipes.frueh;

  return (
    <Section
      title="🎯 Passt zu jetzt"
      description="Tagesgefühl trifft Rezept – sofort, schnell, perfekt abgestimmt."
      action={
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger>
            <SelectValue placeholder="Wähle eine Zeit" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div
        className={grid({
          columns: { base: 1, md: 2, xl: 3 },
          gap: "6",
        })}
      >
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </Section>
  );
}
