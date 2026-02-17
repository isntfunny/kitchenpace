"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { Heading, Text } from "../atoms/Typography";
import * as React from "react";

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "soft";
}

export function Section({
  title,
  description,
  children,
  action,
  variant = "default",
}: SectionProps) {
  return (
    <section
      className={css({
        py: "12",
        borderTop: variant === "soft" ? "1px solid" : undefined,
        borderColor: variant === "soft" ? "rgba(0,0,0,0.04)" : undefined,
      })}
    >
      <div
        className={flex({
          direction: { base: "column", md: "row" },
          justify: "space-between",
          align: "flex-start",
          gap: "3",
          mb: "6",
        })}
      >
        <div>
          <Heading as="h2" size="lg">
            {title}
          </Heading>
          {description && (
            <Text size="sm" color="muted" className={css({ maxW: "32ch", mt: "1" })}>
              {description}
            </Text>
          )}
        </div>
        {action && (
          <div className={css({ marginLeft: "auto", mt: { base: "2", md: "0" } })}>
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
