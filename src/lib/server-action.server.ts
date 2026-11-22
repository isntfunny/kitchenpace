// The action runner wired to the real session and rate limit (KUC-137).
import { getServerAuthSession } from '@app/lib/auth';
import { checkRateLimit } from '@app/lib/rate-limit';

import {
    createActionRunnerWith,
    type ActionRunner,
    type ActionRunnerOptions,
} from './server-action';

export {
    ActionError,
    type ActionCode,
    type ActionFailure,
    type ActionResult,
    type AfterAction,
} from './server-action';

export function createActionRunner<C extends string>(
    options: ActionRunnerOptions<C | 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'FAILED'>,
): ActionRunner<C | 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'FAILED'> {
    return createActionRunnerWith({ getSession: getServerAuthSession, checkRateLimit }, options);
}
