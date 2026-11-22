import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Heading } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { ShoppingListView } from '@app/components/shopping/ShoppingListView';
import { getServerAuthSession } from '@app/lib/auth';
import { requestBringSync } from '@app/lib/bring/sync-trigger';
import { isoWeekdayShort } from '@app/lib/shopping/list-view';
import { loadShoppingPageData } from '@app/lib/shopping/page-data';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Einkaufsliste',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ShoppingListPage() {
    const session = await getServerAuthSession('shopping-list');
    if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/shopping-list');

    // Opening the list pulls changes made in Bring! (no wait: the page shows the current list)
    void requestBringSync(prisma, session.user.id, { onlyIfStale: true, delayMs: 0 });
    const data = await loadShoppingPageData(prisma, session.user.id);
    const openCount = data.items.filter((item) => item.status === 'OPEN').length;
    const shoppingDay = data.shoppingDay ? isoWeekdayShort(data.shoppingDay) : null;

    return (
        <PageShell>
            <div className={css({ mb: '6' })}>
                <Heading as="h1" size="xl">
                    Einkaufsliste
                </Heading>
                <p className={css({ color: 'foreground.muted', fontFamily: 'body', mt: '1' })}>
                    {openCount === 0 ? 'Alles besorgt' : `${openCount} offen`}
                    {shoppingDay ? ` · Einkauf ${shoppingDay}` : ''}
                </p>
            </div>
            <ShoppingListView initial={data} />
        </PageShell>
    );
}
