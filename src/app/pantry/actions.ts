'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getServerAuthSession } from '@app/lib/auth';
import { DataAccessError } from '@app/lib/meal-plan/db';
import { addPantryItem, setPantryItemStatus } from '@app/lib/pantry/repository';
import { checkRateLimit } from '@app/lib/rate-limit';
import { toBaseQuantity } from '@app/lib/shopping/quantity';
import { prisma } from '@shared/prisma';

// Server actions of the pantry page (KUC-107).

export type PantryActionResult =
    | { ok: true }
    | {
          ok: false;
          code: 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'VALIDATION' | 'FAILED';
          error: string;
      };

async function run(work: (userId: string) => Promise<unknown>): Promise<PantryActionResult> {
    try {
        const session = await getServerAuthSession('pantry');
        if (!session?.user?.id || session.user.role === 'banned' || session.user.banned)
            return { ok: false, code: 'SIGN_IN', error: 'Bitte melde dich an.' };
        const limit = await checkRateLimit('shopping', session.user.id);
        if (!limit.allowed)
            return {
                ok: false,
                code: 'RATE_LIMIT',
                error: 'Zu viele Anfragen. Bitte warte einen Moment.',
            };
        await work(session.user.id);
        revalidatePath('/pantry');
        return { ok: true };
    } catch (error) {
        if (error instanceof DataAccessError)
            return {
                ok: false,
                code: error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'FAILED',
                error: error.message,
            };
        if (error instanceof z.ZodError)
            return { ok: false, code: 'VALIDATION', error: 'Bitte prüfe deine Eingaben.' };
        console.error('[Pantry] action failed', error);
        return {
            ok: false,
            code: 'FAILED',
            error: 'Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
        };
    }
}

/** "aufgebraucht" / "weggeworfen" in one tap; AVAILABLE undoes it. */
export async function setPantryStatus(
    id: string,
    status: 'AVAILABLE' | 'USED_UP' | 'DISCARDED',
): Promise<PantryActionResult> {
    return run((userId) => setPantryItemStatus(prisma, userId, id, status));
}

const manualSchema = z
    .object({
        name: z.string().trim().min(1).max(200),
        amount: z.string().trim().max(50).optional(),
        unit: z.enum(['g', 'kg', 'ml', 'l', 'Stk']).optional(),
    })
    .strict();

/** Adds something by hand; an amount with a unit is stored in the base unit. */
export async function addManualPantryItem(
    input: z.input<typeof manualSchema>,
): Promise<PantryActionResult> {
    return run((userId) => {
        const { name, amount, unit } = manualSchema.parse(input);
        const base = amount ? toBaseQuantity(amount, unit ?? null) : null;
        return addPantryItem(prisma, userId, {
            name,
            source: 'MANUAL',
            purchasedAt: new Date(),
            ...(base ? { quantity: base.quantity, baseUnit: base.baseUnit } : {}),
            ...(amount && !base ? { quantityText: [amount, unit].filter(Boolean).join(' ') } : {}),
        });
    });
}
