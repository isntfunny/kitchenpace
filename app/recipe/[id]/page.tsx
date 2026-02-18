"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";


interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

interface Step {
  order: number;
  description: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  recipeCount: number;
  followerCount: number;
}

interface Activity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  timestamp: string;
  content?: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Einfach" | "Mittel" | "Schwer";
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  authorId: string;
}

const users: Record<string, User> = {
  "user-1": {
    id: "user-1",
    name: "Maria Rossi",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    bio: "Passionierte Hobbyköchin aus Italien. Ich liebe es, traditionelle Familienrezepte zu teilen.",
    recipeCount: 47,
    followerCount: 1234,
  },
  "user-2": {
    id: "user-2",
    name: "Alex Koch",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "Koch mit Leidenschaft für mediterrane Küche. Gesund und lecker ist mein Motto!",
    recipeCount: 23,
    followerCount: 567,
  },
};

const activities: Record<string, Activity[]> = {
  "pasta-aglio": [
    {
      id: "act-1",
      user: { name: "Lisa M.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
      action: "hat das Rezept ausprobiert",
      timestamp: "Vor 2 Stunden",
      content: "Super einfach und lecker! Meine Familie war begeistert.",
    },
    {
      id: "act-2",
      user: { name: "Thomas B.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
      action: "hat das Rezept gespeichert",
      timestamp: "Vor 5 Stunden",
    },
    {
      id: "act-3",
      user: { name: "Sarah K.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" },
      action: "hat ein Foto hochgeladen",
      timestamp: "Gestern",
    },
    {
      id: "act-4",
      user: { name: "Mike R.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" },
      action: "hat 5 Sterne gegeben",
      timestamp: "Vor 2 Tagen",
    },
  ],
  "greek-salad": [
    {
      id: "act-1",
      user: { name: "Anna S.", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80" },
      action: "hat das Rezept ausprobiert",
      timestamp: "Vor 1 Stunde",
      content: "Perfekt für den Sommer! Sehr erfrischend.",
    },
    {
      id: "act-2",
      user: { name: "Peter W.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" },
      action: "hat das Rezept geteilt",
      timestamp: "Vor 3 Stunden",
    },
  ],
};

const recipes: Record<string, Recipe> = {
  "pasta-aglio": {
    id: "pasta-aglio",
    title: "Pasta Aglio e Olio",
    description: "Ein klassisches italienisches Gericht mit Knoblauch, Olivenöl und Chili. Schnell, einfach und unglaublich lecker.",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80",
    category: "Hauptgericht",
    rating: 4.8,
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: "Einfach",
    authorId: "user-1",
    ingredients: [
      { name: "Spaghetti", amount: 200, unit: "g" },
      { name: "Knoblauchzehen", amount: 4, unit: "Stück" },
      { name: "Olivenöl", amount: 60, unit: "ml" },
      { name: "Chiliflocken", amount: 0.5, unit: "TL" },
      { name: "Petersilie", amount: 2, unit: "EL" },
      { name: "Parmesan", amount: 30, unit: "g" },
      { name: "Salz", amount: 1, unit: "Prise" },
    ],
    steps: [
      { order: 1, description: "Wasser in einem großen Topf zum Kochen bringen und salzen." },
      { order: 2, description: "Spaghetti nach Packungsanweisung al dente kochen." },
      { order: 3, description: "Währenddessen Knoblauch in dünne Scheiben schneiden." },
      { order: 4, description: "Olivenöl in einer großen Pfanne erhitzen, Knoblauch und Chili hinzufügen." },
      { order: 5, description: "Bei mittlerer Hitze goldbraun anbraten (nicht verbrennen lassen)." },
      { order: 6, description: "Gekochte Pasta mit etwas Nudelwasser zur Pfanne geben und gut vermengen." },
      { order: 7, description: "Mit gehackter Petersilie und Parmesan servieren." },
    ],
    tags: ["Italienisch", "Schnell", "Vegetarisch"],
  },
  "greek-salad": {
    id: "greek-salad",
    title: "Griechischer Salat",
    description: "Frischer mediterraner Salat mit Tomaten, Gurken, Oliven und Feta.",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
    category: "Beilage",
    rating: 4.7,
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    difficulty: "Einfach",
    authorId: "user-2",
    ingredients: [
      { name: "Tomaten", amount: 4, unit: "Stück" },
      { name: "Gurke", amount: 1, unit: "Stück" },
      { name: "Rote Zwiebel", amount: 1, unit: "Stück" },
      { name: "Feta", amount: 200, unit: "g" },
      { name: "Schwarze Oliven", amount: 100, unit: "g" },
      { name: "Olivenöl", amount: 3, unit: "EL" },
      { name: "Oregano", amount: 1, unit: "TL" },
    ],
    steps: [
      { order: 1, description: "Tomaten in große Würfel schneiden." },
      { order: 2, description: "Gurke in Scheiben, Zwiebel in Ringe schneiden." },
      { order: 3, description: "Alle Gemüse in eine große Schüssel geben." },
      { order: 4, description: "Feta in Würfel schneiden und darüber verteilen." },
      { order: 5, description: "Oliven hinzufügen und alles vermischen." },
      { order: 6, description: "Mit Olivenöl und Oregano dressen." },
    ],
    tags: ["Mediterran", "Gesund", "Vegetarisch"],
  },
};

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;
  const recipe = recipes[recipeId];
  const author = recipe ? users[recipe.authorId] : null;
  const recipeActivities = recipe ? activities[recipeId] || [] : [];
  
  const [servings, setServings] = useState(recipe?.servings || 2);
  const [isSaved, setIsSaved] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  if (!recipe) {
    return (
      <div className={css({ minH: "100vh", color: "text" })}>
        <main className={container({ maxW: "1400px", mx: "auto", px: "4", py: "8" })}>
          <div className={css({ textAlign: "center", py: "20" })}>
            <h1 className={css({ fontFamily: "heading", fontSize: "3xl", mb: "4" })}>
              Rezept nicht gefunden
            </h1>
            <p className={css({ color: "text-muted" })}>
              Das gesuchte Rezept existiert leider nicht.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const scaleFactor = servings / recipe.servings;

  const formatAmount = (amount: number): string => {
    const scaled = amount * scaleFactor;
    return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
  };

  const toggleStep = (stepOrder: number) => {
    setCheckedSteps(prev => 
      prev.includes(stepOrder) 
        ? prev.filter(s => s !== stepOrder)
        : [...prev, stepOrder]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTagClick = (tag: string) => {
    router.push(`/?tag=${encodeURIComponent(tag)}`);
  };

  const handleCategoryClick = (category: string) => {
    router.push(`/?category=${encodeURIComponent(category)}`);
  };

  const handleDifficultyClick = (difficulty: string) => {
    router.push(`/?difficulty=${encodeURIComponent(difficulty)}`);
  };

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <div className={css({ minH: "100vh", color: "text" })}>
      <main className={container({ maxW: "1400px", mx: "auto", px: { base: "4", md: "6" }, py: "8" })}>
        {/* Hero Section */}
        <div className={css({ mb: "8" })}>
          <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
            {/* Image */}
            <div className={css({ position: "relative", borderRadius: "2xl", overflow: "hidden" })}>
              <div className={css({ aspectRatio: "4/3", position: "relative" })}>
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className={css({ objectFit: "cover" })}
                  priority
                />
              </div>
            </div>

            {/* Info */}
            <div className={css({ display: "flex", flexDirection: "column", justifyContent: "center" })}>
              <div className={flex({ gap: "2", mb: "4", flexWrap: "wrap" })}>
                <button
                  onClick={() => handleCategoryClick(recipe.category)}
                  className={css({ 
                    cursor: "pointer",
                    _hover: { opacity: 0.8 }
                  })}
                >
                  <Badge>{recipe.category}</Badge>
                </button>
                <button
                  onClick={() => handleDifficultyClick(recipe.difficulty)}
                  className={css({ 
                    px: "3", 
                    py: "1", 
                    bg: "light", 
                    borderRadius: "full",
                    fontSize: "sm",
                    fontFamily: "body",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    _hover: { bg: "#e8e2d9" }
                  })}
                >
                  {recipe.difficulty}
                </button>
              </div>

              <h1 className={css({ fontFamily: "heading", fontSize: "4xl", fontWeight: "700", mb: "4" })}>
                {recipe.title}
              </h1>

              <p className={css({ fontFamily: "body", color: "text-muted", mb: "6", lineHeight: "relaxed" })}>
                {recipe.description}
              </p>

              {/* Time & Rating */}
              <div className={grid({ columns: 3, gap: "4", mb: "6" })}>
                <div className={css({ textAlign: "center", p: "4", bg: "light", borderRadius: "xl" })}>
                  <div className={css({ fontSize: "2xl", mb: "1" })}>⏱️</div>
                  <div className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>Gesamt</div>
                  <div className={css({ fontWeight: "600", fontFamily: "heading" })}>{totalTime} Min.</div>
                </div>
                <div className={css({ textAlign: "center", p: "4", bg: "light", borderRadius: "xl" })}>
                  <div className={css({ fontSize: "2xl", mb: "1" })}>👨‍🍳</div>
                  <div className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>Arbeit</div>
                  <div className={css({ fontWeight: "600", fontFamily: "heading" })}>{recipe.prepTime} Min.</div>
                </div>
                <div className={css({ textAlign: "center", p: "4", bg: "light", borderRadius: "xl" })}>
                  <div className={css({ fontSize: "2xl", mb: "1" })}>🔥</div>
                  <div className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>Kochen</div>
                  <div className={css({ fontWeight: "600", fontFamily: "heading" })}>{recipe.cookTime} Min.</div>
                </div>
              </div>

              {/* Actions */}
              <div className={flex({ gap: "3", flexWrap: "wrap" })}>
                <Button
                  variant={isSaved ? "secondary" : "primary"}
                  onClick={() => setIsSaved(!isSaved)}
                >
                  {isSaved ? "📌 Gespeichert" : "📌 Speichern"}
                </Button>
                <Button variant="ghost" onClick={handlePrint}>
                  🖨️ Drucken
                </Button>
              </div>

              {/* Tags */}
              <div className={flex({ gap: "2", mt: "4", flexWrap: "wrap" })}>
                {recipe.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={css({ 
                      fontSize: "sm", 
                      color: "primary",
                      fontFamily: "body",
                      cursor: "pointer",
                      _hover: { textDecoration: "underline" }
                    })}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className={grid({ columns: { base: 1, lg: 12 }, gap: "8" })}>
          {/* Ingredients */}
          <div className={css({ lg: { gridColumn: "span 4" } })}>
            <div className={css({ bg: "white", borderRadius: "2xl", p: "6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
              <h2 className={css({ fontFamily: "heading", fontSize: "2xl", fontWeight: "600", mb: "4" })}>
                Zutaten
              </h2>

              {/* Portion Scaler */}
              <div className={css({ mb: "6", p: "4", bg: "light", borderRadius: "xl" })}>
                <label className={css({ display: "block", fontSize: "sm", color: "text-muted", mb: "2", fontFamily: "body" })}>
                  Portionen
                </label>
                <div className={flex({ gap: "2", align: "center" })}>
                  <button
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className={css({
                      w: "10",
                      h: "10",
                      borderRadius: "full",
                      bg: "white",
                      border: "1px solid",
                      borderColor: "border",
                      cursor: "pointer",
                      fontSize: "xl",
                      _hover: { bg: "light" }
                    })}
                  >
                    −
                  </button>
                  <span className={css({ fontSize: "xl", fontWeight: "600", minW: "12", textAlign: "center", fontFamily: "heading" })}>
                    {servings}
                  </span>
                  <button
                    onClick={() => setServings(servings + 1)}
                    className={css({
                      w: "10",
                      h: "10",
                      borderRadius: "full",
                      bg: "white",
                      border: "1px solid",
                      borderColor: "border",
                      cursor: "pointer",
                      fontSize: "xl",
                      _hover: { bg: "light" }
                    })}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Ingredients List */}
              <ul className={css({ spaceY: "3" })}>
                {recipe.ingredients.map((ingredient, index) => (
                  <li 
                    key={index}
                    className={flex({ 
                      justify: "space-between", 
                      align: "center",
                      p: "3",
                      bg: "light",
                      borderRadius: "lg",
                      fontFamily: "body"
                    })}
                  >
                    <span className={css({ fontWeight: "500" })}>{ingredient.name}</span>
                    <span className={css({ color: "text-muted" })}>
                      {formatAmount(ingredient.amount)} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className={css({ lg: { gridColumn: "span 8" } })}>
            <div className={css({ bg: "white", borderRadius: "2xl", p: "6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
              <h2 className={css({ fontFamily: "heading", fontSize: "2xl", fontWeight: "600", mb: "4" })}>
                Zubereitung
              </h2>

              <div className={css({ spaceY: "4" })}>
                {recipe.steps.map((step) => (
                  <div
                    key={step.order}
                    onClick={() => toggleStep(step.order)}
                    className={css({
                      display: "flex",
                      gap: "4",
                      p: "4",
                      borderRadius: "xl",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      bg: checkedSteps.includes(step.order) ? "green.50" : "light",
                      opacity: checkedSteps.includes(step.order) ? 0.7 : 1,
                      _hover: { bg: checkedSteps.includes(step.order) ? "green.100" : "#e8e2d9" }
                    })}
                  >
                    <div className={css({
                      w: "10",
                      h: "10",
                      borderRadius: "full",
                      bg: checkedSteps.includes(step.order) ? "green.500" : "primary",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "600",
                      flexShrink: 0,
                      fontFamily: "heading"
                    })}>
                      {checkedSteps.includes(step.order) ? "✓" : step.order}
                    </div>
                    <div className={css({ flex: 1, pt: "2" })}>
                      <p className={css({ 
                        fontFamily: "body", 
                        lineHeight: "relaxed",
                        textDecoration: checkedSteps.includes(step.order) ? "line-through" : "none"
                      })}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {checkedSteps.length === recipe.steps.length && (
                <div className={css({ 
                  mt: "6", 
                  p: "4", 
                  bg: "green.50", 
                  borderRadius: "xl",
                  textAlign: "center"
                })}>
                  <p className={css({ fontFamily: "heading", color: "green.700", fontSize: "lg" })}>
                    🎉 Guten Appetit! Das Rezept ist fertig.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Author Profile Section */}
        {author && (
          <div className={css({ mt: "12" })}>
            <h2 className={css({ fontFamily: "heading", fontSize: "2xl", fontWeight: "600", mb: "6" })}>
              Über den Autor
            </h2>
            <div className={css({ bg: "white", borderRadius: "2xl", p: "6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
              <div className={flex({ gap: "6", align: "flex-start", direction: { base: "column", sm: "row" } })}>
                <Link href={`/user/${author.id}`}>
                  <div className={css({ 
                    position: "relative", 
                    w: "20", 
                    h: "20", 
                    borderRadius: "full", 
                    overflow: "hidden",
                    cursor: "pointer",
                    _hover: { opacity: 0.9 }
                  })}>
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      fill
                      sizes="80px"
                      className={css({ objectFit: "cover" })}
                    />
                  </div>
                </Link>
                
                <div className={css({ flex: 1 })}>
                  <div className={flex({ justify: "space-between", align: "flex-start", wrap: "wrap", gap: "4" })}>
                    <div>
                      <Link href={`/user/${author.id}`}>
                        <h3 className={css({ 
                          fontFamily: "heading", 
                          fontSize: "xl", 
                          fontWeight: "600",
                          cursor: "pointer",
                          _hover: { color: "primary" }
                        })}>
                          {author.name}
                        </h3>
                      </Link>
                      <p className={css({ fontFamily: "body", color: "text-muted", mt: "2", maxW: "600px" })}>
                        {author.bio}
                      </p>
                    </div>
                    
                    <Button
                      variant={isFollowing ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => setIsFollowing(!isFollowing)}
                    >
                      {isFollowing ? "✓ Folgst du" : "+ Folgen"}
                    </Button>
                  </div>
                  
                  <div className={flex({ gap: "6", mt: "4" })}>
                    <div className={css({ textAlign: "center" })}>
                      <div className={css({ fontFamily: "heading", fontWeight: "600", fontSize: "lg" })}>
                        {author.recipeCount}
                      </div>
                      <div className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>
                        Rezepte
                      </div>
                    </div>
                    <div className={css({ textAlign: "center" })}>
                      <div className={css({ fontFamily: "heading", fontWeight: "600", fontSize: "lg" })}>
                        {author.followerCount.toLocaleString()}
                      </div>
                      <div className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>
                        Follower
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed Section */}
        {recipeActivities.length > 0 && (
          <div className={css({ mt: "12" })}>
            <h2 className={css({ fontFamily: "heading", fontSize: "2xl", fontWeight: "600", mb: "6" })}>
              Aktivitäten
            </h2>
            <div className={css({ bg: "white", borderRadius: "2xl", p: "6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
              <div className={css({ spaceY: "4" })}>
                {recipeActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={flex({ 
                      gap: "4", 
                      align: "flex-start",
                      p: "4",
                      bg: "light",
                      borderRadius: "xl"
                    })}
                  >
                    <div className={css({ 
                      position: "relative", 
                      w: "12", 
                      h: "12", 
                      borderRadius: "full", 
                      overflow: "hidden",
                      flexShrink: 0
                    })}>
                      <Image
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        fill
                        sizes="48px"
                        className={css({ objectFit: "cover" })}
                      />
                    </div>
                    
                    <div className={css({ flex: 1 })}>
                      <div className={flex({ gap: "2", align: "baseline", wrap: "wrap" })}>
                        <span className={css({ fontFamily: "heading", fontWeight: "600" })}>
                          {activity.user.name}
                        </span>
                        <span className={css({ fontFamily: "body", color: "text-muted" })}>
                          {activity.action}
                        </span>
                        <span className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>
                          • {activity.timestamp}
                        </span>
                      </div>
                      
                      {activity.content && (
                        <p className={css({ 
                          fontFamily: "body", 
                          mt: "2",
                          p: "3",
                          bg: "white",
                          borderRadius: "lg",
                          fontStyle: "italic"
                        })}>
                          "{activity.content}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={css({ textAlign: "center", mt: "6" })}>
                <Button variant="ghost" size="sm">
                  Alle Aktivitäten anzeigen
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={css({
          py: "8",
          mt: "8",
          textAlign: "center",
          fontFamily: "body",
          fontSize: "sm",
          color: "text-muted",
          bg: "#fffcf9",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.04)",
        })}
      >
        <div
          className={css({
            maxWidth: "600px",
            margin: "0 auto",
            padding: "0 4",
          })}
        >
          <div
            className={css({
              fontSize: "2xl",
              marginBottom: "3",
            })}
          >
            🍳
          </div>
          <div
            className={css({
              fontWeight: "600",
              color: "text",
              marginBottom: "2",
            })}
          >
            KüchenTakt
          </div>
          <div>
            © 2026 KüchenTakt · Produkte mit Gefühl entdecken
          </div>
        </div>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          nav, header, button, footer {
            display: none !important;
          }
          
          main {
            padding: 0 !important;
          }
          
          * {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          
          img {
            max-width: 400px;
          }
          
          .print-break {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
