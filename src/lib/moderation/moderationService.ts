/**
 * Content Moderation Service
 * Uses OpenAI Moderation API (omni-moderation-latest) — free, multi-modal
 */

import { prisma } from '@shared/prisma';

import { getThreshold } from './thresholds';
import {
  ContentModerationInput,
  ModerationResult,
  ContentModerationSnapshot,
} from './types';

import { getOpenAIClient } from '@/lib/importer/openai-client';

/**
 * Moderate content using OpenAI Moderation API (free)
 * Handles text, images, or both via omni-moderation-latest
 */
export async function moderateContent(
  input: ContentModerationInput
): Promise<ModerationResult> {
  const openai = getOpenAIClient();

  // Build the moderation input array
  const moderationInput: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];

  if (input.text) {
    moderationInput.push({ type: 'text', text: input.text });
  }

  if (input.imageUrl) {
    moderationInput.push({ type: 'image_url', image_url: { url: input.imageUrl } });
  }

  if (moderationInput.length === 0) {
    // No content to moderate
    return {
      decision: 'AUTO_APPROVED',
      score: 0,
      flags: {},
      flagged: false,
      raw: null,
    };
  }

  try {
    const response = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: moderationInput as Parameters<typeof openai.moderations.create>[0]['input'],
    });

    const result = response.results[0];

    // Calculate the highest category score
    const scores = Object.values(result.category_scores as Record<string, number>);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Determine decision based on score thresholds
    const autoRejectThreshold = getThreshold('AUTO_REJECT');
    const humanReviewThreshold = getThreshold('HUMAN_REVIEW');

    let decision: 'AUTO_APPROVED' | 'PENDING' | 'REJECTED';
    if (maxScore >= autoRejectThreshold) {
      decision = 'REJECTED';
    } else if (maxScore >= humanReviewThreshold) {
      decision = 'PENDING';
    } else {
      decision = 'AUTO_APPROVED';
    }

    return {
      decision,
      score: maxScore,
      flags: result.category_scores as Record<string, number>,
      flagged: result.flagged,
      raw: response,
    };
  } catch (error) {
    console.error('Moderation API error:', error);
    // On API error, default to AUTO_APPROVED to not block users
    // In production, you might want to REJECT and alert admins instead
    return {
      decision: 'AUTO_APPROVED',
      score: 0,
      flags: {},
      flagged: false,
      raw: { error: String(error) },
    };
  }
}

/**
 * Persist moderation result to ModerationQueue if needed
 */
export async function persistModerationResult(
  contentType: string,
  contentId: string,
  authorId: string,
  result: ModerationResult,
  snapshot: ContentModerationSnapshot
): Promise<void> {
  if (result.decision === 'PENDING') {
    // Check if already queued
    const existing = await prisma.moderationQueue.findFirst({
      where: {
        contentType,
        contentId,
      },
    });

    if (existing) {
      // Update existing entry
      await prisma.moderationQueue.update({
        where: { id: existing.id },
        data: {
          aiScore: result.score,
          aiFlags: result.flags,
          aiRawResponse: result.raw,
          contentSnapshot: snapshot,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new queue entry
      await prisma.moderationQueue.create({
        data: {
          contentType,
          contentId,
          authorId,
          aiScore: result.score,
          aiFlags: result.flags,
          aiRawResponse: result.raw,
          contentSnapshot: snapshot,
          status: 'PENDING',
        },
      });
    }
  }
}

/**
 * Check if content has reached the reporting escalation threshold (3+ reports)
 * and auto-create a ModerationQueue entry if needed
 */
export async function checkReportEscalation(
  contentType: string,
  contentId: string
): Promise<boolean> {
  const reportCount = await prisma.report.count({
    where: {
      contentType,
      contentId,
      resolved: false,
    },
  });

  if (reportCount >= 3) {
    // Check if already in queue
    const existing = await prisma.moderationQueue.findFirst({
      where: {
        contentType,
        contentId,
        status: 'PENDING',
      },
    });

    if (!existing) {
      // Find the content author
      let authorId = '';
      if (contentType === 'recipe') {
        const recipe = await prisma.recipe.findUnique({
          where: { id: contentId },
          select: { authorId: true },
        });
        authorId = recipe?.authorId || '';
      } else if (contentType === 'comment') {
        const comment = await prisma.comment.findUnique({
          where: { id: contentId },
          select: { authorId: true },
        });
        authorId = comment?.authorId || '';
      }

      if (authorId) {
        await prisma.moderationQueue.create({
          data: {
            contentType,
            contentId,
            authorId,
            aiScore: 0.5, // Default escalation score
            aiFlags: { escalation: true },
            aiRawResponse: { reason: 'User reports escalation (3+ reports)' },
            status: 'PENDING',
            contentSnapshot: { contentType, contentId, authorId },
          },
        });
      }
    }

    return true;
  }

  return false;
}
