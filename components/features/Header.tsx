"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import * as React from "react";

export function Header() {
  return (
    <header
      className={flex({
        justify: "space-between",
        align: "center",
        py: "4",
        px: "6",
        bg: "light",
        borderBottom: "1px solid",
        borderColor: "rgba(0,0,0,0.05)",
      })}
    >
      <div
        className={css({
          fontFamily: "heading",
          fontSize: "2xl",
          fontWeight: "700",
          color: "primary",
        })}
      >
        KüchenTakt
      </div>
      <nav
        className={flex({
          gap: "6",
        })}
      >
        {["Rezepte", "Kategorien", "Über uns"].map((item) => (
          <a
            key={item}
            href="#"
            className={css({
              fontFamily: "body",
              fontSize: "sm",
              color: "text",
              _hover: {
                color: "primary",
              },
            })}
          >
            {item}
          </a>
        ))}
      </nav>
      <button
        className={css({
          bg: "primary",
          color: "white",
          px: "4",
          py: "2",
          borderRadius: "md",
          fontFamily: "body",
          fontSize: "sm",
          fontWeight: "500",
          _hover: {
            bg: "primary-dark",
          },
        })}
      >
        Anmelden
      </button>
    </header>
  );
}
