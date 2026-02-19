"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Header } from "@/components/features/Header";

import type { Recipe, User, Activity } from "./data";

type RecipeDetailClientProps = {
  recipe: Recipe;
  author: User | null;
  recipeActivities: Activity[];
};

export function RecipeDetailClient({ recipe, author, recipeActivities }: RecipeDetailClientProps) {
  const router = useRouter();
  const [servings, setServings] = useState(recipe.servings);
  const [isSaved, setIsSaved] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const totalTime = recipe.prepTime + recipe.cookTime;

  const formatAmount = (amount: number): string => {
    const scaled = amount * (servings / recipe.servings);
    return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
  };

  const toggleStep = (stepOrder: number) => {
    setCheckedSteps((prev) =>
      prev.includes(stepOrder) ? prev.filter((step) => step !== stepOrder) : [...prev, stepOrder],
    );
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={css({ minH: "100vh", color: "text" })}>
      <Header />
      <main className={container({ maxW: "1400px", mx: "auto", px: { base: "4", md: "6" }, py: "8" })}>
        <div className={css({ mb: "8" })}>
          <div className={grid({ columns: { base: 1, lg: 2 }, gap: "8" })}>
            <div className={css({ position: "relative", borderRadius: "2xl", overflow: "hidden" })}>
              <div className={css({ aspectRatio: "4/3", position: "relative" })}>
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className={css({ objectFit: "cover" })}
                  priority
                  unoptimized={recipe.image.includes("unsplash.com")}
                />
              </div>
            </div>

            <div className={css({ display: "flex", flexDirection: "column", justifyContent: "center" })}>
              <div className={flex({ gap: "2", mb: "4", flexWrap: "wrap" })}>
                <button
                  onClick={() => handleCategoryClick(recipe.category)}
                  className={css({ cursor: "pointer", _hover: { opacity: 0.8 } })}
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
                    _hover: { bg: "#e8e2d9" },
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

              <div className={flex({ gap: "3", flexWrap: "wrap" })}>
                <Button variant={isSaved ? "secondary" : "primary"} onClick={() => setIsSaved(!isSaved)}>
                  {isSaved ? "📌 Gespeichert" : "📌 Speichern"}
                </Button>
                <Button variant="ghost" onClick={handlePrint}>
                  🖨️ Drucken
                </Button>
              </div>

              <div className={flex({ gap: "2", mt: "4", flexWrap: "wrap" })}>
                {recipe.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={css({
                      fontSize: "sm",
                      color: "primary",
                      fontFamily: "body",
                      cursor: "pointer",
                      _hover: { textDecoration: "underline" },
                    })}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={grid({ columns: { base: 1, lg: 12 }, gap: "8" })}>
          <div className={css({ lg: { gridColumn: "span 4" } })}>
            <div className={css({ bg: "white", borderRadius: "2xl", p: "6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
              <h2 className={css({ fontFamily: "heading", fontSize: "2xl", fontWeight: "600", mb: "4" })}>
                Zutaten
              </h2>

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
                      _hover: { bg: "light" },
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
                      _hover: { bg: "light" },
                    })}
                  >
                    +
                  </button>
                </div>
              </div>

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
                      fontFamily: "body",
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
                      _hover: { bg: checkedSteps.includes(step.order) ? "green.100" : "#e8e2d9" },
                    })}
                  >
                    <div
                      className={css({
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
                        fontFamily: "heading",
                      })}
                    >
                      {checkedSteps.includes(step.order) ? "✓" : step.order}
                    </div>
                    <div className={css({ flex: 1, pt: "2" })}>
                      <p
                        className={css({
                          fontFamily: "body",
                          lineHeight: "relaxed",
                          textDecoration: checkedSteps.includes(step.order) ? "line-through" : "none",
                        })}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {checkedSteps.length === recipe.steps.length && (
                <div className={css({ mt: "6", p: "4", bg: "green.50", borderRadius: "xl", textAlign: "center" })}>
                  <p className={css({ fontFamily: "heading", color: "green.700", fontSize: "lg" })}>
                    🎉 Guten Appetit! Das Rezept ist fertig.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {author && (
          <div className={css({ mt: "12" })}>
            <h2 className={css({ fontFamily: "heading", fontSize: "2xl", fontWeight: "600", mb: "6" })}>
              Über den Autor
            </h2>
            <div className={css({ bg: "white", borderRadius: "2xl", p: "6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" })}>
              <div className={flex({ gap: "6", align: "flex-start", direction: { base: "column", sm: "row" } })}>
                <Link href={`/user/${author.id}`}>
                  <div
                    className={css({
                      position: "relative",
                      width: "80px",
                      height: "80px",
                      borderRadius: "full",
                      overflow: "hidden",
                      cursor: "pointer",
                      _hover: { opacity: 0.9 },
                    })}
                  >
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      fill
                      sizes="80px"
                      className={css({ objectFit: "cover" })}
                      unoptimized={author.avatar.includes("unsplash.com")}
                    />
                  </div>
                </Link>

                <div className={css({ flex: 1 })}>
                  <div className={flex({ justify: "space-between", align: "flex-start", wrap: "wrap", gap: "4" })}>
                    <div>
                      <Link href={`/user/${author.id}`}>
                        <h3
                          className={css({
                            fontFamily: "heading",
                            fontSize: "xl",
                            fontWeight: "600",
                            cursor: "pointer",
                            _hover: { color: "primary" },
                          })}
                        >
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
                      borderRadius: "xl",
                    })}
                  >
                    <div
                      className={css({
                        position: "relative",
                        width: "48px",
                        height: "48px",
                        borderRadius: "full",
                        overflow: "hidden",
                        flexShrink: 0,
                      })}
                    >
                      <Image
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        fill
                        sizes="48px"
                        className={css({ objectFit: "cover" })}
                        unoptimized={activity.user.avatar.includes("unsplash.com")}
                      />
                    </div>
                    <div className={css({ flex: 1 })}>
                      <p className={css({ fontWeight: "600", fontFamily: "heading" })}>
                        {activity.user.name}
                      </p>
                      <p className={css({ color: "text-muted", fontFamily: "body" })}>
                        {activity.action}
                      </p>
                      {activity.content && (
                        <p className={css({ mt: "2", color: "text-muted" })}>{activity.content}</p>
                      )}
                    </div>
                    <div className={css({ fontSize: "sm", color: "text-muted", fontFamily: "body" })}>
                      {activity.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
