"use client";

import { css } from "styled-system/css";
import * as React from "react";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  size?: "xl" | "lg" | "md" | "sm";
}

export function Heading({
  children,
  as: Component = "h2",
  size = "lg",
  className,
  ...props
}: HeadingProps) {
  const sizeStyles = {
    xl: css.raw({ fontSize: "3xl", fontWeight: "700" }),
    lg: css.raw({ fontSize: "2xl", fontWeight: "600" }),
    md: css.raw({ fontSize: "xl", fontWeight: "600" }),
    sm: css.raw({ fontSize: "lg", fontWeight: "600" }),
  };

  const combineClasses = (...classes: Array<string | undefined>) =>
    classes.filter(Boolean).join(" ");

  return (
    <Component
      className={combineClasses(
        css({
          fontFamily: "heading",
          color: "text",
          lineHeight: "tight",
        }, sizeStyles[size]),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  color?: "default" | "muted" | "primary";
}

export function Text({ children, size = "md", color = "default", className, ...props }: TextProps) {
  const colorStyles = {
    default: css.raw({ color: "text" }),
    muted: css.raw({ color: "text-muted" }),
    primary: css.raw({ color: "primary" }),
  };

  const sizeStyles = {
    sm: css.raw({ fontSize: "sm" }),
    md: css.raw({ fontSize: "md" }),
    lg: css.raw({ fontSize: "lg" }),
  };

  const combineClasses = (...classes: Array<string | undefined>) =>
    classes.filter(Boolean).join(" ");

  return (
    <p
      className={combineClasses(
        css({
          fontFamily: "body",
          lineHeight: "relaxed",
        }, sizeStyles[size], colorStyles[color]),
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
