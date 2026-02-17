"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import * as React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const baseCardClass = css({
  bg: "surface",
  borderRadius: "2xl",
  overflow: "hidden",
  border: "1px solid",
  borderColor: "rgba(0,0,0,0.06)",
  transition: "border-color 180ms ease",
  cursor: "pointer",
  _hover: {
    borderColor: "primary",
  },
});

const combineClasses = (...classes: Array<string | undefined | unknown>) =>
  classes
    .filter((cls): cls is string => typeof cls === "string" && cls.length > 0)
    .join(" ");

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
