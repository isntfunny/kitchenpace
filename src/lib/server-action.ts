// One wrapper for the server actions of plan, pantry and shopping list (KUC-137):
// session and ban check, rate limit, an optional follow-up after the work and the
// mapping of errors to a German message. Not a 'use server' module itself.
// Session and rate limit come in as dependencies (wired in `server-action.server.ts`),
// so this module stays free of Next.js and Redis and can be unit tested.
import { z } from 'zod';

import { DataAccessError } from '@app/lib/meal-plan/db';
import type { RateLimitBucket } from '@app/lib/rate-limit';

export type ActionCode =
    | 'SIGN_IN'
    | 'RATE_LIMIT'
    | 'NOT_FOUND'
    | 'INVALID'
    | 'VALIDATION'
    | 'STALE'
    | 'FAILED';

export type ActionFailure<C extends string = ActionCode> = { ok: false; code: C; error: string };

/** What the clients receive; the shape `{ ok, code, error, data }` never changes. */
export type ActionResult<T, C extends string = ActionCode> =
    | { ok: true; data: T }
    | ActionFailure<C>;

/**
 * An expected failure thrown by the work, returned as is, e.g. `STALE` when the plan
 * changed between a preview and its confirmation.
 */
export class ActionError<C extends string = ActionCode> extends Error {
    constructor(
        readonly code: C,
        message: string,
    ) {
        super(message);
        this.name = 'ActionError';
    }
}

/** Runs after the work succeeded, inside the error handling. */
export type AfterAction = (userId: string) => void | Promise<void>;

export interface ActionRunnerOptions<C extends string> {
    /** Context of the session lookup, e.g. 'meal-plan' */
    scope: string;
    rateLimit: RateLimitBucket;
    /** Log prefix for unexpected errors, e.g. '[meal-plan] action failed' */
    logLabel: string;
    /** Code for a failed input validation (zod) */
    invalidCode: C;
    /** Message for unexpected errors */
    failedMessage: string;
    /**
     * Own mapping, asked before the defaults. Return a failure, `unexpected(error)` to treat
     * the error as unexpected, or undefined to fall through to the defaults.
     */
    mapError?: (
        error: unknown,
        unexpected: (error: unknown) => ActionFailure<C>,
    ) => ActionFailure<C> | undefined;
    after?: AfterAction;
}

export type ActionRunner<C extends string> = <T>(
    work: (userId: string) => Promise<T>,
    options?: { after?: AfterAction | false },
) => Promise<ActionResult<T, C>>;

export const SIGN_IN_MESSAGE = 'Bitte melde dich an.';
export const RATE_LIMIT_MESSAGE = 'Zu viele Anfragen. Bitte warte einen Moment.';
export const INVALID_MESSAGE = 'Bitte prüfe deine Eingaben.';

/** The parts of the session the runner looks at. */
export interface ActionSession {
    user?: { id?: string | null; role?: string | null; banned?: boolean | null } | null;
}

export interface ActionRunnerDeps {
    getSession: (scope: string) => Promise<ActionSession | null>;
    checkRateLimit: (bucket: RateLimitBucket, userId: string) => Promise<{ allowed: boolean }>;
}

export function createActionRunnerWith<C extends string>(
    deps: ActionRunnerDeps,
    options: ActionRunnerOptions<C | 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'FAILED'>,
): ActionRunner<C | 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'FAILED'> {
    type Code = C | 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'FAILED';

    const unexpected = (error: unknown): ActionFailure<Code> => {
        console.error(options.logLabel, error);
        return { ok: false, code: 'FAILED', error: options.failedMessage };
    };

    const mapError = (error: unknown): ActionFailure<Code> => {
        const own = options.mapError?.(error, unexpected);
        if (own) return own;
        if (error instanceof ActionError)
            return { ok: false, code: error.code as Code, error: error.message };
        if (error instanceof z.ZodError)
            return { ok: false, code: options.invalidCode, error: INVALID_MESSAGE };
        if (error instanceof DataAccessError)
            return {
                ok: false,
                code: error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'FAILED',
                error: error.message,
            };
        return unexpected(error);
    };

    return async (work, call) => {
        try {
            const session = await deps.getSession(options.scope);
            if (!session?.user?.id || session.user.role === 'banned' || session.user.banned)
                return { ok: false, code: 'SIGN_IN', error: SIGN_IN_MESSAGE };
            const limit = await deps.checkRateLimit(options.rateLimit, session.user.id);
            if (!limit.allowed) return { ok: false, code: 'RATE_LIMIT', error: RATE_LIMIT_MESSAGE };
            const userId = session.user.id;
            const data = await work(userId);
            const after = call?.after === undefined ? options.after : call.after;
            if (after) await after(userId);
            return { ok: true, data };
        } catch (error) {
            return mapError(error);
        }
    };
}
