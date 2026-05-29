'use server';

import { fireEvent } from '@app/lib/events/fire';
import type { UtmParams } from '@app/lib/hooks/useUtmParams';
import { createLogger } from '@shared/logger';

const log = createLogger('auth-register-action');

/**
 * Fires the `userRegistered` event with the marketing attribution captured in
 * the browser. Called right after a successful better-auth sign-up. The account
 * is already created at this point, so failures here are logged but never
 * surfaced to the user.
 */
export async function trackRegistration(
    userId: string,
    email: string,
    utm: UtmParams,
): Promise<void> {
    try {
        await fireEvent({
            event: 'userRegistered',
            actorId: userId,
            recipientId: userId,
            data: { email, ...utm },
        });
    } catch (error) {
        log.error('Failed to fire userRegistered event', {
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
