import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ShoppingListClient } from '@app/components/bring/ShoppingListClient';
import { PageShell } from '@app/components/layouts/PageShell';
import { getServerAuthSession } from '@app/lib/auth';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Einkaufsliste',
    robots: { index: false, follow: false },
};

export default async function ShoppingListPage() {
    const session = await getServerAuthSession('shopping-list');
    if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/shopping-list');
    return (
        <PageShell>
            <div className={css({ maxW: '800px', mx: 'auto', py: '6', px: '4' })}>
                <h1 className={css({ fontFamily: 'heading', fontSize: '3xl', mb: '5' })}>
                    Einkaufsliste
                </h1>
                <ShoppingListClient />
            </div>
        </PageShell>
    );
}
