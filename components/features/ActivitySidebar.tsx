"use client";

import { css } from "styled-system/css";
import * as React from "react";
import { Heading, Text } from "../atoms/Typography";

interface Activity {
  id: string;
  type: "comment" | "rating" | "save" | "share";
  user: string;
  recipe: string;
  time: string;
  content?: string;
  rating?: number;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "rating",
    user: "Maria K.",
    recipe: "Spargelrisotto",
    time: "2 Min.",
    rating: 5,
  },
  {
    id: "2",
    type: "comment",
    user: "Tom H.",
    recipe: "Avocado Toast",
    time: "5 Min.",
    content: "Perfekt für Sonntagsfrühstück! 🥑",
  },
  {
    id: "3",
    type: "save",
    user: "Lisa M.",
    recipe: "Klassisches Tiramisu",
    time: "8 Min.",
  },
  {
    id: "4",
    type: "rating",
    user: "Paul S.",
    recipe: "Steak mit Gemüse",
    time: "12 Min.",
    rating: 4,
  },
  {
    id: "5",
    type: "share",
    user: "Anna B.",
    recipe: "Matcha Latte",
    time: "15 Min.",
  },
  {
    id: "6",
    type: "comment",
    user: "Felix R.",
    recipe: "Sushi Platter",
    time: "23 Min.",
    content: "Etwas knifflig, aber das Ergebnis ist fantastisch!",
  },
  {
    id: "7",
    type: "save",
    user: "Sophie W.",
    recipe: "Sommerliche Quinoa-Bowl",
    time: "31 Min.",
  },
];

const activityConfig = {
  comment: {
    icon: "💬",
    bg: "#ff7675",
    color: "white",
  },
  rating: {
    icon: "⭐",
    bg: "#f8b500",
    color: "#2d3436",
  },
  save: {
    icon: "🔖",
    bg: "#74b9ff",
    color: "white",
  },
  share: {
    icon: "📤",
    bg: "#a29bfe",
    color: "white",
  },
};

function ActivityIcon({ type }: { type: Activity["type"] }) {
  const config = activityConfig[type];
  return (
    <span
      className={css({
        fontSize: "md",
        display: "grid",
        placeItems: "center",
        width: "40px",
        height: "40px",
        borderRadius: "full",
        background: config.bg,
        color: config.color,
        flexShrink: 0,
      })}
    >
      {config.icon}
    </span>
  );
}

function ActivityText({ activity }: { activity: Activity }) {
  const actionText = {
    comment: "hat kommentiert",
    rating: "bewertete",
    save: "speicherte",
    share: "teilte",
  };

  return (
    <div>
      <Text size="sm" className={css({ fontWeight: "600", color: "text" })}>
        {activity.user}{" "}
        <span className={css({ fontWeight: "400", color: "text-muted" })}>
          {actionText[activity.type]}
        </span>
      </Text>
      <Text
        size="sm"
        className={css({
          color: "primary",
          fontWeight: "600",
        })}
      >
        {activity.recipe}
      </Text>
      {activity.content && (
        <Text size="sm" color="muted" className={css({ mt: "1", fontSize: "0.75rem" })}>
          &ldquo;{activity.content}&rdquo;
        </Text>
      )}
      {activity.rating && (
        <Text
          size="sm"
          className={css({
            mt: "1",
            fontSize: "0.75rem",
            color: "#f8b500",
          })}
        >
          {"★".repeat(activity.rating)}
          {"☆".repeat(5 - activity.rating)}
        </Text>
      )}
    </div>
  );
}

export function ActivitySidebar() {
  return (
    <aside
      className={css({
        p: "5",
        borderRadius: "2xl",
        bg: "#fffcf9",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        height: "fit-content",
        position: "sticky",
        top: "100px",
      })}
    >
      <div className={css({ mb: "4" })}>
        <Heading
          as="h3"
          size="md"
          className={css({
            color: "primary",
          })}
        >
          Aktivität 🔥
        </Heading>
        <Text size="sm" color="muted" className={css({ fontSize: "0.75rem" })}>
          Was passiert gerade in der Community
        </Text>
      </div>

      <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className={css({
              display: "flex",
              gap: "3",
              p: "3",
              borderRadius: "xl",
              _hover: {
                bg: "rgba(224,123,83,0.05)",
              },
              transition: "background 150ms ease",
            })}
          >
            <ActivityIcon type={activity.type} />
            <div className={css({ flex: 1 })}>
              <ActivityText activity={activity} />
              <Text size="sm" color="muted" className={css({ mt: "1", fontSize: "0.75rem" })}>
                {activity.time}
              </Text>
            </div>
          </div>
        ))}
      </div>

      <button
        className={css({
          width: "100%",
          mt: "4",
          py: "2.5",
          textAlign: "center",
          fontSize: "sm",
          fontWeight: "600",
          color: "white",
          background: "#e07b53",
          border: "none",
          cursor: "pointer",
          borderRadius: "xl",
          _hover: {
            background: "#c4623d",
            transform: "translateY(-2px)",
          },
          transition: "all 200ms ease",
        })}
      >
        Mehr Aktivitäten →
      </button>
    </aside>
  );
}
