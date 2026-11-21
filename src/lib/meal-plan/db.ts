// Shared plumbing for the meal plan, shopping and pantry data access (KUC-98).
// Every data access function takes the Prisma client (or a transaction) as its
// first argument and the acting user's id as its second, so callers pass
// `prisma` from '@shared/prisma' and unit tests can pass a fake.
import type { Prisma, PrismaClient } from '@prisma/client';

export type Db = PrismaClient | Prisma.TransactionClient;

export type DataErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'INVALID';

/**
 * Error for the server actions to map to a user message. A foreign row is
 * reported exactly like a missing one, so ids of other users never leak.
 */
export class DataAccessError extends Error {
    constructor(
        readonly code: DataErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'DataAccessError';
    }
}

export const notFound = (what: string) =>
    new DataAccessError('NOT_FOUND', `${what} nicht gefunden`);

/** Runs `work` in a transaction, or directly when `db` already is one. */
export async function inTransaction<T>(
    db: Db,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
    if ('$transaction' in db && typeof db.$transaction === 'function')
        return (db as PrismaClient).$transaction(work);
    return work(db);
}
