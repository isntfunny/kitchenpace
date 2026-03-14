import assert from 'node:assert/strict';
import test from 'node:test';

import { initializeOAuthUserRegistration } from './oauth-user';

test('initializeOAuthUserRegistration marks OAuth users active, ensures profile, and emits one shared registration event', async () => {
    const calls: string[] = [];
    const prismaClient = {
        user: {
            update: async (input: {
                where: { id: string };
                data: { isActive: boolean; activationToken: null };
            }) => {
                calls.push('user.update');
                assert.deepEqual(input, {
                    where: { id: 'oauth-user-1' },
                    data: { isActive: true, activationToken: null },
                });
                return { id: 'oauth-user-1' };
            },
        },
    };

    const ensuredProfiles: string[] = [];
    const events: unknown[] = [];

    await initializeOAuthUserRegistration(
        {
            id: 'oauth-user-1',
            email: 'cook@example.com',
            name: 'Kitchen Cook',
        },
        {
            prismaClient,
            ensureProfile: async (userId) => {
                calls.push('ensureProfile');
                ensuredProfiles.push(userId);
                return null;
            },
            emitUserRegistered: async (payload) => {
                calls.push('emitUserRegistered');
                events.push(payload);
                return { activity: null, notification: null };
            },
        },
    );

    assert.deepEqual(calls, ['user.update', 'ensureProfile', 'emitUserRegistered']);
    assert.deepEqual(ensuredProfiles, ['oauth-user-1']);
    assert.deepEqual(events, [
        {
            event: 'userRegistered',
            actorId: 'oauth-user-1',
            recipientId: 'oauth-user-1',
            data: {
                email: 'cook@example.com',
                name: 'Kitchen Cook',
            },
        },
    ]);
});
