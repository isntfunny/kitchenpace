'use server';

import { z } from 'zod';

import { getServerAuthSession } from '@app/lib/auth';
import { checkRateLimit } from '@app/lib/rate-limit';

import { BringError } from './client';
import * as service from './service';
import type { ActionResult } from './types';

const listId = z.string().min(1).max(200);
const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(1024) });
const item = z.object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    specification: z.string().trim().max(500),
});

async function run<T>(
    work: (userId: string) => Promise<T>,
    connect = false,
): Promise<ActionResult<T>> {
    try {
        const session = await getServerAuthSession('bring');
        if (!session?.user?.id || session.user.role === 'banned' || session.user.banned)
            return { ok: false, code: 'SIGN_IN', error: 'Bitte melde dich bei KochTakt an.' };
        const limit = await checkRateLimit(connect ? 'bringConnect' : 'bring', session.user.id);
        if (!limit.allowed)
            return {
                ok: false,
                code: 'RATE_LIMIT',
                error: 'Zu viele Anfragen. Bitte warte einen Moment.',
            };
        return { ok: true, data: await work(session.user.id) };
    } catch (error) {
        if (error instanceof BringError)
            return { ok: false, code: error.code, error: error.message };
        if (error instanceof z.ZodError)
            return { ok: false, code: 'VALIDATION', error: 'Bitte prüfe deine Eingaben.' };
        return {
            ok: false,
            code: 'UNAVAILABLE',
            error: 'Die Aktion konnte nicht abgeschlossen werden. Bitte aktualisiere die Liste und versuche es erneut.',
        };
    }
}

export async function getBringStatus() {
    return run(service.connectionStatus);
}
export async function previewBringConnection(input: unknown) {
    return run(() => service.previewConnection(credentials.parse(input)), true);
}
export async function connectBring(input: unknown) {
    return run((userId) => {
        const parsed = credentials.extend({ defaultListUuid: listId }).parse(input);
        return service.connectAccount(
            userId,
            { email: parsed.email, password: parsed.password },
            parsed.defaultListUuid,
        );
    }, true);
}
export async function disconnectBring() {
    return run(service.disconnectAccount);
}
export async function getBringLists() {
    return run(service.availableLists);
}
export async function setBringDefault(input: unknown) {
    return run((userId) => service.chooseDefault(userId, listId.parse(input)));
}
export async function getBringItems(input: unknown) {
    return run((userId) => service.readList(userId, listId.parse(input)));
}
export async function changeBringItem(input: unknown) {
    return run((userId) => {
        const parsed = z
            .object({
                listUuid: listId,
                operation: z.enum(['add', 'complete', 'remove']),
                name: item.shape.name,
                specification: item.shape.specification,
                previousSpecification: z.string().max(500).optional(),
                restore: z.boolean().optional(),
            })
            .parse(input);
        return service.mutateItem(userId, parsed);
    });
}
export async function transferToBring(input: unknown) {
    return run((userId) => {
        const parsed = z
            .object({
                operationId: z.uuid(),
                listUuid: listId,
                items: z
                    .array(item)
                    .min(1)
                    .max(50)
                    .refine((items) => new Set(items.map((item) => item.id)).size === items.length),
            })
            .parse(input);
        return service.transfer(userId, parsed.operationId, parsed.listUuid, parsed.items);
    });
}

export async function createBringList(input: unknown) {
    return run((userId) => {
        const parsed = z
            .object({ operationId: z.uuid(), name: z.string().trim().min(1).max(100) })
            .parse(input);
        return service.createList(userId, parsed.operationId, parsed.name);
    });
}
