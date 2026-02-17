"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { Heading } from "../atoms/Typography";
import * as React from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function Section({ title, children, action }: SectionProps) {
  return (
    <section
      className={css({
        py: "12",
      })}
    >
      <div
        className={flex({
          justify: "space-between",
          align: "center",
          mb: "6",
        })}
      >
        <Heading as="h2" size="lg">
          {title}
        </Heading>
        {action}
      </div>
      {children}
    </section>
  );
}
