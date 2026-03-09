/**
 * Moderation score thresholds
 * OpenAI Moderation API returns category_scores from 0.0 to 1.0
 */

export const MODERATION_THRESHOLDS = {
    AUTO_REJECT: 0.85, // >= this: content blocked immediately
    HUMAN_REVIEW: 0.4, // >= this but < AUTO_REJECT: goes to mod queue
    AUTO_APPROVE: 0.4, // < this: silently approved
} as const;

/**
 * Get the moderation threshold from environment or use default
 */
export function getThreshold(key: 'AUTO_REJECT' | 'HUMAN_REVIEW'): number {
    if (key === 'AUTO_REJECT') {
        const env = process.env.MODERATION_TEXT_THRESHOLD_REJECT;
        return env ? parseFloat(env) : MODERATION_THRESHOLDS.AUTO_REJECT;
    }
    if (key === 'HUMAN_REVIEW') {
        const env = process.env.MODERATION_TEXT_THRESHOLD_REVIEW;
        return env ? parseFloat(env) : MODERATION_THRESHOLDS.HUMAN_REVIEW;
    }
    return MODERATION_THRESHOLDS.AUTO_REJECT;
}
