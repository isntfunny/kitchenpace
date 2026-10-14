import 'server-only';

import { createHash } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@shared/prisma';

import { loadCatalog } from './catalog';
import { BringClient, BringError } from './client';
import { decryptCredentials, encryptCredentials } from './crypto';
import { resolveCatalogItem } from './items';
import { requireList, transferItems } from './transfer';
import type {
    BringCredentials,
    BringItems,
    BringOperation,
    TransferItem,
    TransferOutcome,
} from './types';

/** Serialize account changes and writes across app processes, not just within one Node process. */
async function locked<T>(
    userId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    return prisma.$transaction(
        async (tx) => {
            const [lock] = await tx.$queryRaw<
                { acquired: boolean }[]
            >`SELECT pg_try_advisory_xact_lock(hashtextextended(${`bring:${userId}`}, 0)) AS acquired`;
            if (!lock.acquired)
                throw new BringError(
                    'CONFLICT',
                    'Eine Bring!-Aktion läuft noch. Bitte warte kurz und versuche es erneut.',
                );
            return work(tx);
        },
        { timeout: 90_000, maxWait: 5000 },
    );
}

async function connected(userId: string, db: Prisma.TransactionClient = prisma) {
    const connection = await db.bringConnection.findUnique({ where: { userId } });
    if (!connection) throw new BringError('AUTH', 'Bitte verbinde zuerst dein Bring!-Konto.');
    const client = await BringClient.login(decryptCredentials(userId, connection.credentials));
    return { client, connection };
}

export async function connectionStatus(userId: string) {
    const connection = await prisma.bringConnection.findUnique({
        where: { userId },
        select: { defaultListUuid: true },
    });
    return { connected: !!connection, defaultListUuid: connection?.defaultListUuid ?? null };
}

export async function previewConnection(credentials: BringCredentials) {
    // Fail before remote login if local persistence cannot be secured.
    encryptCredentials('configuration-check', credentials);
    return (await BringClient.login(credentials)).lists();
}

export async function connectAccount(
    userId: string,
    credentials: BringCredentials,
    defaultListUuid: string,
) {
    const encrypted = encryptCredentials(userId, credentials);
    return locked(userId, async (tx) => {
        const client = await BringClient.login(credentials);
        requireList(await client.lists(), defaultListUuid);
        await tx.bringConnection.upsert({
            where: { userId },
            create: { userId, credentials: encrypted, defaultListUuid },
            update: { credentials: encrypted, defaultListUuid },
        });
        // Receipts belong to the previous account; never replay them against a replacement.
        await tx.bringTransfer.deleteMany({ where: { userId } });
    });
}

export async function disconnectAccount(userId: string) {
    return locked(userId, async (tx) => {
        await tx.bringConnection.deleteMany({ where: { userId } });
        await tx.bringTransfer.deleteMany({ where: { userId } });
    });
}

export async function availableLists(userId: string) {
    const { client, connection } = await connected(userId);
    const lists = await client.lists();
    return {
        lists,
        defaultListUuid: lists.some((list) => list.listUuid === connection.defaultListUuid)
            ? connection.defaultListUuid
            : null,
    };
}

export async function chooseDefault(userId: string, listUuid: string) {
    return locked(userId, async (tx) => {
        const { client } = await connected(userId, tx);
        requireList(await client.lists(), listUuid);
        await tx.bringConnection.update({ where: { userId }, data: { defaultListUuid: listUuid } });
    });
}

async function localized(items: BringItems): Promise<BringItems> {
    const catalog = await loadCatalog();
    const labels = new Map(catalog.map((entry) => [entry.itemId, entry.name]));
    const decorate = (items: BringItems['purchase']) =>
        items.map((item) => ({ ...item, displayName: labels.get(item.name) ?? item.name }));
    return { purchase: decorate(items.purchase), recently: decorate(items.recently) };
}

export async function readList(userId: string, listUuid: string) {
    const { client } = await connected(userId);
    requireList(await client.lists(), listUuid);
    return localized(await client.items(listUuid));
}

export async function mutateItem(
    userId: string,
    input: {
        listUuid: string;
        operation: BringOperation;
        name: string;
        specification: string;
        previousSpecification?: string;
        restore?: boolean;
    },
) {
    return locked(userId, async (tx) => {
        const { client } = await connected(userId, tx);
        requireList(await client.lists(), input.listUuid);
        const items = await client.items(input.listUuid);
        const existing = items.purchase.find((item) => item.name === input.name);
        if (input.operation === 'add') {
            if (input.previousSpecification !== undefined) {
                if (!existing || existing.specification !== input.previousSpecification)
                    throw new BringError(
                        'CONFLICT',
                        'Der Artikel wurde inzwischen geändert. Bitte aktualisiere die Liste.',
                    );
            } else if (existing) {
                throw new BringError(
                    'CONFLICT',
                    'Dieser Artikel steht bereits auf der Liste. Du kannst seine Menge dort bearbeiten.',
                );
            }
        } else if (
            ![...items.purchase, ...items.recently].some((item) => item.name === input.name)
        ) {
            throw new BringError(
                'CONFLICT',
                'Dieser Artikel ist nicht mehr auf der Liste. Bitte aktualisiere sie.',
            );
        }
        const name =
            input.operation === 'add' && input.previousSpecification === undefined && !input.restore
                ? resolveCatalogItem(input.name, await loadCatalog())
                : input.name;
        if (name !== input.name && items.purchase.some((item) => item.name === name))
            throw new BringError('CONFLICT', 'Dieser Artikel steht bereits auf der Liste.');
        await client.write(input.listUuid, input.operation, name, input.specification);
        return localized(await client.items(input.listUuid));
    });
}

export async function transfer(
    userId: string,
    operationId: string,
    listUuid: string,
    items: TransferItem[],
): Promise<TransferOutcome[]> {
    const requestHash = createHash('sha256')
        .update(JSON.stringify({ listUuid, items }))
        .digest('hex');
    return locked(userId, async (tx) => {
        const receipt = await tx.bringTransfer.findUnique({
            where: { userId_operationId: { userId, operationId } },
        });
        if (receipt) {
            if (receipt.requestHash !== requestHash)
                throw new BringError(
                    'CONFLICT',
                    'Die Auswahl wurde geändert. Bitte starte die Übertragung erneut.',
                );
            if (receipt.status !== 'COMPLETED')
                throw new BringError(
                    'CONFLICT',
                    'Das Ergebnis dieses Vorgangs ist unklar. Bitte prüfe die Einkaufsliste, bevor du eine neue Übertragung startest.',
                );
            return receipt.result as unknown as TransferOutcome[];
        }
        const { client } = await connected(userId, tx);
        requireList(await client.lists(), listUuid);
        const catalog = await loadCatalog();
        // Independent writes intentionally survive rollback of the advisory-lock transaction.
        // Never repeat a pending operation after a process crash or an uncertain DB commit.
        await prisma.bringTransfer.create({
            data: { userId, operationId, requestHash, status: 'PENDING', result: [] },
        });
        const outcomes = await transferItems(client, listUuid, items, catalog);
        await prisma.bringTransfer.update({
            where: { userId_operationId: { userId, operationId } },
            data: { status: 'COMPLETED', result: outcomes as unknown as Prisma.InputJsonValue },
        });
        // Bounded retention: receipts only contain item labels/status, never credentials.
        await tx.bringTransfer.deleteMany({
            where: { userId, createdAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
        });
        return outcomes;
    });
}
