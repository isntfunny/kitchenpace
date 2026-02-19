"use client";

import { css } from "styled-system/css";
import * as React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const baseCardClass = css({
  borderRadius: "2xl",
  overflow: "hidden",
  transition: "transform 180ms ease",
  cursor: "pointer",
  _hover: {
    transform: "translateY(-4px)",
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
        aspectRatio: "16/10",
        overflow: "hidden",
        width: "100%",
      })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          objectFit: "cover",
          width: "100%",
          height: "100%",
        }}
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
