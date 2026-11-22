'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { addPantryItem, setPantryItemStatus } from '@app/lib/pantry/repository';
import { createActionRunner } from '@app/lib/server-action.server';
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

const runAction = createActionRunner<'VALIDATION'>({
    scope: 'pantry',
    rateLimit: 'shopping',
    logLabel: '[Pantry] action failed',
    invalidCode: 'VALIDATION',
    failedMessage: 'Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
    after: () => revalidatePath('/pantry'),
});

async function run(work: (userId: string) => Promise<unknown>): Promise<PantryActionResult> {
    const result = await runAction(work);
    return result.ok ? { ok: true } : result;
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
