"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const categories = [
  { name: "Frühstück", icon: "🍳" },
  { name: "Mittagessen", icon: "🥗" },
  { name: "Abendessen", icon: "🍽️" },
  { name: "Desserts", icon: "🍰" },
  { name: "Getränke", icon: "🥤" },
  { name: "Snacks", icon: "🥨" },
  { name: "Beilagen", icon: "🥬" },
  { name: "Backen", icon: "🥖" },
];

const pinnedRecipes = [
  { id: "1", title: "Omas Kartoffelsuppe", emoji: "🥔" },
  { id: "2", title: "Schnelles Carbonara", emoji: "🍝" },
];

const recentRecipes = [
  { id: "3", title: "Avocado-Toast", emoji: "🥑" },
  { id: "4", title: "Griechischer Salat", emoji: "🥗" },
  { id: "5", title: "Schokoladenmousse", emoji: "🍫" },
];

export function Header() {
  return (
    <header
      className={css({
        position: "sticky",
        top: 0,
        zIndex: 20,
        bg: "#fffcf9",
        boxShadow: "0 4px 20px rgba(224,123,83,0.15)",
      })}
    >
      <div
        className={css({
          maxW: "1400px",
          marginX: "auto",
          width: "100%",
          px: { base: "4", md: "6" },
          py: "3",
          borderBottom: "1px solid",
          borderColor: "rgba(0,0,0,0.05)",
        })}
      >
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "4",
              flex: "0 0 auto",
            })}
          >
            <Image
              src="/kitchenpace.png"
              alt="KüchenTakt Logo"
              width={100}
              height={39}
              className={css({
                objectFit: "contain",
              })}
            />
            <div
              className={css({
                display: { base: "none", lg: "block" },
                height: "24px",
                width: "1px",
                bg: "rgba(0,0,0,0.1)",
              })}
            />
            <div
              className={css({
                display: { base: "none", lg: "flex" },
                alignItems: "center",
                gap: "1",
                color: "text-muted",
                fontSize: "sm",
              })}
            >
              <span>🍳</span>
              <span className={css({ fontWeight: "500" })}>1.200+ Rezepte</span>
            </div>
          </div>

          <div
            className={css({
              flex: "1",
              maxW: "400px",
              display: { base: "none", md: "block" },
            })}
          >
            <div
              className={css({
                position: "relative",
              })}
            >
              <input
                type="text"
                placeholder="Was möchtest du kochen?"
                className={css({
                  width: "100%",
                  padding: "2.5",
                  paddingLeft: "10",
                  borderRadius: "full",
                  border: "1px solid",
                  borderColor: "rgba(224,123,83,0.3)",
                  background: "white",
                  fontSize: "sm",
                  fontFamily: "body",
                  outline: "none",
                  transition: "all 150ms ease",
                  _placeholder: {
                    color: "text-muted",
                  },
                  _focus: {
                    borderColor: "#e07b53",
                    boxShadow: "0 0 0 3px rgba(224,123,83,0.1)",
                  },
                })}
              />
              <span
                className={css({
                  position: "absolute",
                  right: "3",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "lg",
                  pointerEvents: "none",
                })}
              >
                🔍
              </span>
            </div>
          </div>

          <nav
            className={flex({
              gap: "1",
              align: "center",
            })}
          >
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className={css({
                    fontFamily: "body",
                    fontSize: "sm",
                    fontWeight: "500",
                    color: "text",
                    px: "3",
                    py: "2",
                    borderRadius: "lg",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5",
                    transition: "all 150ms ease",
                    _hover: {
                      bg: "rgba(224,123,83,0.08)",
                      color: "primary",
                    },
                  })}
                >
                  <span>📋</span>
                  <span className={css({ display: { base: "none", md: "inline" } })}>Kategorien</span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={css({
                    minWidth: "240px",
                    background: "white",
                    borderRadius: "xl",
                    border: "1px solid",
                    borderColor: "rgba(224,123,83,0.2)",
                    padding: "2",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
                    animation: "slideDown 200ms ease",
                    zIndex: 100,
                  })}
                  sideOffset={8}
                >
                  <div
                    className={css({
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "1",
                    })}
                  >
                    {categories.map((category) => (
                      <DropdownMenu.Item
                        key={category.name}
                        className={css({
                          display: "flex",
                          alignItems: "center",
                          gap: "2",
                          padding: "3",
                          borderRadius: "lg",
                          cursor: "pointer",
                          fontSize: "sm",
                          fontFamily: "body",
                          outline: "none",
                          transition: "all 150ms ease",
                          _hover: {
                            background: "rgba(224,123,83,0.08)",
                            transform: "translateX(2px)",
                          },
                        })}
                      >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </DropdownMenu.Item>
                    ))}
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <a
              href="#"
              className={css({
                fontFamily: "body",
                fontSize: "sm",
                fontWeight: "500",
                color: "text",
                px: "3",
                py: "2",
                borderRadius: "lg",
                display: "flex",
                alignItems: "center",
                gap: "1.5",
                transition: "all 150ms ease",
                _hover: {
                  bg: "rgba(224,123,83,0.08)",
                  color: "primary",
                },
              })}
            >
              <span>❤️</span>
              <span className={css({ display: { base: "none", md: "inline" } })}>Favoriten</span>
            </a>

            <a
              href="#"
              className={css({
                fontFamily: "body",
                fontSize: "sm",
                fontWeight: "600",
                color: "white",
                px: "4",
                py: "2",
                borderRadius: "lg",
                background: "linear-gradient(135deg, #e07b53 0%, #f8b500 100%)",
                display: "flex",
                alignItems: "center",
                gap: "1.5",
                transition: "all 150ms ease",
                _hover: {
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(224,123,83,0.3)",
                },
              })}
            >
              <span>+</span>
              <span className={css({ display: { base: "none", md: "inline" } })}>Rezept</span>
            </a>
          </nav>
        </div>
      </div>

      <div
        className={css({
          maxW: "1400px",
          marginX: "auto",
          width: "100%",
          px: { base: "4", md: "6" },
          py: "2",
          display: "flex",
          alignItems: "center",
          gap: "4",
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

        {pinnedRecipes.map((recipe) => (
          <a
            key={recipe.id}
            href="#"
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
              transition: "all 150ms ease",
              cursor: "pointer",
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
          </a>
        ))}

        <div
          className={css({
            width: "1px",
            height: "20px",
            bg: "rgba(0,0,0,0.1)",
            flexShrink: 0,
          })}
        />

        {recentRecipes.map((recipe) => (
          <a
            key={recipe.id}
            href="#"
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
              transition: "all 150ms ease",
              cursor: "pointer",
              _hover: {
                color: "text",
                bg: "rgba(0,0,0,0.03)",
              },
            })}
          >
            <span>{recipe.emoji}</span>
            <span className={css({ whiteSpace: "nowrap" })}>{recipe.title}</span>
          </a>
        ))}
      </div>
    </header>
  );
}
