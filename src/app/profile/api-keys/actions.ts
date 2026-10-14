'use server';
import { createKeyManager } from '@app/lib/api/keys';
import { getServerAuthSession } from '@app/lib/auth';
import { auth } from '@app/lib/auth-server';
import { prisma } from '@shared/prisma';

const manager = createKeyManager(prisma, auth.api.createApiKey);
async function userId() {
    const session = await getServerAuthSession('api-key-management');
    if (!session?.user.id) throw new Error('Bitte anmelden.');
    return session.user.id;
}
export async function listApiKeys() {
    return manager.list(await userId());
}
export async function createApiKey(input: unknown) {
    return manager.create(await userId(), input);
}
export async function revokeApiKey(id: string) {
    return manager.revoke(await userId(), id);
}
export async function renameApiKey(id: string, name: string) {
    return manager.rename(await userId(), id, name);
}
