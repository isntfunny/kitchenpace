// Pure helpers of the scheduler (no queue or processor imports, unit tested).

import { AI_SCHEDULED_JOBS } from '../../shared/ai-automation';

import type { JobPayloadSchema, QueueName } from './types';

export interface ScheduledJobDefinition {
    name: string;
    queue: QueueName;
    data: Record<string, unknown>;
    schema?: JobPayloadSchema;
    options?: {
        repeat?: {
            pattern: string;
            tz?: string;
        };
        delay?: number;
    };
}

// ── Derive job definitions from the central registry ────────────────

/**
 * Job definitions from the registry. With AI automation off (KUC-128) the
 * scheduled jobs that call OpenAI keep no repeat, so they only run by hand.
 */
export function buildScheduledJobDefinitions(
    registry: Record<string, unknown>,
    aiAutomation: boolean,
): ScheduledJobDefinition[] {
    return Object.entries(registry).map(([name, def]) => {
        const d = def as {
            queue: QueueName;
            defaultData: unknown;
            schema?: JobPayloadSchema;
            repeat?: { pattern: string; tz?: string };
        };
        const repeat = aiAutomation || !AI_SCHEDULED_JOBS.has(name) ? d.repeat : undefined;
        return {
            name,
            queue: d.queue,
            data: d.defaultData as Record<string, unknown>,
            schema: d.schema,
            options: repeat ? { repeat } : undefined,
        };
    });
}

/** Keys of repeatables whose job no longer has a repeat (removed, renamed or switched off). */
export function staleRepeatableKeys(
    repeatables: Array<{ name: string; key: string }>,
    expectedNames: ReadonlySet<string>,
): string[] {
    return repeatables.filter((rep) => !expectedNames.has(rep.name)).map((rep) => rep.key);
}
