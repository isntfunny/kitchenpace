"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import * as React from "react";
import { Button } from "../atoms/Button";

const navLinks = ["Rezepte", "Kategorien", "Story", "Community"];

export function Header() {
  return (
    <header
      className={css({
        position: "sticky",
        top: 0,
        zIndex: 20,
        bg: "rgba(250, 249, 247, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid",
        borderColor: "rgba(0,0,0,0.05)",
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
              width: "40px",
              height: "40px",
              borderRadius: "full",
              bg: "primary",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontFamily: "heading",
              fontWeight: "700",
              fontSize: "lg",
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
            gap: { base: "3", md: "5" },
            flexWrap: "wrap",
            align: "center",
          })}
        >
          {navLinks.map((item) => (
            <a
              key={item}
              href="#"
              className={css({
                fontFamily: "body",
                fontSize: "sm",
                textTransform: "uppercase",
                letterSpacing: "wide",
                color: "text-muted",
                transition: "color 150ms ease",
                _hover: {
                  color: "primary",
                },
              })}
            >
              {item}
            </a>
          ))}
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
