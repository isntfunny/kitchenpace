"use client";

import { css } from "styled-system/css";
import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: css.raw({
      bg: "primary",
      color: "white",
      _hover: {
        bg: "primary-dark",
      },
    }),
    secondary: css.raw({
      bg: "secondary",
      color: "white",
      _hover: {
        opacity: 0.9,
      },
    }),
    ghost: css.raw({
      bg: "transparent",
      color: "text",
      _hover: {
        bg: "light",
      },
    }),
  };

  const sizeStyles = {
    sm: css.raw({
      px: "3",
      py: "1.5",
      fontSize: "sm",
    }),
    md: css.raw({
      px: "4",
      py: "2",
      fontSize: "md",
    }),
    lg: css.raw({
      px: "6",
      py: "3",
      fontSize: "lg",
    }),
  };

  return (
    <button
      className={css({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2",
        fontWeight: "500",
        fontFamily: "body",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
        borderRadius: "md",
        _disabled: {
          opacity: 0.5,
          cursor: "not-allowed",
        },
      }, variantStyles[variant], sizeStyles[size])}
      {...props}
    >
      {children}
    </button>
  );
}
