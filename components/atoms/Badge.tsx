"use client";

import { css } from "styled-system/css";
import * as React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "outline";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variantStyles = {
    default: css.raw({
      bg: "primary",
      color: "white",
    }),
    accent: css.raw({
      bg: "accent",
      color: "secondary",
    }),
    outline: css.raw({
      bg: "transparent",
      color: "text",
      border: "1px solid",
      borderColor: "text-muted",
    }),
  };

  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        px: "2.5",
        py: "0.5",
        fontSize: "xs",
        fontWeight: "500",
        borderRadius: "full",
        fontFamily: "body",
      }, variantStyles[variant])}
    >
      {children}
    </span>
  );
}
