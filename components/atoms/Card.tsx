"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import * as React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const baseCardClass = css({
  bg: "white",
  borderRadius: "lg",
  overflow: "hidden",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  transition: "all 200ms ease-in-out",
  cursor: "pointer",
  _hover: {
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    transform: "translateY(-2px)",
  },
});

const combineClasses = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(" ");

export function Card({ children, className }: CardProps) {
  return <div className={combineClasses(baseCardClass, className)}>{children}</div>;
}

export function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className={css({
        position: "relative",
        aspectRatio: "16/10",
        overflow: "hidden",
      })}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className={css({
          objectFit: "cover",
        })}
      />
    </div>
  );
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={css({
        p: "4",
      })}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className={css({
        fontFamily: "heading",
        fontSize: "xl",
        fontWeight: "600",
        color: "text",
        lineHeight: "tight",
      })}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={css({
        fontFamily: "body",
        fontSize: "sm",
        color: "text-muted",
        mt: "1",
      })}
    >
      {children}
    </p>
  );
}
