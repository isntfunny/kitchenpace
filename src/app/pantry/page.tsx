import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Heading } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';
import { listPantryItems } from '@app/lib/pantry/repository';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { PantryClient, type PantryEntry } from './PantryClient';

export const metadata: Metadata = {
    title: 'Vorrat',
    robots: { index: false, follow: false },
};

export default async function PantryPage() {
    const session = await getServerAuthSession('pantry-page');
    if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/pantry');

    const items = await listPantryItems(prisma, session.user.id, { status: 'AVAILABLE' });
    const entries: PantryEntry[] = items.map((item) => ({
        id: item.id,
        name: item.ingredient?.name ?? item.name,
        icon: item.ingredient?.icon ?? null,
        hasIngredient: !!item.ingredient,
        quantity: item.quantity,
        baseUnit: item.baseUnit,
        quantityText: item.quantityText,
        approximate: item.approximate,
        openedAt: item.openedAt,
        expiresAt: item.expiresAt,
    }));

    return (
        <PageShell>
            <div className={css({ maxW: '800px', mx: 'auto', py: '6', px: '4' })}>
                <Heading as="h1" size="xl" className={css({ mb: '2' })}>
                    Vorrat
                </Heading>
                <p className={css({ color: 'text.muted', mb: '5', fontSize: 'sm' })}>
                    Was vom Einkauf und Kochen noch da ist. „~“ heißt: die Menge ist geschätzt.
                </p>
                <PantryClient entries={entries} />
            </div>
        </PageShell>
    );
}
