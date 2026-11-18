/**
 * Central model choice for all text generation (recipe import, lane grid,
 * ingredient nutrition & shelf-life enrichment). Embeddings and moderation keep
 * their own constants because changing them would invalidate stored vectors /
 * thresholds.
 *
 * Reasoning models reject a custom `temperature` (HTTP 400: only the default is
 * supported), so no call may pass one.
 */
export const AI_TEXT_MODEL = 'gpt-6.2-sol';

/** USD per 1M tokens, from the OpenAI model page for gpt-6.2-sol. */
export const AI_TEXT_PRICING = {
    input: 2.0,
    cachedInput: 0.1,
    output: 10.0,
} as const;
