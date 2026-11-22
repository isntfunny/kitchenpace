// Prompt caching for OpenAI requests (KUC-128).
//
// From GPT-6.2 on, top-level `instructions` of the Responses API are appended
// after `input` and always billed at the uncached rate. Reusable instructions
// therefore go into a developer message at the start of `input`, ending in an
// explicit cache breakpoint. In explicit mode only the marked prefixes are
// written to the cache (write rate 1.25×, reads 0.05× on gpt-6.2-sol); the
// part that differs per request is billed at the normal rate instead of being
// written to the cache as well.
//
// A changed prefix (new ingredient, edited prompt) needs no extra step: the
// next request writes it again.

export const CACHE_BREAKPOINT = { mode: 'explicit' } as const;

/** Only the marked breakpoints are written; no implicit write of the whole request */
export const EXPLICIT_CACHE_OPTIONS = { prompt_cache_options: { mode: 'explicit' } } as const;

/**
 * Responses API `input`: cached developer instructions, then the request
 * specific user text.
 */
export function cachedResponsesInput(instructions: string, userText: string) {
    return [
        {
            role: 'developer' as const,
            content: [
                {
                    type: 'input_text' as const,
                    text: instructions,
                    prompt_cache_breakpoint: CACHE_BREAKPOINT,
                },
            ],
        },
        { role: 'user' as const, content: userText },
    ];
}

/** Chat Completions content part that ends a reusable prefix. */
export function cachedTextPart(text: string) {
    return { type: 'text' as const, text, prompt_cache_breakpoint: CACHE_BREAKPOINT };
}

/** Text of a message content (string or parts), for logs and tests. */
export function contentText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
        .map((part) =>
            part &&
            typeof part === 'object' &&
            typeof (part as { text?: unknown }).text === 'string'
                ? (part as { text: string }).text
                : '',
        )
        .join('');
}
