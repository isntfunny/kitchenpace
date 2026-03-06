/**
 * Shared types for the content moderation system
 */

export interface ContentModerationInput {
  text?: string;       // recipe text, comment, bio, etc.
  imageUrl?: string;   // S3 URL for image moderation
}

export interface ModerationResult {
  decision: 'AUTO_APPROVED' | 'PENDING' | 'REJECTED';
  score: number;                    // highest category_score across all categories
  flags: Record<string, number>;    // raw category_scores from OpenAI API
  flagged: boolean;                 // OpenAI's own flagged boolean
  raw: unknown;                     // full API response
}

export interface ContentModerationSnapshot {
  contentType: string;              // "recipe" | "comment" | "profile" | "cook_image"
  contentId: string;
  authorId: string;
  title?: string;
  description?: string;
  text?: string;
  imageUrl?: string;
  label?: string;
}
