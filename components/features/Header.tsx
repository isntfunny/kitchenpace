"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "../atoms/Button";

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

export function Header() {
  return (
    <header
      className={css({
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      })}
    >
      <div
        className={css({
          maxWidth: "1200px",
          marginX: "auto",
          width: "100%",
          display: "flex",
          flexDirection: { base: "column", md: "row" },
          gap: "4",
          alignItems: { base: "flex-start", md: "center" },
          justifyContent: "space-between",
          px: { base: "4", md: "6" },
          py: "4",
        })}
      >
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "2",
          })}
        >
          <span
            className={css({
              width: "42px",
              height: "42px",
              borderRadius: "full",
              background: "linear-gradient(135deg, #e07b53 0%, #f8b500 100%)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontFamily: "heading",
              fontWeight: "700",
              fontSize: "lg",
              boxShadow: "0 4px 12px rgba(224,123,83,0.35)",
            })}
          >
            KT
          </span>
          <span
            className={css({
              fontFamily: "heading",
              fontSize: { base: "xl", md: "2xl" },
              fontWeight: "700",
              color: "text",
            })}
          >
            KüchenTakt
          </span>
        </div>
        <nav
          className={flex({
            gap: { base: "2", md: "1" },
            flexWrap: "wrap",
            align: "center",
          })}
        >
          <a
            href="#"
            className={css({
              fontFamily: "body",
              fontSize: "sm",
              fontWeight: "500",
              color: "text",
              px: "4",
              py: "2",
              borderRadius: "lg",
              transition: "all 150ms ease",
              _hover: {
                bg: "rgba(224,123,83,0.08)",
                color: "primary",
              },
            })}
          >
            Rezepte
          </a>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={css({
                  fontFamily: "body",
                  fontSize: "sm",
                  fontWeight: "500",
                  color: "text",
                  px: "4",
                  py: "2",
                  borderRadius: "lg",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "1",
                  transition: "all 150ms ease",
                  _hover: {
                    bg: "rgba(224,123,83,0.08)",
                    color: "primary",
                  },
                })}
              >
                Kategorien
                <span className={css({ fontSize: "xs" })}>▼</span>
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
                          background: "linear-gradient(135deg, rgba(224,123,83,0.08) 0%, rgba(248,181,0,0.08) 100%)",
                          transform: "translateX(2px)",
                        },
                      })}
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </DropdownMenu.Item>
                  ))}
                </div>
                <DropdownMenu.Separator
                  className={css({
                    height: "1px",
                    background: "rgba(0,0,0,0.08)",
                    margin: "2",
                  })}
                />
                <DropdownMenu.Item
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2",
                    padding: "2",
                    borderRadius: "lg",
                    cursor: "pointer",
                    fontSize: "sm",
                    fontWeight: "500",
                    color: "primary",
                    outline: "none",
                    _hover: {
                      background: "rgba(224,123,83,0.08)",
                    },
                  })}
                >
                  Alle Kategorien →
                </DropdownMenu.Item>
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
              px: "4",
              py: "2",
              borderRadius: "lg",
              transition: "all 150ms ease",
              _hover: {
                bg: "rgba(224,123,83,0.08)",
                color: "primary",
              },
            })}
          >
            Über uns
          </a>
        </nav>
        <div
          className={flex({
            gap: "3",
            align: "center",
          })}
        >
          <Button variant="ghost" size="sm">
            Einloggen
          </Button>
          <Button variant="primary" size="sm">
            Jetzt planen
          </Button>
        </div>
      </div>
    </header>
  );
}
